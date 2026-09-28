from fastapi import APIRouter, UploadFile, File
from app.services.cnd_service import cnd_service
from app.models import SaudeFiscal

router = APIRouter(prefix="/api/cofre", tags=["cofre"])

@router.get("/saude-fiscal", response_model=SaudeFiscal)
async def get_saude_fiscal(cnpj: str = "00000000000000"):
    """
    Retorna o semáforo de saúde fiscal da empresa baseado nas CNDs.
    """
    saude = await cnd_service.verificar_saude_fiscal(cnpj)
    return saude

@router.post("/upload-documento")
async def upload_documento(file: UploadFile = File(...)):
    """
    Endpoint para upload de certidões e documentos no cofre digital.
    """
    # Em uma aplicação real, salvaria no S3/Blob storage
    return {"mensagem": f"Documento {file.filename} recebido com sucesso."}

@router.get("/documentos")
async def listar_documentos():
    """
    Lista os documentos armazenados no cofre.
    """
    return {
        "documentos": [
            {"id": 1, "nome": "Contrato_Social.pdf", "data_upload": "2026-01-10"},
            {"id": 2, "nome": "Balanco_Patrimonial_2025.pdf", "data_upload": "2026-02-15"}
        ]
    }
