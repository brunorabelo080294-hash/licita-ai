"""
Rotas REST para Inteligência de Precificação Governamental (CATMAT/CATSER)
Permite pesquisa de preços públicos homologados e cálculo de cenários competitivos de lance.
"""

from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.services.catmat_core import buscar_historico_catmat, calcular_cenarios_lance, listar_todos_itens_catmat

router = APIRouter(prefix="/api/precificacao", tags=["precificacao"])


@router.get("/catmat/catalogo")
async def listar_catalogo():
    """Retorna todo o catálogo governamental disponível para pesquisa ágil."""
    return listar_todos_itens_catmat()


class CalculoViabilidadeRequest(BaseModel):
    preco_teto_edital: float
    custo_informado: float
    frete_unitario: float = 0.0
    codigo_catmat: Optional[str] = None
    termo_objeto: Optional[str] = None
    categoria: Optional[str] = None


@router.get("/catmat/pesquisar")
async def pesquisar_catmat(
    termo: str = Query(..., description="Termo de busca ou código CATMAT"),
    categoria: Optional[str] = Query(None, description="Categoria do segmento (construcao, alimentos, limpeza, etc.)")
):
    resultado = buscar_historico_catmat(termo, categoria)
    if not resultado:
        raise HTTPException(status_code=404, detail="Nenhum item do catálogo CATMAT correspondente foi encontrado.")
    return resultado


@router.get("/catmat/{codigo}")
async def obter_catmat_por_codigo(codigo: str):
    resultado = buscar_historico_catmat(codigo)
    if not resultado:
        raise HTTPException(status_code=404, detail=f"Código CATMAT '{codigo}' não encontrado no catálogo governamental.")
    return resultado


@router.post("/calcular-cenarios")
async def calcular_cenarios_viabilidade(req: CalculoViabilidadeRequest):
    historico = None
    if req.codigo_catmat:
        historico = buscar_historico_catmat(req.codigo_catmat)
    elif req.termo_objeto:
        historico = buscar_historico_catmat(req.termo_objeto, req.categoria)

    return calcular_cenarios_lance(
        preco_teto_edital=req.preco_teto_edital,
        custo_informado=req.custo_informado,
        frete_unitario=req.frete_unitario,
        historico_catmat=historico
    )
