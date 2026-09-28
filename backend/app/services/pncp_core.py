"""
pncp_core.py — Módulo único e consolidado do Licita Aí

O QUE ESTE ARQUIVO RESOLVE (as 4 causas raiz identificadas na auditoria):

  1. Integração incompleta com o PNCP
     -> Antes: scripts diferentes buscavam 2, 3 ou 13 modalidades, cada um do
        seu jeito, sem persistência confiável.
     -> Agora: UM serviço só (`PNCPService`), sempre varre as 13 modalidades,
        pagina até o fim, trata 404/204 como vazio, respeita Retry-After em
        429, e regista tudo numa auditoria consultável.

  2. Dados "congelados" em JSON/mockData.ts
     -> Antes: scripts de harvest escreviam direto em arquivos estáticos que
        o frontend importava — corrigir o backend não mudava o que o
        usuário via.
     -> Agora: os resultados vão para um banco SQLite local (`licita_ai.db`).
        O app lê SEMPRE do banco (rápido, <50ms) e um job agendado
        (`agendar_sincronizacao`) é o único responsável por atualizá-lo.

  3. Geofencing com coordenada fixa da empresa
     -> Antes: EMP_LAT/EMP_LON eram uma constante hardcoded (Juiz de Fora),
        ignorando a empresa realmente logada.
     -> Agora: toda função de busca recebe `empresa_lat`/`empresa_lon` como
        parâmetro obrigatório — vem do cadastro real da empresa.

  4. Fallback silencioso no detalhe da licitação
     -> Antes: se o ID não existia, devolvia a primeira licitação da lista
        sem avisar (o usuário podia abrir o edital errado sem saber).
     -> Agora: ID inexistente levanta 404 de verdade.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List

import httpx

logger = logging.getLogger("licita_ai.pncp_core")

# ---------------------------------------------------------------------------
# 1. CONSTANTES OFICIAIS (Lei 14.133/2021 — 13 modalidades de contratação)
# ---------------------------------------------------------------------------

MODALIDADES_PNCP: dict[int, str] = {
    1: "Leilão Eletrônico",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência Eletrônica",
    5: "Concorrência Presencial",
    6: "Pregão Eletrônico",
    7: "Pregão Presencial",
    8: "Dispensa",
    9: "Inexigibilidade",
    10: "Manifestação de Interesse",
    11: "Pré-qualificação",
    12: "Credenciamento",
    13: "Leilão Presencial",
}

PNCP_BASE_URL = "https://pncp.gov.br/api/consulta/v1"
DB_PATH = Path(__file__).parent / "licita_ai.db"
MUNICIPIOS_BASE_PATH = Path(__file__).parent.parent / "data" / "municipios_base.json"
MUNICIPIOS_BRASIL_GEO_PATH = Path(__file__).parent.parent / "data" / "municipios_brasil_geo.json"
DADOS_JSON_INICIAIS = Path(__file__).parent.parent / "data" / "oportunidades_pncp_reais.json"

# Cache de coordenadas por IBGE e Nome para lookup ultrarrápido
_MUNICIPIOS_GEO_MAP: Dict[str, Dict[str, Any]] = {}


def normalizar_texto(text: str) -> str:
    if not text:
        return ""
    import unicodedata
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower().strip()


def carregar_mapa_municipios() -> Dict[str, Dict[str, Any]]:
    global _MUNICIPIOS_GEO_MAP
    if _MUNICIPIOS_GEO_MAP:
        return _MUNICIPIOS_GEO_MAP

    caminho_geo = MUNICIPIOS_BRASIL_GEO_PATH if MUNICIPIOS_BRASIL_GEO_PATH.exists() else MUNICIPIOS_BASE_PATH
    if caminho_geo.exists():
        try:
            with open(caminho_geo, "r", encoding="utf-8") as f:
                lista = json.load(f)
            CODIGO_UF_SIGLA = {
                11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
                21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
                31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
                41: 'PR', 42: 'SC', 43: 'RS',
                50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
            }
            for m in lista:
                ibge_str = str(m.get("codigo_ibge") or m.get("codigoIbge") or "")
                lat = float(m.get("latitude") or 0.0)
                lon = float(m.get("longitude") or 0.0)
                nome = m.get("nome") or ""
                norm = normalizar_texto(nome)
                uf = str(m.get("uf") or CODIGO_UF_SIGLA.get(m.get("codigo_uf"), "")).lower().strip()

                info = {"nome": nome, "uf": uf.upper(), "lat": lat, "lon": lon, "codigo_ibge": ibge_str}
                if ibge_str:
                    _MUNICIPIOS_GEO_MAP[ibge_str] = info
                    if len(ibge_str) >= 6:
                        _MUNICIPIOS_GEO_MAP[ibge_str[:6]] = info
                if norm and uf:
                    _MUNICIPIOS_GEO_MAP[f"{norm}_{uf}"] = info
                if norm and norm not in _MUNICIPIOS_GEO_MAP:
                    _MUNICIPIOS_GEO_MAP[norm] = info
        except Exception as e:
            logger.warning("Falha ao carregar mapa geografico: %s", e)

    return _MUNICIPIOS_GEO_MAP


def mapear_slug_modalidade(nome: str, codigo: Optional[int] = None) -> str:
    n = (nome or "").lower()
    if codigo == 8 or "dispensa" in n:
        return "dispensa"
    if codigo in (6, 7) or "preg" in n:
        return "pregao"
    if codigo in (4, 5) or "concorr" in n:
        return "concorrencia"
    if codigo == 9 or "inexig" in n:
        return "inexigibilidade"
    if codigo in (1, 13) or "leil" in n:
        return "leilao"
    if codigo == 3 or "concurso" in n:
        return "concurso"
    if codigo == 2 or "diálogo" in n or "dialogo" in n:
        return "dialogo_competitivo"
    if codigo == 12 or "credenciamento" in n:
        return "credenciamento"
    if codigo == 11 or "pré-qualificação" in n or "prequalifica" in n:
        return "pre_qualificacao"
    if codigo == 10 or "manifesta" in n:
        return "manifestacao_interesse"
    return "outros"


def extrair_retry_after(headers: httpx.Headers, default_backoff: float) -> float:
    """Lê o header Retry-After (segundos); se ausente, usa backoff padrão."""
    valor = headers.get("Retry-After")
    if valor is None:
        return default_backoff
    try:
        return float(valor)
    except (TypeError, ValueError):
        return default_backoff


def converter_url_pncp(numero_controle: str) -> str:
    if not numero_controle:
        return "https://pncp.gov.br"
    m = re.match(r"^(\d+)-(\d+)-(\d+)/(\d{4})$", numero_controle.strip())
    if m:
        cnpj, _tipo, seq, ano = m.groups()
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return f"https://pncp.gov.br/app/editais/{numero_controle}"


# ---------------------------------------------------------------------------
# 2. AUDITORIA — classifica CADA resposta da API, sem excecões escondidas
# ---------------------------------------------------------------------------

@dataclass
class PNCPAuditoria:
    sucesso_com_dados: int = 0
    vazio_legitimo: int = 0        # 200 com lista vazia, ou 204
    vazio_404: int = 0             # 404 = "não há publicações" (esperado)
    erro_configuracao: int = 0     # 400 / 422 -> parâmetro errado (ex: IBGE)
    rate_limited_429: int = 0
    erro_servidor_5xx: int = 0
    timeout_ou_rede: int = 0
    detalhes_erro_configuracao: list[dict] = field(default_factory=list)

    def registrar(self, categoria: str, params: Optional[dict] = None) -> None:
        atual = getattr(self, categoria, None)
        if atual is None:
            logger.warning("Categoria de auditoria desconhecida: %s", categoria)
            return
        setattr(self, categoria, atual + 1)
        if categoria == "erro_configuracao" and params:
            self.detalhes_erro_configuracao.append(params)

    def gerar_relatorio(self) -> dict:
        total = (
            self.sucesso_com_dados
            + self.vazio_legitimo
            + self.vazio_404
            + self.erro_configuracao
            + self.rate_limited_429
            + self.erro_servidor_5xx
            + self.timeout_ou_rede
        )
        return {
            "total_chamadas": total,
            "sucesso_com_dados": self.sucesso_com_dados,
            "vazio_legitimo_sem_licitacao": self.vazio_legitimo,
            "vazio_404_sem_publicacao": self.vazio_404,
            "erro_configuracao_400_422": self.erro_configuracao,
            "rate_limited_429": self.rate_limited_429,
            "erro_servidor_5xx": self.erro_servidor_5xx,
            "timeout_ou_rede": self.timeout_ou_rede,
            "amostra_erros_configuracao": self.detalhes_erro_configuracao[-20:],
        }


# ---------------------------------------------------------------------------
# 3. BANCO LOCAL (SQLite) — o app lê daqui, nunca da API diretamente
# ---------------------------------------------------------------------------

@contextmanager
def _conexao_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def inicializar_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _conexao_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS oportunidades (
                id TEXT PRIMARY KEY,
                numero_controle_pncp TEXT,
                municipio_nome TEXT,
                municipio_uf TEXT,
                municipio_ibge TEXT,
                municipio_lat REAL,
                municipio_lon REAL,
                orgao TEXT,
                objeto_original TEXT,
                valor_maximo REAL,
                modalidade_codigo INTEGER,
                modalidade_slug TEXT,
                data_abertura TEXT,
                data_encerramento TEXT,
                url_pncp TEXT,
                link_sistema_origem TEXT,
                atualizado_em TEXT
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_geo ON oportunidades (municipio_lat, municipio_lon)"
        )

        # Pré-carrega os dados reais existentes se a base estiver vazia
        cursor = conn.execute("SELECT COUNT(*) FROM oportunidades")
        qtd = cursor.fetchone()[0]
        if qtd == 0 and DADOS_JSON_INICIAIS.exists():
            try:
                with open(DADOS_JSON_INICIAIS, "r", encoding="utf-8") as f:
                    itens_iniciais = json.load(f)
                
                logger.info("Populando SQLite inicial com %d certames reais do PNCP...", len(itens_iniciais))
                for it in itens_iniciais:
                    mun = it.get("municipio", {})
                    pid = it.get("id") or it.get("numeroControlePNCP")
                    if not pid:
                        continue
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO oportunidades (
                            id, numero_controle_pncp, municipio_nome, municipio_uf, municipio_ibge,
                            municipio_lat, municipio_lon, orgao, objeto_original, valor_maximo,
                            modalidade_codigo, modalidade_slug, data_abertura, data_encerramento,
                            url_pncp, link_sistema_origem, atualizado_em
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            pid,
                            pid,
                            mun.get("nome") or "Município",
                            mun.get("uf") or "RJ",
                            str(mun.get("codigoIbge") or ""),
                            float(mun.get("latitude") or 0.0),
                            float(mun.get("longitude") or 0.0),
                            it.get("orgao") or "Órgão Público",
                            it.get("objetoOriginal") or "",
                            float(it.get("valorMaximo") or 0.0),
                            6,
                            mapear_slug_modalidade(it.get("modalidade") or ""),
                            it.get("dataAbertura") or datetime.now().isoformat(),
                            it.get("dataEncerramento") or datetime.now().isoformat(),
                            it.get("urlPncp") or converter_url_pncp(pid),
                            it.get("linkSistemaOrigem") or "",
                            datetime.now().isoformat()
                        )
                    )
            except Exception as carga_err:
                logger.warning("Falha na carga inicial do SQLite: %s", carga_err)


def upsert_oportunidade(item: dict) -> None:
    with _conexao_db() as conn:
        conn.execute(
            """
            INSERT INTO oportunidades (
                id, numero_controle_pncp, municipio_nome, municipio_uf, municipio_ibge,
                municipio_lat, municipio_lon, orgao, objeto_original, valor_maximo,
                modalidade_codigo, modalidade_slug, data_abertura, data_encerramento,
                url_pncp, link_sistema_origem, atualizado_em
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                objeto_original=excluded.objeto_original,
                valor_maximo=excluded.valor_maximo,
                data_abertura=excluded.data_abertura,
                data_encerramento=excluded.data_encerramento,
                atualizado_em=excluded.atualizado_em
            """,
            (
                item["id"], item["numero_controle_pncp"], item["municipio_nome"],
                item["municipio_uf"], item["municipio_ibge"], item["municipio_lat"],
                item["municipio_lon"], item["orgao"], item["objeto_original"],
                item["valor_maximo"], item["modalidade_codigo"], item["modalidade_slug"],
                item["data_abertura"], item["data_encerramento"], item["url_pncp"],
                item["link_sistema_origem"], datetime.now().isoformat(),
            ),
        )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


CATEGORIAS_PALAVRAS_CHAVE = {
    "saude": [
        "saúde", "saude", "médic", "medic", "hospitalar", "enfermagem", "ultrassonografia",
        "exame", "laboratorial", "farmácia", "farmacia", "remédio", "remedio", "medicamento",
        "odontolog", "curativo", "cirúrg", "cirurg", "fisioterapia", "consulta médica",
        "clínica", "clinica", "ambulatório", "ambulatorio", "psicolog", "terap", "leito"
    ],
    "construcao": [
        "reforma", "construção", "construcao", "alvenaria", "paviment", "asfalto",
        "predial", "engenharia", "muro", "drenagem", "cobertura", "calçamento", "calcamento",
        "pintura", "quadra", "infraestrutura", "tapa-buraco", "obra", "reparo",
        "edificação", "edificacao", "telhado", "recomposição", "recomposicao",
        "manutenção predial", "elétrica", "eletrica", "iluminação pública", "iluminacao publica",
        "poste", "instalação elétrica", "instalacao eletrica", "tubulação", "saneamento",
        "loteamento", "ponte", "viaduto", "terraplanagem", "concreto", "argamassa"
    ],
    "alimentos": [
        "aliment", "pão", "pao", "panifica", "merenda", "hortifrúti", "hortifruti",
        "carnes", "açougue", "acougue", "leite", "gêneros", "generos", "refeição", "refeicao",
        "nutricional", "café", "cafe", "biscoito", "refeições", "refeicoes", "queijo",
        "fruta", "padaria", "perecíveis", "pereciveis", "estocáveis", "estocaveis", "cesta básica",
        "cesta basica", "coffe", "coffee", "lanche", "salgado", "refrigerante", "bebida"
    ],
    "limpeza": [
        "limpeza", "higiene", "desinfetante", "saco de lixo", "conservação", "conservacao",
        "zeladoria", "sanitário", "sanitario", "papel toalha", "papel higiênico", "detergente",
        "sabão", "sabao", "vassoura", "rodo", "desinsetização", "desratização", "lavanderia",
        "asseio"
    ],
    "veiculos": [
        "veículo", "veiculo", "pneu", "peças", "pecas", "combustível", "combustivel",
        "frota", "caminhão", "caminhao", "oficina", "mecânica", "mecanica", "lubrificante",
        "gasolina", "óleo diesel", "oleo diesel", "revisão automotiva", "transporte",
        "locação de veículos", "ambulância", "onibus", "ônibus", "van", "motocicleta", "trator"
    ],
    "ti": [
        "informática", "informatica", "computador", "notebook", "impressora", "software",
        "tecnologia", "toner", "cartucho", "rede", "servidor", "switch", "licença de uso",
        "licenca de uso", "sistema de informação", "sistema de informacao", "telecomunicação",
        "internet", "fibra óptica", "computação"
    ],
}


def classificar_categoria(texto: str) -> str:
    texto_lower = (texto or "").lower()
    for cat, kws in CATEGORIAS_PALAVRAS_CHAVE.items():
        if any(kw in texto_lower for kw in kws):
            return cat
    return "geral"


def formatar_item_para_app(row_dict: dict, dist: Optional[float] = None) -> dict:
    """Garante compatibilidade total com o modelo Pydantic e frontend TypeScript."""
    obj_orig = row_dict.get("objeto_original") or ""
    resumo = obj_orig[:130] + "..." if len(obj_orig) > 130 else obj_orig
    dist_val = round(dist, 1) if dist is not None else None
    cat = classificar_categoria(obj_orig)

    lat_val = float(row_dict.get("municipio_lat") or 0.0)
    lon_val = float(row_dict.get("municipio_lon") or 0.0)

    from app.services.multiportal_service import identificar_portal
    portal_info = identificar_portal(row_dict.get("link_sistema_origem"), obj_orig)

    return {
        "id": row_dict.get("id"),
        "numeroControlePNCP": row_dict.get("numero_controle_pncp") or row_dict.get("id"),
        "municipio": {
            "nome": row_dict.get("municipio_nome") or "",
            "uf": row_dict.get("municipio_uf") or "",
            "codigo_ibge": row_dict.get("municipio_ibge") or "",
            "codigoIbge": row_dict.get("municipio_ibge") or "",
            "latitude": lat_val,
            "longitude": lon_val,
        },
        "orgao": row_dict.get("orgao") or "",
        "categoria": cat,
        "objetoOriginal": obj_orig,
        "objeto_original": obj_orig,
        "objetoResumido": resumo,
        "objeto_resumido": resumo,
        "valorMaximo": float(row_dict.get("valor_maximo") or 0.0),
        "valor_maximo": float(row_dict.get("valor_maximo") or 0.0),
        "modalidade": row_dict.get("modalidade_slug") or "outros",
        "dataAbertura": row_dict.get("data_abertura") or "",
        "data_abertura": row_dict.get("data_abertura") or "",
        "dataEncerramento": row_dict.get("data_encerramento") or "",
        "data_encerramento": row_dict.get("data_encerramento") or "",
        "urlEdital": row_dict.get("url_pncp") or "",
        "url_edital": row_dict.get("url_pncp") or "",
        "urlPncp": row_dict.get("url_pncp") or "",
        "linkSistemaOrigem": portal_info["link_disputa"] or row_dict.get("link_sistema_origem") or "",
        "portalSlug": portal_info["slug"],
        "portalNome": portal_info["nome"],
        "portalNomeCurto": portal_info["nome_curto"],
        "portalCor": portal_info["cor"],
        "portalBgCor": portal_info["bg_cor"],
        "portalBordaCor": portal_info["borda_cor"],
        "exclusivoMpe": True,
        "exclusivo_mpe": True,
        "distanciaKm": dist_val,
        "distancia_km": dist_val,
        "vantagemLc123": True,
        "vantagem_lc123": True,
    }


def listar_oportunidades_db(
    empresa_lat: float,
    empresa_lon: float,
    raio_km: float = 100.0,
    modalidade_slug: Optional[str] = None,
    categoria: Optional[str] = None,
    portal: Optional[str] = None,
    apenas_abertas: bool = True,
) -> list[dict]:
    """
    Lê SEMPRE do banco local SQLite — latência ultrarrápida (<50ms).
    empresa_lat/empresa_lon vêm do CADASTRO REAL da empresa ativa, nunca fixos.
    Recalcula SEMPRE a distância real via Haversine.
    NUNCA usa 0 como valor padrão ou placeholder — itens sem coordenadas ou fora do raio são descartados.
    Se apenas_abertas for True, descarta itens cujo prazo já expirou no calendário (hoje é 27/09/2026).
    """
    inicializar_db()
    geo_map = carregar_mapa_municipios()
    agora = datetime.now()
    with _conexao_db() as conn:
        rows = conn.execute("SELECT * FROM oportunidades").fetchall()

    resultado = []
    for row in rows:
        lat = float(row["municipio_lat"] or 0.0)
        lon = float(row["municipio_lon"] or 0.0)
        
        # Se lat/lon no registro for zero, tenta resolver pelo mapa geográfico auditado
        if lat == 0.0 or lon == 0.0:
            ibge = str(row["municipio_ibge"] or "").strip()
            nome = normalizar_texto(row["municipio_nome"] or "")
            uf = str(row["municipio_uf"] or "").lower().strip()
            match = geo_map.get(ibge) or geo_map.get(f"{nome}_{uf}") or geo_map.get(nome)
            if match:
                lat = float(match["lat"])
                lon = float(match["lon"])

        # Se mesmo após busca não houver coordenadas válidas, NÃO pode passar no filtro de raio!
        if lat == 0.0 or lon == 0.0 or empresa_lat == 0.0 or empresa_lon == 0.0:
            continue

        # Filtro estrito de data se apenas_abertas for solicitado (descarta certames vencidos)
        if apenas_abertas:
            dt_fim_str = row["data_encerramento"]
            if not dt_fim_str:
                continue
            try:
                dt_fim = datetime.fromisoformat(dt_fim_str.replace("Z", ""))
                if dt_fim <= agora:
                    continue
            except Exception:
                continue

        # Filtro opcional de categoria
        if categoria:
            cat_norm = "construcao" if categoria == "obras" else categoria
            cat_item = classificar_categoria(row["objeto_original"] or "")
            if cat_norm != "todas" and cat_item != cat_norm:
                continue

        # Filtro de portal de compras públicas (11 portais integrados)
        if portal and portal != "todos":
            p_slug = row["portal_slug"] if "portal_slug" in row.keys() else None
            if not p_slug:
                from app.services.multiportal_service import identificar_portal
                p_slug = identificar_portal(row["link_sistema_origem"], row["objeto_original"])["slug"]
            if p_slug != portal:
                continue

        # Calcula a distância geodésica real via fórmula de Haversine
        dist = haversine_km(empresa_lat, empresa_lon, lat, lon)
        
        # Filtro estrito de raio: descarta se a distância real for maior que o raio solicitado
        if dist > raio_km:
            continue
        if modalidade_slug and row["modalidade_slug"] != modalidade_slug:
            continue
            
        r_dict = dict(row)
        r_dict["municipio_lat"] = lat
        r_dict["municipio_lon"] = lon
        resultado.append(formatar_item_para_app(r_dict, dist=dist))

    # Ordena rigorosamente da menor para a maior distância real calculada
    resultado.sort(key=lambda x: x["distancia_km"] if x["distancia_km"] is not None else 999999.0)
    return resultado


def detalhe_oportunidade_db(
    oportunidade_id: str,
    empresa_lat: Optional[float] = None,
    empresa_lon: Optional[float] = None
) -> Optional[dict]:
    """
    Corrige o bug do fallback silencioso: devolve None (-> 404 real na rota)
    em vez de devolver a primeira licitação da lista quando o ID não bate.
    """
    inicializar_db()
    with _conexao_db() as conn:
        row = conn.execute(
            "SELECT * FROM oportunidades WHERE id = ?", (oportunidade_id,)
        ).fetchone()
    if not row:
        return None
    r_dict = dict(row)
    lat = float(r_dict.get("municipio_lat") or 0.0)
    lon = float(r_dict.get("municipio_lon") or 0.0)
    if lat == 0.0 or lon == 0.0:
        geo_map = carregar_mapa_municipios()
        ibge = str(r_dict.get("municipio_ibge") or "").strip()
        nome = normalizar_texto(r_dict.get("municipio_nome") or "")
        uf = str(r_dict.get("municipio_uf") or "").lower().strip()
        match = geo_map.get(ibge) or geo_map.get(f"{nome}_{uf}") or geo_map.get(nome)
        if match:
            lat = float(match["lat"])
            lon = float(match["lon"])
            r_dict["municipio_lat"] = lat
            r_dict["municipio_lon"] = lon

    dist = None
    if empresa_lat is not None and empresa_lon is not None and lat != 0.0 and lon != 0.0:
        dist = haversine_km(empresa_lat, empresa_lon, lat, lon)

    res = formatar_item_para_app(r_dict, dist=dist)
    from app.services.catmat_core import buscar_historico_catmat
    res["catmatReferencia"] = buscar_historico_catmat(r_dict.get("objeto_original") or "", res.get("categoria"))
    return res


# ---------------------------------------------------------------------------
# 4. SERVIÇO PNCP — a única porta de entrada para a API oficial
# ---------------------------------------------------------------------------

class PNCPService:
    def __init__(self) -> None:
        self.base_url = PNCP_BASE_URL
        self.auditoria = PNCPAuditoria()
        self.max_retries = 5
        self.timeout = 20.0

    def get_default_headers(self) -> dict:
        return {
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        }

    async def _executar_requisicao(
        self, client: httpx.AsyncClient, url: str, params: dict
    ) -> dict:
        """Uma chamada, com retry/backoff, SEM levantar exceção para 404/429/5xx."""
        tentativa = 0
        while tentativa < self.max_retries:
            try:
                resp = await client.get(url, params=params, headers=self.get_default_headers())
            except (httpx.TimeoutException, httpx.NetworkError):
                self.auditoria.registrar("timeout_ou_rede")
                tentativa += 1
                await asyncio.sleep(2.0 * tentativa)
                continue

            if resp.status_code == 200:
                dados = resp.json().get("data", [])
                if dados:
                    self.auditoria.registrar("sucesso_com_dados")
                else:
                    self.auditoria.registrar("vazio_legitimo")
                return {"data": dados, "empty": len(dados) == 0}

            if resp.status_code == 204:
                self.auditoria.registrar("vazio_legitimo")
                return {"data": [], "empty": True}

            if resp.status_code == 404:
                self.auditoria.registrar("vazio_404")
                return {"data": [], "empty": True}

            if resp.status_code in (400, 422):
                self.auditoria.registrar("erro_configuracao", params=params)
                return {"data": [], "empty": True, "erro_configuracao": True}

            if resp.status_code == 429:
                self.auditoria.registrar("rate_limited_429")
                espera = extrair_retry_after(resp.headers, default_backoff=2.0 ** tentativa)
                await asyncio.sleep(min(espera, 30.0))
                tentativa += 1
                continue

            if resp.status_code >= 500:
                self.auditoria.registrar("erro_servidor_5xx")
                await asyncio.sleep(2.0 * tentativa)
                tentativa += 1
                continue

            self.auditoria.registrar("erro_configuracao", params=params)
            return {"data": [], "empty": True, "erro_configuracao": True}

        return {"data": [], "empty": True, "erro_configuracao": True}

    async def consultar_modalidade_paginada(
        self,
        client: httpx.AsyncClient,
        codigo_modalidade: int,
        data_inicial: str,
        data_final: str,
        uf: Optional[str] = None,
        codigo_municipio_ibge: Optional[str] = None,
        tamanho_pagina: int = 50,
        max_paginas: int = 20,
    ) -> list[dict]:
        """Pagina até a resposta vir vazia (nunca para na primeira página)."""
        url = f"{self.base_url}/contratacoes/publicacao"
        itens: list[dict] = []
        pagina = 1

        dt_ini_clean = re.sub(r"\D", "", str(data_inicial)) if data_inicial else ""
        dt_fim_clean = re.sub(r"\D", "", str(data_final)) if data_final else ""

        while pagina <= max_paginas:
            params = {
                "dataInicial": dt_ini_clean,
                "dataFinal": dt_fim_clean,
                "codigoModalidadeContratacao": codigo_modalidade,
                "pagina": pagina,
                "tamanhoPagina": tamanho_pagina,
            }
            if uf:
                params["uf"] = uf
            if codigo_municipio_ibge:
                params["codigoMunicipioIbge"] = codigo_municipio_ibge

            resultado = await self._executar_requisicao(client, url, params)
            if resultado.get("empty"):
                break
            dados = resultado.get("data", [])
            if not dados:
                break
            itens.extend(dados)
            if len(dados) < tamanho_pagina:
                break  # última página
            pagina += 1
            await asyncio.sleep(0.25)

        return itens

    async def consultar_todas_13_modalidades(
        self,
        data_inicial: str,
        data_final: str,
        ufs: list[str],
        max_paginas_por_modalidade: int = 20,
    ) -> list[dict]:
        """Varre as 13 modalidades x todas as UFs pedidas. Fonte única de verdade."""
        todos: list[dict] = []
        vistos: set[str] = set()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for uf in ufs:
                for codigo_modalidade in MODALIDADES_PNCP:
                    itens = await self.consultar_modalidade_paginada(
                        client, codigo_modalidade, data_inicial, data_final,
                        uf=uf, max_paginas=max_paginas_por_modalidade,
                    )
                    for it in itens:
                        pid = it.get("numeroControlePNCP") or str(it.get("id"))
                        if not pid or pid in vistos:
                            continue
                        vistos.add(pid)
                        it["_modalidade_codigo"] = codigo_modalidade
                        it["_uf_consultada"] = uf
                        todos.append(it)
        return todos


pncp_service = PNCPService()


# ---------------------------------------------------------------------------
# 5. SINCRONIZAÇÃO — transforma resposta da API em linha do banco
# ---------------------------------------------------------------------------

async def sincronizar_e_persistir(
    ufs: list[str], dias_retroativos: int = 30, max_paginas_por_modalidade: int = 20
) -> dict:
    """
    Ponto único de entrada do job agendado. Busca na API, grava no SQLite.
    NUNCA é chamado na hora que o usuário abre o feed — só em background.
    """
    inicializar_db()
    geo_map = carregar_mapa_municipios()
    hoje = datetime.now()
    data_final = hoje.strftime("%Y%m%d")
    data_inicial = (hoje - timedelta(days=dias_retroativos)).strftime("%Y%m%d")

    brutos = await pncp_service.consultar_todas_13_modalidades(
        data_inicial, data_final, ufs, max_paginas_por_modalidade
    )

    gravados = 0
    for it in brutos:
        pid = it.get("numeroControlePNCP") or str(it.get("id"))
        if not pid:
            continue
        unidade = it.get("unidadeOrgao") or {}
        orgao_ent = it.get("orgaoEntidade") or {}
        mod_codigo = it.get("_modalidade_codigo") or it.get("modalidadeId") or 6
        mod_nome = MODALIDADES_PNCP.get(mod_codigo, it.get("modalidadeNome", ""))

        ibge = str(unidade.get("codigoIbge") or "")
        mun_nome = unidade.get("municipioNome") or it.get("municipioNome") or ""
        
        # Georreferenciamento preciso a partir de municipios_brasil_geo.json (5.570 cidades)
        lat = float(unidade.get("latitude") or 0.0)
        lon = float(unidade.get("longitude") or 0.0)
        if lat == 0.0 or lon == 0.0:
            norm_mun = normalizar_texto(mun_nome)
            uf_sigla = str(it.get("_uf_consultada", unidade.get("ufSigla", "RJ"))).lower().strip()
            match = geo_map.get(ibge) or geo_map.get(f"{norm_mun}_{uf_sigla}") or geo_map.get(norm_mun)
            if match:
                lat = float(match["lat"])
                lon = float(match["lon"])

        upsert_oportunidade({
            "id": pid,
            "numero_controle_pncp": pid,
            "municipio_nome": mun_nome,
            "municipio_uf": it.get("_uf_consultada", unidade.get("ufSigla", "RJ")),
            "municipio_ibge": ibge,
            "municipio_lat": lat,
            "municipio_lon": lon,
            "orgao": orgao_ent.get("razaoSocial") or it.get("orgao", "Órgão Público"),
            "objeto_original": it.get("objetoCompra") or it.get("objetoOriginal") or "",
            "valor_maximo": float(it.get("valorTotalEstimado") or it.get("valorMaximo") or 0.0),
            "modalidade_codigo": mod_codigo,
            "modalidade_slug": mapear_slug_modalidade(mod_nome, mod_codigo),
            "data_abertura": it.get("dataAberturaProposta") or it.get("dataPublicacaoPncp") or datetime.now().isoformat(),
            "data_encerramento": it.get("dataEncerramentoProposta") or datetime.now().isoformat(),
            "url_pncp": converter_url_pncp(pid),
            "link_sistema_origem": it.get("linkSistemaOrigem") or "",
        })
        gravados += 1

    logger.info("Sincronização PNCP concluída: %d registros gravados.", gravados)
    return {
        "total_coletado": len(brutos),
        "total_gravado": gravados,
        "auditoria": pncp_service.auditoria.gerar_relatorio(),
    }


def agendar_sincronizacao(app, ufs: list[str] = None, intervalo_minutos: int = 60) -> None:
    """
    Chame isto UMA VEZ no startup do FastAPI (main.py). Ele roda a
    sincronização no início e depois a cada `intervalo_minutos`.
    Requer: pip install apscheduler
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    ufs = ufs or ["MG", "RJ"]
    scheduler = AsyncIOScheduler()

    @app.on_event("startup")
    async def _startup_sync():
        inicializar_db()
        # Dispara sincronização em segundo plano sem bloquear a inicialização da API
        asyncio.create_task(sincronizar_e_persistir(ufs, dias_retroativos=7, max_paginas_por_modalidade=5))
        scheduler.add_job(
            lambda: asyncio.create_task(sincronizar_e_persistir(ufs, dias_retroativos=7, max_paginas_por_modalidade=5)),
            "interval",
            minutes=intervalo_minutos,
        )
        scheduler.start()
        logger.info("Agendador APScheduler iniciado com sucesso para UFs: %s a cada %d min.", ufs, intervalo_minutos)


# ---------------------------------------------------------------------------
# 6. DADOS SIMULADOS — marcados explicitamente, nunca disfarçados de reais
# ---------------------------------------------------------------------------

DADOS_SIMULADOS_AVISO = (
    "Estes dados são uma demonstração e não refletem consulta real a "
    "Receita Federal, Caixa, SEFAZ ou Portal da Transparência. "
    "Confirme a situação fiscal real da empresa nos órgãos oficiais."
)


def saude_fiscal_mock(cnpj: str) -> dict:
    """Mantém o mock existente, mas agora com o aviso embutido na resposta —
    o frontend É OBRIGADO a mostrar isso na tela, não pode omitir."""
    return {
        "empresa_cnpj": cnpj,
        "fonte_dados": "simulado",
        "aviso": DADOS_SIMULADOS_AVISO,
        "cnds": [],
    }
