from fastapi import APIRouter, Query, HTTPException
from app.services.pncp_core import (
    listar_oportunidades_db,
    detalhe_oportunidade_db,
    sincronizar_e_persistir,
    pncp_service
)
from app.services.ai_copilot_service import ai_service
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/api/oportunidades", tags=["oportunidades"])


@router.get("/", response_model=List[Dict[str, Any]])
async def listar_oportunidades(
    empresa_lat: Optional[float] = Query(None, description="Latitude real da empresa cadastrada"),
    empresa_lon: Optional[float] = Query(None, description="Longitude real da empresa cadastrada"),
    empresa_uf: Optional[str] = Query(None, description="Sigla da UF da empresa cadastrada (ex: RS, MG, RJ, SP)"),
    raio_km: float = Query(100.0, description="Raio de busca em km"),
    cnae: Optional[str] = Query(None, description="Filtrar por CNAE ou categoria"),
    modalidade: Optional[str] = Query(None, description="Filtrar por modalidade (ex: dispensa, pregao)"),
    portal: Optional[str] = Query(None, description="Filtrar por portal de compras (ex: comprasnet, bll, bnc, portaldecompraspublicas)"),
    pagina: int = Query(1, ge=1),
    atualizar_pncp: bool = Query(False, description="Forçar consulta ao vivo das 13 modalidades no PNCP"),
    apenas_abertas: bool = Query(True, description="Filtrar apenas oportunidades com prazo aberto no calendário")
):
    """
    Lista oportunidades lendo diretamente do banco local SQLite (latência < 50ms).
    Usa a latitude e longitude REAL da empresa cadastrada (passada via query params),
    nunca uma constante fixa, calculando o raio geodésico exato para o CNPJ ativo.
    Suporta empresas de qualquer estado brasileiro (ex: Rio Grande do Sul - RS).
    Suporta filtragem pelos 11 portais oficiais de compras públicas.
    """
    # Se a requisição não fornecer coordenadas, usa a sede padrão da empresa ativa cadastrada (Leopoldina/MG)
    lat_real = empresa_lat if empresa_lat is not None else -21.5316
    lon_real = empresa_lon if empresa_lon is not None else -42.6428
    raio_val = float(raio_km) if isinstance(raio_km, (int, float)) else 100.0
    mod_val = str(modalidade).strip().lower() if modalidade else None
    portal_val = str(portal).strip().lower() if portal else None

    # Se a empresa for de um estado ainda sem certames no SQLite local, busca no PNCP sob demanda
    if empresa_uf:
        uf_upper = empresa_uf.strip().upper()
        from app.services.pncp_core import _conexao_db
        with _conexao_db() as conn:
            total_uf = conn.execute("SELECT COUNT(*) FROM oportunidades WHERE municipio_uf = ?", (uf_upper,)).fetchone()[0]
        if total_uf == 0:
            await sincronizar_e_persistir(ufs=[uf_upper], dias_retroativos=15, max_paginas_por_modalidade=3)

    # Se solicitado sincronização forçada sob demanda
    if atualizar_pncp:
        ufs_sync = [empresa_uf.upper()] if empresa_uf else ["MG", "RJ", "RS"]
        await sincronizar_e_persistir(ufs=ufs_sync, dias_retroativos=7, max_paginas_por_modalidade=2)

    # Consulta direta ao banco de dados SQLite com geofencing real
    oportunidades = listar_oportunidades_db(
        empresa_lat=lat_real,
        empresa_lon=lon_real,
        raio_km=raio_val,
        modalidade_slug=mod_val,
        categoria=cnae,
        portal=portal_val,
        apenas_abertas=apenas_abertas
    )

    return oportunidades


@router.get("/portais")
async def listar_estatisticas_portais():
    """
    Retorna a lista dos 11 portais de compras públicas integrados com o número
    de oportunidades abertas ativas em cada um.
    """
    from app.services.multiportal_service import obter_estatisticas_portais
    return obter_estatisticas_portais()


@router.get("/auditoria-pncp")
async def obter_auditoria_pncp():
    """
    Retorna a auditoria detalhada das chamadas à API do PNCP, distinguindo:
    - Sucessos com dados (200 OK com itens);
    - Vazios legítimos (204 No Content ou 200 com lista vazia);
    - Vazios 404 (sem publicações registradas);
    - Erros de configuração (400 Bad Request, ex: IBGE inválido);
    - Limites de taxa 429 e taxa de recuperação com Retry-After;
    - Erros de servidor 5xx e timeouts de rede.
    """
    return pncp_service.auditoria.gerar_relatorio()


@router.post("/sincronizar-pncp")
async def sincronizar_pncp(
    dias: int = Query(7, ge=1, le=60, description="Dias retroativos para consulta"),
    max_paginas: int = Query(3, ge=1, le=10, description="Limite de páginas por modalidade")
):
    """
    Aciona a varredura das 13 modalidades do PNCP v1, paginando até resposta vazia
    e persistindo tudo no SQLite local com coordenadas auditadas.
    """
    resultado = await sincronizar_e_persistir(
        ufs=["MG", "RJ"],
        dias_retroativos=dias,
        max_paginas_por_modalidade=max_paginas
    )

    return {
        "status": "sucesso",
        **resultado
    }


@router.get("/{id:path}")
async def detalhe_oportunidade(
    id: str,
    empresa_lat: Optional[float] = Query(None, description="Latitude real da empresa cadastrada"),
    empresa_lon: Optional[float] = Query(None, description="Longitude real da empresa cadastrada")
):
    """
    Retorna o detalhe de uma oportunidade diretamente do banco de dados local.
    Suporta IDs com barras (como padrão do PNCP 17733643000147-1-000079/2026).
    Se o ID não existir, levanta 404 real (sem fallback silencioso para a primeira licitação).
    """
    op = detalhe_oportunidade_db(id, empresa_lat=empresa_lat, empresa_lon=empresa_lon)
    if not op:
        raise HTTPException(
            status_code=404,
            detail=f"Oportunidade com identificador '{id}' não foi encontrada no banco de dados."
        )

    obj_texto = op.get("objetoOriginal") or op.get("objeto_original") or "Objeto de licitação pública"
    texto_edital = (
        f"Edital referente a: {obj_texto}. "
        f"Órgão: {op.get('orgao', 'Órgão Licitante')}. "
        f"Município: {op.get('municipio', {}).get('nome', '')}/{op.get('municipio', {}).get('uf', '')}. "
        f"Exigências habituais: Regularidade fiscal e trabalhista (CNDs Federal, Estadual, FGTS, Trabalhista)."
    )

    # Gera resumo usando IA
    resumo_ia = await ai_service.resumir_edital(texto_edital)

    return {
        "oportunidade": op,
        "resumo_ia": resumo_ia,
        "documentos_exigidos": [
            "Certidão Federal e Previdenciária",
            "Certidão de Regularidade do FGTS (CRF)",
            "Certidão Negativa de Débitos Trabalhistas (CNDT)",
            "Certidão Estadual e Municipal"
        ]
    }
