"""
Serviço de Integração e Normalização Multiportal — Licita Aí
Varre, detecta e centraliza as oportunidades dos 11 principais portais de compras do Brasil:
1. Compras.gov.br (Comprasnet / Governo Federal)
2. Portal de Compras Públicas (Prefeituras e Consórcios de MG, RJ, RS, etc.)
3. BLL Compras (Bolsa de Licitações e Leilões — muito usado no interior de MG/PR/SC/RS)
4. BNC (Bolsa Nacional de Compras — câmaras municipais e pequenas prefeituras)
5. Licitações-e (Banco do Brasil)
6. Licitanet (Forte no interior de MG e RJ)
7. BBMNet Licitações (Bolsa Brasileira de Mercadorias)
8. AMM Licita (Associação Mineira de Municípios / IPM)
9. Banrisul Compras (Prefeituras do Rio Grande do Sul)
10. BEC/SP (Bolsa Eletrônica de Compras de São Paulo)
11. PNCP Central (Portal Nacional de Contratações Públicas)
"""

import re
import sqlite3
from typing import Dict, Any, List, Optional
from pathlib import Path

DB_PATH = Path(__file__).parent / "licita_ai.db"

PORTAIS_CONFIG: Dict[str, Dict[str, Any]] = {
    "comprasnet": {
        "slug": "comprasnet",
        "nome": "Compras.gov.br (Comprasnet)",
        "nome_curto": "Compras.gov.br",
        "cor": "#003399",
        "bg_cor": "#EBF2FF",
        "borda_cor": "#B3D1FF",
        "url_base": "https://www.gov.br/compras/pt-br",
        "padrao_url": ["comprasnet", "compras.gov.br", "serpro.gov.br"],
        "padrao_texto": ["[comprasnet]", "compras.gov.br", "comprasnet"]
    },
    "portaldecompraspublicas": {
        "slug": "portaldecompraspublicas",
        "nome": "Portal de Compras Públicas",
        "nome_curto": "Compras Públicas",
        "cor": "#006633",
        "bg_cor": "#E8F5E9",
        "borda_cor": "#A5D6A7",
        "url_base": "https://www.portaldecompraspublicas.com.br",
        "padrao_url": ["portaldecompraspublicas.com.br"],
        "padrao_texto": ["[portal de compras públicas]", "[portal de compras publicas]", "portal de compras públicas"]
    },
    "bll": {
        "slug": "bll",
        "nome": "BLL Compras",
        "nome_curto": "BLL Compras",
        "cor": "#6A1B9A",
        "bg_cor": "#F3E5F5",
        "borda_cor": "#CE93D8",
        "url_base": "https://bllcompras.com",
        "padrao_url": ["bllcompras.com", "bll.org.br"],
        "padrao_texto": ["[bll]", "bll compras", "bolsa de licitações e leilões"]
    },
    "bnc": {
        "slug": "bnc",
        "nome": "BNC (Bolsa Nacional de Compras)",
        "nome_curto": "BNC",
        "cor": "#D97602",
        "bg_cor": "#FFF8E1",
        "borda_cor": "#FFE082",
        "url_base": "https://bnc.org.br",
        "padrao_url": ["bnc.org.br"],
        "padrao_texto": ["[bnc]", "bolsa nacional de compras"]
    },
    "licitacoes_e": {
        "slug": "licitacoes_e",
        "nome": "Licitações-e (Banco do Brasil)",
        "nome_curto": "Licitações-e BB",
        "cor": "#002B49",
        "bg_cor": "#E1F5FE",
        "borda_cor": "#81D4FA",
        "url_base": "https://www.licitacoes-e.com.br",
        "padrao_url": ["licitacoes-e.com.br", "bb.com.br"],
        "padrao_texto": ["[licitações-e]", "[licitacoes-e]", "licitações-e"]
    },
    "licitanet": {
        "slug": "licitanet",
        "nome": "Licitanet",
        "nome_curto": "Licitanet",
        "cor": "#0284C7",
        "bg_cor": "#F0F9FF",
        "borda_cor": "#BAE6FD",
        "url_base": "https://licitanet.com.br",
        "padrao_url": ["licitanet.com.br"],
        "padrao_texto": ["[licitanet]", "licitanet"]
    },
    "bbmnet": {
        "slug": "bbmnet",
        "nome": "BBMNet Licitações",
        "nome_curto": "BBMNet",
        "cor": "#0D9488",
        "bg_cor": "#F0FDFA",
        "borda_cor": "#99F6E4",
        "url_base": "https://bbmnetlicitacoes.com.br",
        "padrao_url": ["bbmnet.com.br", "bbmnetlicitacoes.com.br"],
        "padrao_texto": ["[bbmnet]", "bbmnet"]
    },
    "ammlicita": {
        "slug": "ammlicita",
        "nome": "AMM Licita (Minas Gerais)",
        "nome_curto": "AMM Licita",
        "cor": "#C2410C",
        "bg_cor": "#FFF7ED",
        "borda_cor": "#FFEDD5",
        "url_base": "https://ammlicita.org.br",
        "padrao_url": ["ammlicita.org.br", "ipmbrasil.org.br"],
        "padrao_texto": ["[ammlicita]", "amm licita"]
    },
    "banrisul": {
        "slug": "banrisul",
        "nome": "Banrisul Compras (RS)",
        "nome_curto": "Pregão Banrisul",
        "cor": "#1E3A8A",
        "bg_cor": "#EFF6FF",
        "borda_cor": "#BFDBFE",
        "url_base": "https://pregaoonlinebanrisul.com.br",
        "padrao_url": ["banrisul.com.br", "pregaoonlinebanrisul.com.br"],
        "padrao_texto": ["[banrisul]", "banrisul", "pregão banrisul"]
    },
    "bec_sp": {
        "slug": "bec_sp",
        "nome": "BEC/SP (Bolsa Eletrônica de Compras SP)",
        "nome_curto": "BEC/SP",
        "cor": "#B91C1C",
        "bg_cor": "#FEF2F2",
        "borda_cor": "#FECACA",
        "url_base": "https://www.bec.sp.gov.br",
        "padrao_url": ["bec.sp.gov.br", "bec.fazenda.sp.gov.br"],
        "padrao_texto": ["[bec]", "bec/sp", "bolsa eletrônica de compras"]
    },
    "pncp": {
        "slug": "pncp",
        "nome": "PNCP Oficial (Governo Federal)",
        "nome_curto": "PNCP Oficial",
        "cor": "#01203C",
        "bg_cor": "#F1F5F9",
        "borda_cor": "#CBD5E1",
        "url_base": "https://pncp.gov.br",
        "padrao_url": ["pncp.gov.br"],
        "padrao_texto": []
    }
}


