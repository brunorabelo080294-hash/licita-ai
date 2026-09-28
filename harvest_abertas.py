import urllib.request
import urllib.error
import json
import time
from datetime import datetime, timedelta
import re

hoje = datetime.now()
data_hoje_str = hoje.strftime('%Y%m%d')
data_inicio_str = (hoje - timedelta(days=45)).strftime('%Y%m%d')

print(f"Buscando licitações vigentes de {data_inicio_str} até {data_hoje_str} (Hoje: {hoje.strftime('%d/%m/%Y')})...")

licitacoes_abertas = []
ids_vistos = set()

# Converte numeroControlePNCP para URL web funcional do PNCP
def converter_url_pncp(numero_controle: str) -> str:
    if not numero_controle:
        return "https://pncp.gov.br"
    # Formato PNCP: 17733643000147-1-000017/2026 -> https://pncp.gov.br/app/editais/17733643000147/2026/000017
    m = re.match(r'^(\d+)-(\d+)-(\d+)/(\d{4})$', numero_controle.strip())
    if m:
        cnpj, tipo, seq, ano = m.groups()
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return f"https://pncp.gov.br/app/editais/{numero_controle}"

# Consulta modalidades: 6 (Pregão Eletrônico), 4 (Concorrência), 8 (Dispensa)
for uf in ['MG', 'RJ']:
    for mod in [6, 4, 8]:
        for pag in range(1, 6):
            time.sleep(0.35)
            url = (
                f"https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao"
                f"?dataInicial={data_inicio_str}&dataFinal={data_hoje_str}"
                f"&codigoModalidadeContratacao={mod}&uf={uf}&pagina={pag}&tamanhoPagina=50"
            )
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            try:
                with urllib.request.urlopen(req, timeout=12) as r:
                    d = json.loads(r.read().decode('utf-8'))
                    items = d.get('data', [])
                    for it in items:
                        pid = it.get('numeroControlePNCP')
                        if not pid or pid in ids_vistos:
                            continue

                        dt_fim_str = it.get('dataEncerramentoProposta')
                        dt_ini_str = it.get('dataAberturaProposta')

                        is_aberta = False
                        status_licitacao = 'encerrada'
                        dt_alvo = None

                        if dt_fim_str:
                            try:
                                dt_fim = datetime.fromisoformat(dt_fim_str.replace('Z', ''))
                                if dt_fim >= hoje:
                                    is_aberta = True
                                    status_licitacao = 'aberta'
                                    dt_alvo = dt_fim
                            except Exception:
                                pass

                        if not is_aberta and dt_ini_str:
                            try:
                                dt_ini = datetime.fromisoformat(dt_ini_str.replace('Z', ''))
                                if dt_ini >= hoje:
                                    is_aberta = True
                                    status_licitacao = 'futura'
                                    dt_alvo = dt_ini
                            except Exception:
                                pass

                        if is_aberta:
                            ids_vistos.add(pid)
                            licitacoes_abertas.append({
                                'item': it,
                                'uf': uf,
                                'modalidadeCodigo': mod,
                                'statusPrazo': status_licitacao,
                                'dataPrazo': dt_alvo.isoformat(),
                                'urlPncpFuncional': converter_url_pncp(pid)
                            })
            except Exception as e:
                # print(f"Erro {uf} mod {mod} pag {pag}: {e}")
                pass

print(f"\nTOTAL DE LICITAÇÕES ABERTAS / FUTURAS COLETADAS: {len(licitacoes_abertas)}")

with open('pncp_licitacoes_vigentes_abertas.json', 'w', encoding='utf-8') as f:
    json.dump(licitacoes_abertas, f, ensure_ascii=False, indent=2)

for x in licitacoes_abertas[:15]:
    it = x['item']
    mun = it.get('unidadeOrgao', {}).get('municipioNome') or it.get('municipioNome')
    dt_fmt = datetime.fromisoformat(x['dataPrazo']).strftime('%d/%m/%Y %H:%M')
    print(f"[{x['uf']}] {mun} | {x['statusPrazo'].upper()} até {dt_fmt}")
    print(f"    Objeto: {(it.get('objetoCompra') or '')[:90]}")
    print(f"    URL PNCP Oficial Funcional: {x['urlPncpFuncional']}")
