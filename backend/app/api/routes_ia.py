from fastapi import APIRouter, Response
from pydantic import BaseModel
from typing import List, Optional
from app.services.ai_copilot_service import ai_service
from app.services.proposal_generator import proposal_generator
from app.models import PropostaComercial

router = APIRouter(prefix="/api/ia", tags=["ia"])

class ChatRequest(BaseModel):
    mensagens: List[dict]
    contexto_edital: Optional[str] = None

class EditalRequest(BaseModel):
    texto: str

@router.post("/chat")
async def chat_copiloto(request: ChatRequest):
    """
    Chat interativo com o copiloto de licitações.
    """
    resposta = await ai_service.chat_copiloto(request.mensagens, request.contexto_edital)
    return {"resposta": resposta}

@router.post("/resumir-edital")
async def resumir_edital(request: EditalRequest):
    """
    Gera um resumo simplificado do edital para MPEs/MEIs.
    """
    resumo = await ai_service.resumir_edital(request.texto)
    return {"resumo": resumo}

@router.post("/gerar-proposta")
async def gerar_proposta(proposta: PropostaComercial):
    """
    Gera o PDF da proposta comercial pronto para assinatura.
    """
    pdf_bytes = proposal_generator.gerar_proposta_pdf(proposta)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=proposta_{proposta.oportunidade_id}.pdf"}
    )
