"""
Rotas REST para o Radar VIP WhatsApp
Permite cadastro de empresas e números de WhatsApp, consulta da Lista VIP,
cruzamento com editais do portal de compras e disparo de alertas via Evolution API.
"""

from fastapi import APIRouter, HTTPException, Query, Body
# Atualizado com enriquecimento automatico VIP
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from app.services.radar_maestro_service import (
    cadastrar_empresa_vip,
    listar_empresas_vip,
    cruzar_edital_com_lista_vip,
    disparar_alerta_cirurgico,
    get_db
)

router = APIRouter(prefix="/api/vip", tags=["radar_vip_whatsapp"])


class CadastroVIPRequest(BaseModel):
    cnpj: str
    whatsapp: str
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnae_principal: Optional[str] = None
    cnae_descricao: Optional[str] = None
    categoria_segmento: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raio_km: Optional[float] = 50.0


class TesteDisparoRequest(BaseModel):
    cnpj: str
    oportunidade_id: Optional[str] = None
    whatsapp_personalizado: Optional[str] = None


@router.post("/cadastrar")
async def api_cadastrar_vip(req: CadastroVIPRequest):
    """Insere ou atualiza uma empresa na Lista VIP do Radar de Compras WhatsApp."""
    resultado = cadastrar_empresa_vip(req.model_dump())
    return resultado


@router.get("/lista")
async def api_listar_vip():
    """Retorna todas as empresas cadastradas no Radar VIP."""
    empresas = listar_empresas_vip()
    return {
        "total": len(empresas),
        "empresas": empresas
    }


@router.post("/cruzar-edital")
async def api_cruzar_edital(oportunidade: Dict[str, Any] = Body(...)):
    """O Maestro: Identifica quais empresas da Lista VIP devem receber o alerta do certame."""
    destinatarios = cruzar_edital_com_lista_vip(oportunidade)
    return {
        "oportunidade_id": oportunidade.get("id"),
        "total_destinatarios": len(destinatarios),
        "destinatarios": destinatarios
    }


@router.post("/testar-disparo")
async def api_testar_disparo(req: TesteDisparoRequest):
    """
    Dispara ou simula um alerta de edital para o WhatsApp da empresa cadastrada,
    usando a inteligência de formatação Groq e envio via Evolution API.
    """
    # Procura a oportunidade informada ou pega a primeira aberta do banco
    from app.services.pncp_core import detalhe_oportunidade_db, listar_oportunidades_db
    
    op_dados = None
    if req.oportunidade_id:
        res = detalhe_oportunidade_db(req.oportunidade_id)
        if res and res.get("oportunidade"):
            op_dados = res["oportunidade"]

    if not op_dados:
        # Pega a oportunidade mais recente do banco
        from app.services.pncp_core import _conexao_db
        import json
        try:
            with _conexao_db() as conn:
                row = conn.execute("SELECT * FROM oportunidades ORDER BY id DESC LIMIT 1").fetchone()
                if row:
                    op_dados = dict(row)
                    if isinstance(op_dados.get("municipio"), str):
                        try:
                            op_dados["municipio"] = json.loads(op_dados["municipio"])
                        except Exception:
                            pass
        except Exception:
            pass

        if not op_dados:
            op_dados = {
                "id": "teste-edital-01",
                "objetoResumido": "Fornecimento de Pães, Alimentos e Merenda Escolar",
                "orgao": "Prefeitura Municipal de Leopoldina",
                "municipio": {"nome": "Leopoldina", "uf": "MG", "latitude": -21.5316, "longitude": -42.6428},
                "valorMaximo": 84500.0,
                "dataEncerramento": "15/10/2026 às 09:00",
                "exclusivoMpe": True,
                "portalNome": "Portal de Compras Públicas",
                "categoria": "alimentos"
            }

    # Se um WhatsApp personalizado foi passado, atualiza temporariamente
    if req.whatsapp_personalizado:
        cadastrar_empresa_vip({
            "cnpj": req.cnpj,
            "whatsapp": req.whatsapp_personalizado
        })

    resultado = await disparar_alerta_cirurgico(op_dados, cnpj_alvo=req.cnpj)
    return resultado


@router.get("/historico")
async def api_historico_alertas(cnpj: Optional[str] = Query(None)):
    """Retorna os últimos alertas disparados pelo Radar VIP."""
    conn = get_db()
    cursor = conn.cursor()
    if cnpj:
        cursor.execute("SELECT * FROM historico_alertas_whatsapp WHERE cnpj_empresa = ? ORDER BY id DESC LIMIT 50", (cnpj,))
    else:
        cursor.execute("SELECT * FROM historico_alertas_whatsapp ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