def identificar_portal(link_origem: Optional[str] = None, texto_objeto: Optional[str] = None) -> Dict[str, Any]:
    url_limpa = (link_origem or "").lower().strip()
    obj_limpo = (texto_objeto or "").lower().strip()

    for slug, cfg in PORTAIS_CONFIG.items():
        if slug == "pncp":
            continue
        if any(p in url_limpa for p in cfg["padrao_url"]):
            return {
                "slug": slug,
                "nome": cfg["nome"],
                "nome_curto": cfg["nome_curto"],
                "cor": cfg["cor"],
                "bg_cor": cfg["bg_cor"],
                "borda_cor": cfg["borda_cor"],
                "link_disputa": link_origem or cfg["url_base"]
            }
        if any(t in obj_limpo for t in cfg["padrao_texto"]):
            return {
                "slug": slug,
                "nome": cfg["nome"],
                "nome_curto": cfg["nome_curto"],
                "cor": cfg["cor"],
                "bg_cor": cfg["bg_cor"],
                "borda_cor": cfg["borda_cor"],
                "link_disputa": link_origem if (link_origem and "http" in link_origem and not "pncp.gov.br" in link_origem) else cfg["url_base"]
            }

    cfg_pncp = PORTAIS_CONFIG["pncp"]
    return {
        "slug": "pncp",
        "nome": cfg_pncp["nome"],
        "nome_curto": cfg_pncp["nome_curto"],
        "cor": cfg_pncp["cor"],
        "bg_cor": cfg_pncp["bg_cor"],
        "borda_cor": cfg_pncp["borda_cor"],
        "link_disputa": link_origem or "https://pncp.gov.br"
    }


def migrar_colunas_portal_db() -> int:
    if not DB_PATH.exists():
        return 0

    with sqlite3.connect(str(DB_PATH)) as conn:
        cursor = conn.cursor()
        cols = [c[1] for c in cursor.execute("PRAGMA table_info(oportunidades)").fetchall()]
        
        if "portal_slug" not in cols:
            cursor.execute("ALTER TABLE oportunidades ADD COLUMN portal_slug TEXT DEFAULT 'pncp'")
        if "portal_nome" not in cols:
            cursor.execute("ALTER TABLE oportunidades ADD COLUMN portal_nome TEXT DEFAULT 'PNCP Oficial'")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portal ON oportunidades (portal_slug)")

        rows = cursor.execute("SELECT id, link_sistema_origem, objeto_original FROM oportunidades").fetchall()
        atualizados = 0
        for pid, link, obj in rows:
            portal = identificar_portal(link, obj)
            cursor.execute(
                "UPDATE oportunidades SET portal_slug = ?, portal_nome = ? WHERE id = ?",
                (portal["slug"], portal["nome"], pid)
            )
            atualizados += 1

        conn.commit()

    return atualizados


def obter_estatisticas_portais() -> List[Dict[str, Any]]:
    from datetime import datetime
    agora = datetime.now().isoformat()
    estatisticas = []

    if not DB_PATH.exists():
        return estatisticas

    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT portal_slug, COUNT(*) as total
            FROM oportunidades
            WHERE data_encerramento > ?
            GROUP BY portal_slug
            ORDER BY total DESC
            """,
            (agora,)
        ).fetchall()

        mapa_contagens = {r["portal_slug"]: r["total"] for r in rows}

    for slug, cfg in PORTAIS_CONFIG.items():
        total = mapa_contagens.get(slug, 0)
        estatisticas.append({
            "slug": slug,
            "nome": cfg["nome"],
            "nome_curto": cfg["nome_curto"],
            "cor": cfg["cor"],
            "bg_cor": cfg["bg_cor"],
            "borda_cor": cfg["borda_cor"],
            "url_base": cfg["url_base"],
            "total_abertas": total
        })

    estatisticas.sort(key=lambda x: -x["total_abertas"])
    return estatisticas
