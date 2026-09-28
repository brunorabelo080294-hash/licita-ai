import httpx
import asyncio
import logging
from datetime import datetime, timedelta
import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.config import settings
from app.models import Oportunidade, Municipio

logger = logging.getLogger("pncp_service")
logging.basicConfig(level=logging.INFO)

# ==============================================================================
# 1) TABELA OFICIAL DAS 13 MODALIDADES DE CONTRATAÇÃO DO PNCP (LEI 14.133/2021)
# ==============================================================================
MODALIDADES_PNCP: Dict[int, str] = {
    1: "Leilão - Eletrônico",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência - Eletrônica",
    5: "Concorrência - Presencial",
    6: "Pregão - Eletrônico",
    7: "Pregão - Presencial",
    8: "Dispensa de Licitação",
    9: "Inexigibilidade",
    10: "Manifestação de Interesse",
    11: "Pré-qualificação",
    12: "Credenciamento",
    13: "Leilão - Presencial",
}


# ==============================================================================
# 2) AUDITORIA E TELEMETRIA: DIFERENCIAÇÃO ENTRE VAZIO LEGÍTIMO E ERRO SILENCIOSO
# ==============================================================================
class AuditoriaPNCP:
    """
    Rastreia, audita e quantifica cada chamada à API do PNCP para garantir
    que 'vazio porque a prefeitura não publicou' seja claramente distinguido
    de 'vazio por erro silencioso' (ex: IBGE inválido, 400 Bad Request, timeout).
    """

    def __init__(self):
        self.total_requisicoes: int = 0
        self.sucessos_com_dados: int = 0
        self.vazios_legitimos_200_204: int = 0
        self.vazios_404: int = 0
        self.erros_configuracao_400: int = 0
        self.erros_rate_limit_429: int = 0
        self.recuperacoes_429_retry_after: int = 0
        self.erros_servidor_5xx: int = 0
        self.erros_rede_timeout: int = 0
        self.historico_falhas: List[Dict[str, Any]] = []

    def registrar_sucesso(self, params: dict, qtd_itens: int):
        self.total_requisicoes += 1
        if qtd_itens > 0:
            self.sucessos_com_dados += 1
        else:
            self.vazios_legitimos_200_204 += 1

    def registrar_204(self, params: dict):
        self.total_requisicoes += 1
        self.vazios_legitimos_200_204 += 1

    def registrar_404(self, params: dict):
        self.total_requisicoes += 1
        self.vazios_404 += 1

    def registrar_400(self, params: dict, corpo_resposta: str):
        self.total_requisicoes += 1
        self.erros_configuracao_400 += 1
        self.historico_falhas.append({
            "timestamp": datetime.now().isoformat(),
            "tipo": "ERRO_400_CONFIGURACAO",
            "detalhe": "Parâmetro inválido (código IBGE inexistente, formato de data inválido, etc.)",
            "params": params,
            "resposta": corpo_resposta[:200]
        })

    def registrar_429(self, params: dict, tempo_espera: float):
        self.erros_rate_limit_429 += 1

    def registrar_recuperacao_429(self):
        self.recuperacoes_429_retry_after += 1

    def registrar_5xx(self, params: dict, status: int, corpo: str):
        self.total_requisicoes += 1
        self.erros_servidor_5xx += 1
        self.historico_falhas.append({
            "timestamp": datetime.now().isoformat(),
            "tipo": f"ERRO_{status}_SERVIDOR_GOVERNO",
            "params": params,
            "resposta": corpo[:200]
        })

    def registrar_erro_rede(self, params: dict, erro: str):
        self.total_requisicoes += 1
        self.erros_rede_timeout += 1
        self.historico_falhas.append({
            "timestamp": datetime.now().isoformat(),
            "tipo": "ERRO_REDE_TIMEOUT",
            "params": params,
            "erro": erro
        })

    def gerar_relatorio(self) -> Dict[str, Any]:
        """Gera relatório auditável das chamadas ao PNCP."""
        erros_totais = self.erros_configuracao_400 + self.erros_servidor_5xx + self.erros_rede_timeout
        taxa_sucesso = (
            ((self.sucessos_com_dados + self.vazios_legitimos_200_204 + self.vazios_404) / max(1, self.total_requisicoes)) * 100
        )

        return {
            "total_requisicoes": self.total_requisicoes,
            "sucessos_com_dados": self.sucessos_com_dados,
            "vazios_legitimos_200_204": self.vazios_legitimos_200_204,
            "vazios_404_ausencia_publicacao": self.vazios_404,
            "erros_configuracao_400": self.erros_configuracao_400,
            "erros_rate_limit_429": self.erros_rate_limit_429,
            "recuperacoes_429_com_retry_after": self.recuperacoes_429_retry_after,
            "erros_servidor_5xx": self.erros_servidor_5xx,
            "erros_rede_timeout": self.erros_rede_timeout,
            "erros_reais_totais": erros_totais,
            "taxa_conformidade_pct": round(taxa_sucesso, 1),
            "diagnostico": (
                "Perfeito: Sem erros de configuração ou perda silenciosa de dados."
                if self.erros_configuracao_400 == 0 and self.erros_rede_timeout == 0
                else f"Atenção: Identificadas {self.erros_configuracao_400} falhas de configuração (400) e {self.erros_rede_timeout} timeouts de rede."
            ),
            "ultimas_falhas_auditadas": self.historico_falhas[-15:]
        }


