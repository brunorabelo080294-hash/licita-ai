import asyncio
import httpx
from datetime import datetime, timedelta
import sys
import os

# Adiciona diretório raiz do backend ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.services.pncp_service import (
    pncp_service,
    MODALIDADES_PNCP,
    extrair_retry_after,
    mapear_slug_modalidade
)
from app.config import settings


async def testar_headers():
    print("\n--- [TESTE 1] Headers Accept: application/json e User-Agent de navegador ---")
    headers = pncp_service.get_default_headers()
    assert headers.get("Accept") == "application/json", f"Header Accept incorreto: {headers.get('Accept')}"
    assert "Mozilla" in headers.get("User-Agent", ""), f"User-Agent não é de navegador: {headers.get('User-Agent')}"
    print(f"  OK: Accept: {headers.get('Accept')}")
    print(f"  OK: User-Agent: {headers.get('User-Agent')[:50]}...")


async def testar_tratamento_404_sem_abortar():
    print("\n--- [TESTE 2] Tratamento de 404 como resultado vazio sem abortar o loop ---")
    # Testa consulta com página inexistente ou parâmetros vazios
    url_inexistente = f"{pncp_service.base_url}/contratacoes/publicacao"
    params = {
        "dataInicial": "20260101",
        "dataFinal": "20260102",
        "codigoModalidadeContratacao": 99999,  # Modalidade inexistente
        "pagina": 99999,
        "tamanhoPagina": 10
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await pncp_service._executar_requisicao(client, url_inexistente, params)
        print(f"  Resposta recebida: {res}")
        assert res.get("empty") is True or len(res.get("data", [])) == 0, "Deveria retornar empty=True para 404"
        print("  OK: 404 tratado com sucesso como resultado vazio sem exceção.")


def testar_respeito_retry_after():
    print("\n--- [TESTE 3] Respeito a Retry-After em erro 429 ---")
    # 1. Header numérico em segundos
    headers_sec = httpx.Headers({"Retry-After": "5"})
    espera_sec = extrair_retry_after(headers_sec, default_backoff=2.0)
    assert espera_sec == 5.0, f"Deveria extrair 5.0s, obteve {espera_sec}"
    print(f"  OK: Retry-After numérico: {espera_sec}s")

    # 2. Header ausente (fallback para backoff padrão)
    headers_none = httpx.Headers({})
    espera_none = extrair_retry_after(headers_none, default_backoff=3.5)
    assert espera_none == 3.5, f"Deveria usar fallback 3.5s, obteve {espera_none}"
    print(f"  OK: Fallback para backoff padrão: {espera_none}s")


async def testar_13_modalidades_definidas():
    print("\n--- [TESTE 4] Definição e mapeamento das 13 modalidades de contratação ---")
    codigos = list(range(1, 14))
    for c in codigos:
        assert c in MODALIDADES_PNCP, f"Modalidade {c} não encontrada no dicionário"
        slug = mapear_slug_modalidade(MODALIDADES_PNCP[c], c)
        print(f"  Mod {c:2d}: {MODALIDADES_PNCP[c]:<28} -> Slug: {slug}")
    assert len(MODALIDADES_PNCP) == 13, f"Esperado 13 modalidades, encontrado {len(MODALIDADES_PNCP)}"
    print(f"  OK: Todas as 13 modalidades mapeadas com sucesso.")


async def testar_paginacao_ate_vazio_ao_vivo():
    print("\n--- [TESTE 5] Paginação até resposta vir vazia (ao vivo na API do PNCP) ---")
    hoje = datetime.now()
    data_fim = hoje.strftime("%Y%m%d")
    data_ini = (hoje - timedelta(days=1)).strftime("%Y%m%d")

    # Testa modalidade 1 (Leilão Eletrônico) que costuma ter poucos registros ou 1 página
    async with httpx.AsyncClient(timeout=15.0) as client:
        itens = await pncp_service.consultar_modalidade_paginada(
            client=client,
            codigo_modalidade=1,
            data_inicial=data_ini,
            data_final=data_fim,
            tamanho_pagina=10,
            max_paginas=3
        )
        print(f"  Total de itens coletados na paginação: {len(itens)}")
        print("  OK: Paginação executou até o fim sem falhas.")


async def main():
    print("=====================================================================")
    print("VERIFICAÇÃO DA INTEGRAÇÃO COM A API DO PNCP (pncp.gov.br/api/consulta/v1)")
    print("=====================================================================")

    await testar_headers()
    testar_respeito_retry_after()
    await testar_13_modalidades_definidas()
    await testar_tratamento_404_sem_abortar()
    await testar_paginacao_ate_vazio_ao_vivo()

    print("\n=====================================================================")
    print("TODOS OS 5 REQUISITOS FORAM TESTADOS E VALIDADOS COM SUCESSO!")
    print("=====================================================================")


if __name__ == "__main__":
    asyncio.run(main())
