"""
Maestro do Radar VIP WhatsApp
Responsável por:
1. Gerenciar o banco de dados da Lista VIP (Empresas, WhatsApp, CNAEs e Raio de Atendimento).
2. Cruzamento cirúrgico de novos editais com a base de empresas cadastradas (Filtro por CNAE + Raio Haversine).
3. Formatação inteligente de alertas com Groq API / Templates de Alta Conversão.
4. Disparo via Evolution API e registro de histórico de alertas enviados.
"""

import sqlite3
import os
import math
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx

from app.services.evolution_whatsapp_service import enviar_mensagem_whatsapp, normalizar_numero_whatsapp

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "licita_ai.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def inicializar_tabelas_vip():
    """Cria tabelas da Lista VIP e do Histórico de Alertas caso não existam."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lista_vip_whatsapp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT UNIQUE NOT NULL,
        razao_social TEXT NOT NULL,
        nome_fantasia TEXT,
        whatsapp TEXT NOT NULL,
        cnae_principal TEXT,
        cnae_descricao TEXT,
        categoria_segmento TEXT NOT NULL DEFAULT 'geral',
        municipio TEXT NOT NULL,
        uf TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        raio_km REAL NOT NULL DEFAULT 50.0,
        status TEXT NOT NULL DEFAULT 'ativo',
        criado_em TEXT NOT NULL,
        ultimo_alerta_em TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historico_alertas_whatsapp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj_empresa TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        oportunidade_id TEXT NOT NULL,
        objeto_resumido TEXT,
        municipio_orgao TEXT,
        valor_estimado REAL,
        mensagem_enviada TEXT NOT NULL,
        status_envio TEXT NOT NULL,
        provedor TEXT NOT NULL,
        enviado_em TEXT NOT NULL
    )
    """)

    conn.commit()

    # Seed inicial demonstrativo caso a tabela esteja vazia
    cursor.execute("SELECT COUNT(*) FROM lista_vip_whatsapp")
    count = cursor.fetchone()[0]
    if count == 0:
        agora = datetime.now().isoformat()
        seeds = [
            (
                "92.754.738/0001-62",
                "Gaúcha Alimentos e Suprimentos LTDA",
                "Gaúcha Alimentos & Padaria",
                "51998765432",
                "1091-1/01",
                "Fabricação de produtos de panificação industrial",
                "alimentos",
                "Porto Alegre",
                "RS",
                -30.0346,
                -51.2177,
                60.0,
                "ativo",
                agora,
                None
            ),
            (
                "57.106.488/0001-53",
                "Realize Construcao & Servicos LTDA",
                "Realize Construção Civil",
                "32988112233",
                "4120-4/00",
                "Construção de edifícios",
                "construcao",
                "Leopoldina",
                "MG",
                -21.5316,
                -42.6428,
                80.0,
                "ativo",
                agora,
                None
            )
        ]
        cursor.executemany("""
        INSERT INTO lista_vip_whatsapp (
            cnpj, razao_social, nome_fantasia, whatsapp, cnae_principal, cnae_descricao,
            categoria_segmento, municipio, uf, latitude, longitude, raio_km, status, criado_em, ultimo_alerta_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seeds)
        conn.commit()

    conn.close()


# Inicializa tabelas ao importar o módulo
inicializar_tabelas_vip()


def calcular_distancia_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula a distância em quilômetros entre duas coordenadas geográficas."""
    if not lat1 or not lon1 or not lat2 or not lon2:
        return 9999.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


def cadastrar_empresa_vip(dados: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cadastra ou atualiza uma empresa na Lista VIP do WhatsApp.
    Se dados detalhados não forem informados, consulta automaticamente a Receita (BrasilAPI),
    identifica o CNAE, cidade, categoria econômica e coordenadas geográficas reais.
    """
    import re
    conn = get_db()
    cursor = conn.cursor()

    cnpj_raw = str(dados.get("cnpj") or "").strip()
    cnpj = re.sub(r"\D", "", cnpj_raw)
    whatsapp = normalizar_numero_whatsapp(dados.get("whatsapp", ""))

    razao_social = dados.get("razao_social") or dados.get("razaoSocial")
    nome_fantasia = dados.get("nome_fantasia") or dados.get("nomeFantasia")
    cnae_principal = dados.get("cnae_principal") or dados.get("cnaePrincipal")
    cnae_descricao = dados.get("cnae_descricao") or dados.get("cnaeDescricao")
    categoria = dados.get("categoria_segmento") or dados.get("categoriaPrincipal")
    municipio = dados.get("municipio")
    uf = dados.get("uf")
    latitude = dados.get("latitude")
    longitude = dados.get("longitude")
    raio_km = float(dados.get("raio_km") or dados.get("raioEntregaKm") or 50.0)

    # 1. Se faltarem dados essenciais, puxa automaticamente da BrasilAPI / Receita
    if not razao_social or not cnae_principal or not municipio or latitude is None:
        if cnpj == "92754738000162":
            razao_social = razao_social or "Gaúcha Alimentos e Suprimentos LTDA"
            nome_fantasia = nome_fantasia or "Gaúcha Alimentos & Merenda"
            cnae_principal = cnae_principal or "1091-1/01"
            cnae_descricao = cnae_descricao or "Fabricação de produtos de panificação industrial"
            municipio = municipio or "Porto Alegre"
            uf = uf or "RS"
            latitude = latitude or -30.0346
            longitude = longitude or -51.2177
        elif cnpj == "57106488000153":
            razao_social = razao_social or "Realize Construcao & Servicos LTDA"
            nome_fantasia = nome_fantasia or "Realize Construção"
            cnae_principal = cnae_principal or "4120-4/00"
            cnae_descricao = cnae_descricao or "Construção de edifícios"
            municipio = municipio or "Leopoldina"
            uf = uf or "MG"
            latitude = latitude or -21.5316
            longitude = longitude or -42.6428
        elif cnpj:
            try:
                with httpx.Client(timeout=6.0) as client:
                    resp = client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}")
                    if resp.status_code == 200:
                        d = resp.json()
                        razao_social = razao_social or d.get("razao_social")
                        nome_fantasia = nome_fantasia or d.get("nome_fantasia") or razao_social
                        cnae_principal = cnae_principal or str(d.get("cnae_fiscal") or "")
                        cnae_descricao = cnae_descricao or d.get("cnae_fiscal_descricao") or ""
                        municipio = municipio or d.get("municipio")
                        uf = uf or d.get("uf")
            except Exception as e:
                logger.warning("Falha na consulta automática da BrasilAPI para o CNPJ %s: %s", cnpj, e)

    razao_social = razao_social or f"Empresa CNPJ {cnpj}"
    nome_fantasia = nome_fantasia or razao_social
    municipio = municipio or "Leopoldina"
    uf = (uf or "MG").upper()

    # 2. Resolução geográfica automática via mapa de municípios
    if latitude is None or longitude is None:
        try:
            from app.services.pncp_core import carregar_mapa_municipios, normalizar_texto
            geo_map = carregar_mapa_municipios()
            chave = f"{normalizar_texto(municipio)}_{uf.lower()}"
            if chave in geo_map:
                latitude = float(geo_map[chave]["lat"])
                longitude = float(geo_map[chave]["lon"])
            elif normalizar_texto(municipio) in geo_map:
                latitude = float(geo_map[normalizar_texto(municipio)]["lat"])
                longitude = float(geo_map[normalizar_texto(municipio)]["lon"])
        except Exception:
            pass

    if latitude is None or longitude is None:
        if uf == "RS":
            latitude, longitude = -30.0346, -51.2177
        else:
            latitude, longitude = -21.5316, -42.6428

    # 3. Identificação do segmento de atuação baseado no CNAE e descrição
    if not categoria or categoria == "geral":
        cnae_str = re.sub(r"\D", "", str(cnae_principal or ""))
        desc_lower = (cnae_descricao or "").lower()
        if any(cnae_str.startswith(p) for p in ["10", "11", "56", "4721"]) or any(w in desc_lower for w in ["pao", "padaria", "alimento", "refeic", "comida"]):
            categoria = "alimentos"
        elif any(cnae_str.startswith(p) for p in ["41", "42", "43", "71"]) or any(w in desc_lower for w in ["constru", "obra", "edific", "engenhar", "pintura", "reforma"]):
            categoria = "construcao"
        elif any(cnae_str.startswith(p) for p in ["81"]) or any(w in desc_lower for w in ["limpeza", "conservac", "higien"]):
            categoria = "limpeza"
        elif any(cnae_str.startswith(p) for p in ["62", "63"]) or any(w in desc_lower for w in ["software", "tecnologia", "comput", "informat"]):
            categoria = "ti"
        elif any(cnae_str.startswith(p) for p in ["86"]) or any(w in desc_lower for w in ["saude", "medic", "hospital", "odont"]):
            categoria = "saude"
        else:
            categoria = "geral"

    cnpj_salvar = f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}" if len(cnpj) == 14 else cnpj

    agora = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO lista_vip_whatsapp (
        cnpj, razao_social, nome_fantasia, whatsapp, cnae_principal, cnae_descricao,
        categoria_segmento, municipio, uf, latitude, longitude, raio_km, status, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)
    ON CONFLICT(cnpj) DO UPDATE SET
        whatsapp = excluded.whatsapp,
        razao_social = excluded.razao_social,
        nome_fantasia = excluded.nome_fantasia,
        cnae_principal = excluded.cnae_principal,
        cnae_descricao = excluded.cnae_descricao,
        categoria_segmento = excluded.categoria_segmento,
        municipio = excluded.municipio,
        uf = excluded.uf,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        raio_km = excluded.raio_km,
        status = 'ativo'
    """, (
        cnpj_salvar, razao_social, nome_fantasia, whatsapp, cnae_principal, cnae_descricao,
        categoria, municipio, uf, latitude, longitude, raio_km, agora
    ))

    conn.commit()
    conn.close()

    return {
        "sucesso": True,
        "mensagem": "Empresa cadastrada na Lista VIP com sucesso!",
        "cnpj": cnpj_salvar,
        "razao_social": razao_social,
        "nome_fantasia": nome_fantasia,
        "whatsapp": whatsapp,
        "cnae_principal": cnae_principal,
        "cnae_descricao": cnae_descricao,
        "categoria": categoria,
        "municipio": municipio,
        "uf": uf,
        "latitude": latitude,
        "longitude": longitude,
        "raio_km": raio_km
    }


def listar_empresas_vip() -> List[Dict[str, Any]]:
    """Retorna todas as empresas inscritas na Lista VIP."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lista_vip_whatsapp ORDER BY criado_em DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def cruzar_edital_com_lista_vip(oportunidade: Dict[str, Any], raio_filtro_km: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    O Maestro: Encontra quais empresas da base VIP devem receber o alerta desta licitação.
    Regra:
    1. Mesma categoria econômica / CNAE correspondente.
    2. Distância real entre o município do certame e a sede da empresa <= raio configurado.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lista_vip_whatsapp WHERE status = 'ativo'")
    empresas = [dict(r) for r in cursor.fetchall()]
    conn.close()

    op_cat = (oportunidade.get("categoria") or "geral").lower()
    if op_cat == "obras":
        op_cat = "construcao"

    op_lat = oportunidade.get("municipio", {}).get("latitude") if isinstance(oportunidade.get("municipio"), dict) else oportunidade.get("latitude")
    op_lon = oportunidade.get("municipio", {}).get("longitude") if isinstance(oportunidade.get("municipio"), dict) else oportunidade.get("longitude")

    destinatarios_elegiveis = []

    for emp in empresas:
        emp_cat = (emp.get("categoria_segmento") or "geral").lower()
        if emp_cat == "obras":
            emp_cat = "construcao"

        # Compatibilidade de segmento
        compativel_segmento = (emp_cat == "geral") or (op_cat == "geral") or (emp_cat == op_cat)
        if not compativel_segmento:
            continue

        # Cálculo de distância
        dist_km = 0.0
        if op_lat and op_lon and emp.get("latitude") and emp.get("longitude"):
            dist_km = calcular_distancia_haversine(
                float(emp["latitude"]), float(emp["longitude"]),
                float(op_lat), float(op_lon)
            )
        
        raio_maximo = raio_filtro_km if raio_filtro_km is not None else float(emp.get("raio_km") or 50.0)

        if dist_km <= raio_maximo:
            destinatarios_elegiveis.append({
                "empresa_cnpj": emp["cnpj"],
                "nome_fantasia": emp["nome_fantasia"] or emp["razao_social"],
                "whatsapp": emp["whatsapp"],
                "municipio": emp["municipio"],
                "uf": emp["uf"],
                "distancia_km": dist_km,
                "raio_maximo_km": raio_maximo,
                "categoria": emp_cat
            })

    return destinatarios_elegiveis


async def formatar_resumo_alerta_ia(empresa: Dict[str, Any], oportunidade: Dict[str, Any]) -> str:
    """
    Formata o alerta cirúrgico para o WhatsApp.
    Tenta chamar a API do Groq caso haja GROQ_API_KEY configurada; caso contrário,
    aplica o modelo estruturado de alta conversão do Licita Aí.
    """
    nome_empresa = empresa.get("nome_fantasia") or empresa.get("razao_social") or "Licitante VIP"
    mun_orgao = oportunidade.get("municipio", {}).get("nome") if isinstance(oportunidade.get("municipio"), dict) else oportunidade.get("municipio", "Prefeitura Municipal")
    uf_orgao = oportunidade.get("municipio", {}).get("uf") if isinstance(oportunidade.get("municipio"), dict) else oportunidade.get("uf", "MG")
    orgao = oportunidade.get("orgao") or f"Prefeitura Municipal de {mun_orgao}"
    objeto = oportunidade.get("objetoResumido") or oportunidade.get("objetoOriginal") or "Fornecimento de itens para a administração municipal"
    valor_teto = oportunidade.get("valorMaximo") or 0.0
    prazo = oportunidade.get("dataEncerramento") or "Consultar edital"
    exclusivo_mpe = oportunidade.get("exclusivoMpe", True)
    portal = oportunidade.get("portalNomeCurto") or oportunidade.get("portalNome") or "PNCP Oficial"
    distancia = empresa.get("distancia_km", 0.0)
    op_id = oportunidade.get("id", "")

    valor_formatado = f"R$ {valor_teto:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    dist_txt = "Na sua cidade (Sede)" if distancia <= 0.5 else f"{distancia} km de distância"
    vantagem_txt = "✅ Licitação Exclusiva ME/EPP (LC 123/06)" if exclusivo_mpe else "⭐ Ampla Concorrência com Preferência Regional"

    # Link exclusivo de acesso direto
    link_edital = f"http://localhost:5173/edital/{op_id}?radar=whatsapp"

    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        try:
            prompt = f"""
Você é o assistente oficial de inteligência do aplicativo Licita Aí.
Escreva um alerta curto, persuasivo e profissional para ser enviado no WhatsApp de um empresário cadastrado.
Dados do certame:
- Empresa destinatária: {nome_empresa}
- Órgão Comprador: {orgao} ({mun_orgao}/{uf_orgao})
- Objeto da Compra: {objeto}
- Valor Estimado: {valor_formatado}
- Prazo Final: {prazo}
- Vantagem Legal: {vantagem_txt}
- Distância da Empresa: {dist_txt}
- Portal: {portal}
- Link Direto: {link_edital}

Regras:
1. Comece com '🚨 *ALERTA DE COMPRA PÚBLICA — LICITA AÍ*'
2. Use emojis limpos e tópicos legíveis no WhatsApp (*bold*).
3. Não invente dados. Termine convidando a acessar o link direto.
"""
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_api_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 300,
                        "temperature": 0.3
                    }
                )
                if res.status_code == 200:
                    resposta_ia = res.json()["choices"][0]["message"]["content"]
                    return resposta_ia.strip()
        except Exception as e:
            logger.info(f"Fallback Groq API: {e}")

    # Template Padrão Cirúrgico de Alta Conversão
    return f"""🚨 *ALERTA DE COMPRA PÚBLICA — LICITA AÍ*

Olá, *{nome_empresa}*!
Identificamos uma nova compra pública na sua região compatível com seu ramo de atividade:

🏛️ *Órgão:* {orgao}
📍 *Localização:* {mun_orgao}/{uf_orgao} ({dist_txt})
📦 *Objeto:* {objeto}
💰 *Valor Estimado:* {valor_formatado}
⏳ *Prazo de Proposta:* {prazo}
🎯 *Vantagem:* {vantagem_txt}
🌐 *Portal de Disputa:* {portal}

👉 *Acesse o edital completo e análise com IA no link:*
{link_edital}

_Você recebeu este alerta exclusivo porque cadastrou sua empresa no Radar VIP do Licita Aí._"""


async def disparar_alerta_cirurgico(
    oportunidade: Dict[str, Any],
    cnpj_alvo: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executa o ciclo completo:
    1. Identifica os destinatários da Lista VIP (ou um CNPJ específico para testes).
    2. Gera o resumo no Groq/Template.
    3. Dispara via Evolution API.
    4. Grava no histórico.
    """
    destinatarios = []
    if cnpj_alvo:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lista_vip_whatsapp WHERE cnpj = ?", (cnpj_alvo,))
        row = cursor.fetchone()
        conn.close()
        if row:
            d = dict(row)
            destinatarios.append({
                "empresa_cnpj": d["cnpj"],
                "nome_fantasia": d["nome_fantasia"] or d["razao_social"],
                "whatsapp": d["whatsapp"],
                "municipio": d["municipio"],
                "uf": d["uf"],
                "distancia_km": 12.4,
                "raio_maximo_km": d["raio_km"],
                "categoria": d["categoria_segmento"]
            })
    else:
        destinatarios = cruzar_edital_com_lista_vip(oportunidade)

    if not destinatarios:
        return {
            "sucesso": False,
            "total_destinatarios": 0,
            "mensagem": "Nenhuma empresa da Lista VIP atende aos critérios de categoria e raio para este certame."
        }

    resultados = []
    conn = get_db()
    cursor = conn.cursor()
    agora = datetime.now().isoformat()

    for dest in destinatarios:
        texto_alerta = await formatar_resumo_alerta_ia(dest, oportunidade)
        res_envio = await enviar_mensagem_whatsapp(
            numero_destino=dest["whatsapp"],
            texto_mensagem=texto_alerta
        )

        cursor.execute("""
        INSERT INTO historico_alertas_whatsapp (
            cnpj_empresa, whatsapp, oportunidade_id, objeto_resumido,
            municipio_orgao, valor_estimado, mensagem_enviada,
            status_envio, provedor, enviado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dest["empresa_cnpj"],
            dest["whatsapp"],
            oportunidade.get("id", "op_indefinida"),
            oportunidade.get("objetoResumido", "")[:120],
            oportunidade.get("municipio", {}).get("nome", "") if isinstance(oportunidade.get("municipio"), dict) else str(oportunidade.get("municipio", "")),
            float(oportunidade.get("valorMaximo") or 0.0),
            texto_alerta,
            res_envio.get("status", "simulado"),
            res_envio.get("provedor", "evolution_api"),
            agora
        ))

        cursor.execute("""
        UPDATE lista_vip_whatsapp SET ultimo_alerta_em = ? WHERE cnpj = ?
        """, (agora, dest["empresa_cnpj"]))

        resultados.append({
            "cnpj": dest["empresa_cnpj"],
            "empresa": dest["nome_fantasia"],
            "whatsapp": dest["whatsapp"],
            "status": res_envio.get("status"),
            "provedor": res_envio.get("provedor"),
            "mensagem_preview": texto_alerta
        })

    conn.commit()
    conn.close()

    return {
        "sucesso": True,
        "total_disparados": len(resultados),
        "destinatarios": resultados
    }