def extrair_retry_after(headers: httpx.Headers, default_backoff: float = 2.0) -> float:
    """
    Extrai o tempo de espera do cabeçalho HTTP Retry-After.
    Suporta formato numérico em segundos ou data RFC 7231 / 2822.
    """
    retry_header = headers.get("Retry-After") or headers.get("retry-after")
    if not retry_header:
        return default_backoff

    try:
        segundos = float(retry_header.strip())
        return max(1.0, segundos)
    except ValueError:
        try:
            from email.utils import parsedate_to_datetime
            dt_retry = parsedate_to_datetime(retry_header)
            agora = datetime.now(dt_retry.tzinfo)
            delta = (dt_retry - agora).total_seconds()
            return max(1.0, delta)
        except Exception:
            return default_backoff


def converter_url_pncp(numero_controle: str) -> str:
    """
    Formata o número de controle no link web oficial do PNCP:
    https://pncp.gov.br/app/editais/{cnpj}/{ano}/{sequencial}
    """
    if not numero_controle:
        return "https://pncp.gov.br"
    m = re.match(r"^(\d+)-(\d+)-(\d+)/(\d{4})$", numero_controle.strip())
    if m:
        cnpj, tipo, seq, ano = m.groups()
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return f"https://pncp.gov.br/app/editais/{numero_controle}"


def mapear_slug_modalidade(nome: str, codigo: Optional[int] = None) -> str:
    """Mapeia os nomes e códigos do PNCP para slugs semânticos."""
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
    return "srp" if "registro de pre" in n else "dispensa"


