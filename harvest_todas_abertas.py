import urllib.request
import urllib.error
import json
import time
from datetime import datetime, timedelta
import re

hoje = datetime.now()
data_hoje_str = hoje.strftime('%Y%m%d')
data_inicio_str = (hoje - timedelta(days=60)).strftime('%Y%m%d')

print(f"Coletando licitações estritamente ABERTAS ou A ABRIR...")
print(f"Data de referência (Hoje): {hoje.strftime('%d/%m/%Y %H:%M')}")

def converter_url_pncp(numero_controle: str) -> str:
    if not numero_controle:
        return "https://pncp.gov.br"
    # Formato correto PNCP web: {cnpj}/{ano}/{sequencial}
    m = re.match(r'^(\d+)-(\d+)-(\d+)/(\d{4})$', numero_controle.strip())
    if m:
        cnpj, tipo, seq, ano = m.groups()
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return f"https://pncp.gov.br/app/editais/{numero_controle}"

licitacoes_abertas = []
ids_vistos = set()

# Modalidades: 6 (Pregão Eletrônico), 4 (Concorrência), 8 (Dispensa Eletrônica), 9 (Inexigibilidade)
for uf in ['MG', 'RJ']:
    for mod in [6, 4, 8]:
        for pag in range(1, 10):
            time.sleep(0.3)
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
                    if not items:
                        break
                    for it in items:
                        pid = it.get('numeroControlePNCP')
                        if not pid or pid in ids_vistos:
                            continue

                        dt_fim_str = it.get('dataEncerramentoProposta')
                        dt_ini_str = it.get('dataAberturaProposta')

                        is_aberta = False
                        status_prazo = 'encerrada'
                        dt_alvo = None

                        if dt_fim_str:
                            try:
                                dt_fim = datetime.fromisoformat(dt_fim_str.replace('Z', ''))
                                if dt_fim >= hoje:
                                    is_aberta = True
                                    status_prazo = 'aberta'
                                    dt_alvo = dt_fim
                            except Exception:
                                pass

                        if not is_aberta and dt_ini_str:
                            try:
                                dt_ini = datetime.fromisoformat(dt_ini_str.replace('Z', ''))
                                if dt_ini >= hoje:
                                    is_aberta = True
                                    status_prazo = 'futura'
                                    dt_alvo = dt_ini
                            except Exception:
                                pass

                        if is_aberta and dt_alvo:
                            ids_vistos.add(pid)
                            licitacoes_abertas.append({
                                'item': it,
                                'uf': uf,
                                'modalidadeCodigo': mod,
                                'statusPrazo': status_prazo,
                                'dataPrazo': dt_alvo.isoformat(),
                                'urlPncpFuncional': converter_url_pncp(pid)
                            })
            except Exception as e:
                # Se der 429, aguarda 1.5s
                if '429' in str(e):
                    time.sleep(2.0)
                pass

print(f"\nTOTAL DE LICITAÇÕES ABERTAS ENCONTRADAS: {len(licitacoes_abertas)}")

with open('pncp_licitacoes_abertas_todas.json', 'w', encoding='utf-8') as f:
    json.dump(licitacoes_abertas, f, ensure_ascii=False, indent=2)

for x in licitacoes_abertas[:10]:
    it = x['item']
    mun = it.get('unidadeOrgao', {}).get('municipioNome') or it.get('municipioNome')
    dt_fmt = datetime.fromisoformat(x['dataPrazo']).strftime('%d/%m/%Y %H:%M')
    print(f"[{x['uf']}] {mun} | {x['statusPrazo'].upper()} até {dt_fmt} | R$ {it.get('valorTotalEstimado')} | {x['urlPncpFuncional']}")