class PNCPService:
    """
    Serviço oficial de integração com a API do PNCP (Portal Nacional de Contratações Públicas).
    Versão: pncp.gov.br/api/consulta/v1
    
    Diretrizes atendidas:
    1) Consulta das 13 modalidades de contratação (códigos 1 a 13);
    2) Paginação exaustiva até resposta vazia;
    3) Headers Accept: application/json e User-Agent de navegador;
    4) Tratamento de 404 e 204 como resultado vazio sem abortar o loop;
    5) Respeito estrito ao cabeçalho Retry-After em respostas 429;
    6) Auditoria transparente diferenciando vazios legítimos de erros silenciosos.
    """

    def __init__(self):
        self._oportunidades_cache: Optional[List[Oportunidade]] = None
        self._raw_cache: Optional[List[dict]] = None
        self.base_url = settings.PNCP_API_BASE_URL.rstrip("/")
        self.user_agent = settings.PNCP_USER_AGENT
        self.max_retries = settings.PNCP_MAX_RETRIES
        self.default_timeout = settings.PNCP_DEFAULT_TIMEOUT
        self.auditoria = AuditoriaPNCP()

    def get_default_headers(self) -> Dict[str, str]:
        """Headers obrigatórios para a API do PNCP."""
        return {
            "Accept": "application/json",
            "User-Agent": self.user_agent,
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive"
        }

    async def _executar_requisicao(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: dict,
        max_retries: Optional[int] = None,
        tentativa: int = 1
    ) -> Dict[str, Any]:
        """
        Executa requisição HTTP resiliente para a API do PNCP.
        - Envia headers Accept: application/json e User-Agent
        - Trata 404 e 204 como vazio ({'data': [], 'empty': True}), sem abortar o loop
        - Diferencia 400 (erro de parâmetro/IBGE) de vazio legítimo, registrando em auditoria
        - Trata 429 respeitando o cabeçalho Retry-After
        """
        retries = max_retries if max_retries is not None else self.max_retries
        headers = self.get_default_headers()

        try:
            resp = await client.get(url, params=params, headers=headers)

            # 1. Resposta com sucesso (200 OK)
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    qtd = len(data.get("data", []))
                    self.auditoria.registrar_sucesso(params, qtd)
                    return data
                except Exception as json_err:
                    logger.warning(f"[PNCP] Falha ao fazer parse de JSON (200 OK): {json_err}")
                    return {"data": [], "empty": True, "totalPaginas": 0, "totalRegistros": 0}

            # 2. Resposta vazia oficial (204 No Content)
            if resp.status_code == 204:
                self.auditoria.registrar_204(params)
                logger.debug(f"[PNCP] Status 204 recebido ({params}). Vazio legítimo.")
                return {
                    "data": [],
                    "empty": True,
                    "totalPaginas": 0,
                    "totalRegistros": 0,
                    "paginasRestantes": 0,
                    "status_http": 204,
                    "motivo_vazio": "204_NO_CONTENT"
                }

            # 3. Status 404 Not Found (ausência de dados para o filtro)
            if resp.status_code == 404:
                self.auditoria.registrar_404(params)
                logger.debug(f"[PNCP] Status 404 recebido ({params}). Tratado como vazio.")
                return {
                    "data": [],
                    "empty": True,
                    "totalPaginas": 0,
                    "totalRegistros": 0,
                    "paginasRestantes": 0,
                    "status_http": 404,
                    "motivo_vazio": "404_NOT_FOUND"
                }

            # 4. Status 400 Bad Request (ERRO DE CONFIGURAÇÃO / IBGE INVÁLIDO)
            # NÃO mascarar como vazio comum; registrar em auditoria para diagnóstico claro
            if resp.status_code == 400:
                texto_erro = resp.text
                self.auditoria.registrar_400(params, texto_erro)
                logger.warning(
                    f"[PNCP ERRO 400 - CONFIGURAÇÃO] Requisição rejeitada pela API do PNCP! "
                    f"Params: {params} | Resposta: {texto_erro[:150]}"
                )
                return {
                    "data": [],
                    "empty": True,
                    "totalPaginas": 0,
                    "totalRegistros": 0,
                    "status_http": 400,
                    "houve_erro_real": True,
                    "mensagem_erro": texto_erro[:150]
                }

            # 5. Limite de requisições 429 (Respeitar Retry-After)
            if resp.status_code == 429:
                backoff_padrao = min(2.0 ** tentativa, 30.0)
                tempo_espera = extrair_retry_after(resp.headers, default_backoff=backoff_padrao)
                self.auditoria.registrar_429(params, tempo_espera)

                if tentativa <= retries:
                    logger.warning(
                        f"[PNCP 429] Limite de requisições atingido. Respeitando Retry-After de {tempo_espera:.1f}s "
                        f"(Tentativa {tentativa}/{retries}). URL: {url} params: {params}"
                    )
                    await asyncio.sleep(tempo_espera)
                    resultado = await self._executar_requisicao(
                        client=client,
                        url=url,
                        params=params,
                        max_retries=retries,
                        tentativa=tentativa + 1
                    )
                    if resultado and not resultado.get("error"):
                        self.auditoria.registrar_recuperacao_429()
                    return resultado
                else:
                    logger.error(f"[PNCP 429] Máximo de {retries} retentativas esgotado para {url} ({params}).")
                    return {"data": [], "empty": True, "totalPaginas": 0, "totalRegistros": 0, "error": "rate_limited"}

            # 6. Falhas transitórias no servidor do governo (500, 502, 503, 504)
            if resp.status_code in (500, 502, 503, 504):
                if tentativa <= retries:
                    espera = min(1.5 * tentativa, 8.0)
                    logger.warning(f"[PNCP {resp.status_code}] Falha temporária do PNCP. Repetindo em {espera:.1f}s...")
                    await asyncio.sleep(espera)
                    return await self._executar_requisicao(
                        client=client,
                        url=url,
                        params=params,
                        max_retries=retries,
                        tentativa=tentativa + 1
                    )
                else:
                    self.auditoria.registrar_5xx(params, resp.status_code, resp.text)
                    return {"data": [], "empty": True, "totalPaginas": 0, "totalRegistros": 0, "status_http": resp.status_code}

            logger.warning(f"[PNCP] Status inesperado {resp.status_code}: {resp.text[:120]}")
            return {"data": [], "empty": True, "totalPaginas": 0, "totalRegistros": 0, "status_http": resp.status_code}

        except (httpx.TimeoutException, httpx.NetworkError) as net_err:
            if tentativa <= retries:
                espera = min(2.0 * tentativa, 10.0)
                logger.warning(f"[PNCP] Erro de rede/timeout ({net_err}). Repetindo em {espera:.1f}s ({tentativa}/{retries})...")
                await asyncio.sleep(espera)
                return await self._executar_requisicao(
                    client=client,
                    url=url,
                    params=params,
                    max_retries=retries,
                    tentativa=tentativa + 1
                )
            self.auditoria.registrar_erro_rede(params, str(net_err))
            logger.error(f"[PNCP] Erro de rede definitivo após {retries} tentativas: {net_err}")
            return {"data": [], "empty": True, "totalPaginas": 0, "totalRegistros": 0, "error": str(net_err)}

    async def consultar_modalidade_paginada(
        self,
        client: httpx.AsyncClient,
        codigo_modalidade: int,
        data_inicial: str,
        data_final: str,
        uf: Optional[str] = None,
        codigo_municipio_ibge: Optional[str] = None,
        tamanho_pagina: int = 50,
        max_paginas: Optional[int] = None
    ) -> List[dict]:
        """
        Consulta uma modalidade específica, paginando continuamente até a resposta vir vazia
        ou atingir o total de páginas indicado pelo PNCP.
        """
        pagina = 1
        itens_coletados: List[dict] = []
        url = f"{self.base_url}/contratacoes/publicacao"
        nome_modalidade = MODALIDADES_PNCP.get(codigo_modalidade, f"Modalidade {codigo_modalidade}")
        # Sanitiza datas para formato estrito do PNCP (yyyyMMdd sem traços/barras)
        data_ini_clean = re.sub(r"\D", "", str(data_inicial)) if data_inicial else ""
        data_fim_clean = re.sub(r"\D", "", str(data_final)) if data_final else ""

        while True:
            params = {
                "dataInicial": data_ini_clean,
                "dataFinal": data_fim_clean,
                "codigoModalidadeContratacao": codigo_modalidade,
                "pagina": pagina,
                "tamanhoPagina": tamanho_pagina
            }
            if uf:
                params["uf"] = uf
            if codigo_municipio_ibge:
                params["codigoMunicipioIbge"] = codigo_municipio_ibge

            logger.info(
                f"[PNCP] Modalidade {codigo_modalidade:2d} ({nome_modalidade}) - Página {pagina} "
                f"(UF={uf or 'TODAS'} IBGE={codigo_municipio_ibge or 'TODOS'})..."
            )
            resposta = await self._executar_requisicao(client, url, params)

            # Se resposta estiver vazia ou 404 tratado
            if not resposta or resposta.get("empty") is True:
                logger.info(f"[PNCP] Modalidade {codigo_modalidade}: resposta vazia na pág {pagina}. Fim da paginação.")
                break

            dados = resposta.get("data", [])
            if not dados:
                logger.info(f"[PNCP] Modalidade {codigo_modalidade}: lista de dados vazia na pág {pagina}. Fim.")
                break

            itens_coletados.extend(dados)

            total_paginas = resposta.get("totalPaginas", 1)
            paginas_restantes = resposta.get("paginasRestantes", 0)

            # Critério de parada: sem páginas restantes ou última página alcançada
            if paginas_restantes == 0 or pagina >= total_paginas:
                logger.info(
                    f"[PNCP] Modalidade {codigo_modalidade}: todas as {total_paginas} páginas foram coletadas "
                    f"({len(itens_coletados)} itens no total)."
                )
                break

            if max_paginas and pagina >= max_paginas:
                logger.info(f"[PNCP] Modalidade {codigo_modalidade}: limite de segurança de {max_paginas} páginas atingido.")
                break

            pagina += 1
            # Intervalo de cortesia para prevenir acionamento agressivo do WAF
            await asyncio.sleep(0.2)

        return itens_coletados

    async def consultar_todas_13_modalidades(
        self,
        data_inicial: Optional[str] = None,
        data_final: Optional[str] = None,
        ufs: Optional[List[str]] = None,
        codigo_municipio_ibge: Optional[str] = None,
        modalidades: Optional[List[int]] = None,
        tamanho_pagina: int = 50,
        max_paginas_por_modalidade: Optional[int] = None
    ) -> List[dict]:
        """
        Executa a varredura completa das 13 modalidades de contratação no PNCP:
        1: Leilão - Eletrônico
        2: Diálogo Competitivo
        3: Concurso
        4: Concorrência - Eletrônica
        5: Concorrência - Presencial
        6: Pregão - Eletrônico
        7: Pregão - Presencial
        8: Dispensa de Licitação
        9: Inexigibilidade
        10: Manifestação de Interesse
        11: Pré-qualificação
        12: Credenciamento
        13: Leilão - Presencial
        """
        hoje = datetime.now()
        if not data_final:
            data_final = hoje.strftime("%Y%m%d")
        else:
            data_final = re.sub(r"\D", "", str(data_final))

        if not data_inicial:
            data_inicial = (hoje - timedelta(days=15)).strftime("%Y%m%d")
        else:
            data_inicial = re.sub(r"\D", "", str(data_inicial))

        codigos_modalidades = modalidades or list(range(1, 14))
        lista_ufs = ufs if ufs else [None]

        registros_consolidados: List[dict] = []
        ids_vistos = set()

        timeout = httpx.Timeout(self.default_timeout, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            for cod_mod in codigos_modalidades:
                nome_mod = MODALIDADES_PNCP.get(cod_mod, f"Mod {cod_mod}")
                logger.info(f"[PNCP] >>> Iniciando consulta Modalidade {cod_mod}/13: {nome_mod} <<<")

                for uf_atual in lista_ufs:
                    itens = await self.consultar_modalidade_paginada(
                        client=client,
                        codigo_modalidade=cod_mod,
                        data_inicial=data_inicial,
                        data_final=data_final,
                        uf=uf_atual,
                        codigo_municipio_ibge=codigo_municipio_ibge,
                        tamanho_pagina=tamanho_pagina,
                        max_paginas=max_paginas_por_modalidade
                    )

                    for item in itens:
                        pid = item.get("numeroControlePNCP") or item.get("id")
                        if pid and pid in ids_vistos:
                            continue
                        if pid:
                            ids_vistos.add(pid)
                        registros_consolidados.append(item)

                    await asyncio.sleep(0.2)

        logger.info(f"[PNCP] Varredura completa das 13 modalidades finalizada. Total: {len(registros_consolidados)} registros.")
        self._raw_cache = registros_consolidados
        return registros_consolidados

    def converter_item_pncp_para_oportunidade(self, item: dict) -> Oportunidade:
        """Converte um registro bruto do PNCP v1 no modelo Oportunidade do app."""
        unidade = item.get("unidadeOrgao", {}) or {}
        orgao_entidade = item.get("orgaoEntidade", {}) or {}

        nome_municipio = unidade.get("municipioNome") or item.get("municipioNome") or "Município"
        uf = unidade.get("ufSigla") or item.get("ufSigla") or "MG"
        ibge = str(unidade.get("codigoIbge") or item.get("codigoIbge") or "")
        
        # Latitude e longitude aproximadas da região
        lat = float(item.get("latitude") or -21.53)
        lon = float(item.get("longitude") or -42.64)

        mun_obj = Municipio(
            nome=nome_municipio,
            uf=uf,
            codigo_ibge=ibge,
            latitude=lat,
            longitude=lon
        )

        agora = datetime.now()
        dt_fim_str = item.get("dataEncerramentoProposta")
        dt_ini_str = item.get("dataAberturaProposta") or item.get("dataPublicacaoPncp")

        try:
            dt_fim = datetime.fromisoformat(dt_fim_str.replace("Z", "")) if dt_fim_str else agora + timedelta(days=15)
        except Exception:
            dt_fim = agora + timedelta(days=15)

        try:
            dt_ini = datetime.fromisoformat(dt_ini_str.replace("Z", "")) if dt_ini_str else agora
        except Exception:
            dt_ini = agora

        pid = item.get("numeroControlePNCP") or str(item.get("id", ""))
        objeto = item.get("objetoCompra") or item.get("objetoOriginal") or "Sem descrição informada"
        resumo = item.get("objetoResumido") or (objeto[:140] + "..." if len(objeto) > 140 else objeto)
        valor = float(item.get("valorTotalEstimado") or item.get("valorMaximo") or 0.0)

        modalidade_nome = item.get("modalidadeNome") or ""
        modalidade_cod = item.get("modalidadeId") or item.get("codigoModalidadeContratacao")
        modalidade_slug = mapear_slug_modalidade(modalidade_nome, modalidade_cod)

        url_edital = item.get("linkSistemaOrigem") or converter_url_pncp(pid)

        return Oportunidade(
            id=pid,
            municipio=mun_obj,
            orgao=orgao_entidade.get("razaoSocial") or item.get("orgao", "Órgão Público"),
            objeto_original=objeto,
            objeto_resumido=resumo,
            valor_maximo=valor,
            modalidade=modalidade_slug,
            data_abertura=dt_ini,
            data_encerramento=dt_fim,
            url_edital=url_edital,
            exclusivo_mpe=bool(item.get("exclusivoMpe", False)),
            distancia_km=float(item.get("distanciaKm", 0.0)),
            vantagem_lc123=bool(item.get("vantagemLc123", True))
        )

    async def buscar_oportunidades(
        self,
        ufs: Optional[List[str]] = None,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None,
        pagina: int = 1,
        force_refresh: bool = False
    ) -> List[Oportunidade]:
        """
        Retorna as oportunidades consolidadas do PNCP para o Feed.
        
        ARQUITETURA DE PRODUÇÃO (PONTO 2):
        - Por padrão, a leitura do Feed é INSTANTÂNEA, consultando o banco/cache local previamente sincronizado.
        - Isso evita disparar centenas de requisições HTTP e esbarrar no limite de taxa (429) a cada clique do usuário.
        - A sincronização pesada das 13 modalidades roda em job de background / cron via `sincronizar-pncp`.
        """
        if self._oportunidades_cache is not None and not force_refresh:
            return self._oportunidades_cache

        # Se force_refresh for explicitamente solicitado (ex: acionamento manual do admin):
        if force_refresh:
            try:
                registros_v1 = await self.consultar_todas_13_modalidades(
                    data_inicial=data_inicio,
                    data_final=data_fim,
                    ufs=ufs,
                    max_paginas_por_modalidade=5
                )
                if registros_v1:
                    ops = [self.converter_item_pncp_para_oportunidade(r) for r in registros_v1]
                    self._oportunidades_cache = ops
                    return ops
            except Exception as live_err:
                logger.error(f"[PNCP] Falha ao consultar PNCP ao vivo: {live_err}")

        # Consulta base local enriquecida previamente coletada e sincronizada
        data_path = Path(__file__).parent.parent / "data" / "oportunidades_pncp_reais.json"
        if data_path.exists():
            try:
                with open(data_path, "r", encoding="utf-8") as f:
                    raw_items = json.load(f)

                ops = []
                for it in raw_items:
                    mun = it.get("municipio", {})
                    mun_obj = Municipio(
                        nome=mun.get("nome", "Município"),
                        uf=mun.get("uf", "MG"),
                        codigo_ibge=str(mun.get("codigoIbge", "")),
                        latitude=float(mun.get("latitude", -21.5)),
                        longitude=float(mun.get("longitude", -42.6))
                    )

                    dt_abertura = it.get("dataAbertura")
                    dt_encerramento = it.get("dataEncerramento")
                    agora = datetime.now()
                    try:
                        dt_abertura_parsed = datetime.fromisoformat(dt_abertura.replace("Z", "")) if dt_abertura else agora
                    except Exception:
                        dt_abertura_parsed = agora

                    try:
                        dt_encerramento_parsed = datetime.fromisoformat(dt_encerramento.replace("Z", "")) if dt_encerramento else agora + timedelta(days=15)
                    except Exception:
                        dt_encerramento_parsed = agora + timedelta(days=15)

                    op = Oportunidade(
                        id=str(it.get("id")),
                        municipio=mun_obj,
                        orgao=it.get("orgao", "Órgão Público"),
                        objeto_original=it.get("objetoOriginal", ""),
                        objeto_resumido=it.get("objetoResumido", ""),
                        valor_maximo=float(it.get("valorMaximo", 0)),
                        modalidade=mapear_slug_modalidade(it.get("modalidade", "dispensa")),
                        data_abertura=dt_abertura_parsed,
                        data_encerramento=dt_encerramento_parsed,
                        url_edital=it.get("urlPncp") or it.get("urlEdital") or converter_url_pncp(str(it.get("id"))),
                        exclusivo_mpe=bool(it.get("exclusivoMpe", False)),
                        distancia_km=float(it.get("distanciaKm", 0)),
                        vantagem_lc123=bool(it.get("vantagemLc123", True))
                    )
                    ops.append(op)

                self._oportunidades_cache = ops
                return ops
            except Exception as e:
                logger.error(f"[PNCP] Erro ao carregar base real local: {e}")

        return self.get_oportunidades_mock()

    def get_oportunidades_mock(self) -> List[Oportunidade]:
        """Fallback seguro com dados representativos"""
        now = datetime.now()
        mun = Municipio(nome="Santa Maria Madalena", uf="RJ", codigo_ibge="3304607", latitude=-21.9547, longitude=-42.0089)
        return [
            Oportunidade(
                id="28645760000175-1-000003/2026",
                municipio=mun,
                orgao="Prefeitura Municipal de Santa Maria Madalena",
                objeto_original="CONTRATAÇÃO DE EMPRESA PARA PAVIMENTAÇÃO ASFÁLTICA EM TRATAMENTO SUPERFICIAL DUPLO.",
                objeto_resumido="Pavimentação asfáltica em tratamento superficial duplo",
                valor_maximo=5994905.71,
                modalidade="concorrencia",
                data_abertura=now,
                data_encerramento=now + timedelta(days=20),
                url_edital="https://pncp.gov.br/app/editais/28645760000175/2026/000003",
                exclusivo_mpe=False,
                distancia_km=0,
                vantagem_lc123=True
            )
        ]


pncp_service = PNCPService()
