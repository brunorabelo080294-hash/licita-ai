import urllib.request
import json
import time
from datetime import datetime, timedelta

data_hoje = datetime.now().strftime('%Y%m%d')
data_inicio = (datetime.now() - timedelta(days=90)).strftime('%Y%m%d')

obras_reais = []
keywords = [
    'reforma', 'construção', 'construcao', 'alvenaria', 'paviment', 
    'predial', 'engenharia', 'muro de arrimo', 'cobertura', 'pintura',
    'edific', 'infraestrutura', 'drenagem', 'calçamento', 'escola'
]

# Modalidades: 4 (Concorrência), 6 (Pregão), 8 (Dispensa)
for uf in ['MG', 'RJ']:
    for mod in [8, 6, 4]:
        for pag in range(1, 4):
            url = (
                f"https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao"
                f"?dataInicial={data_inicio}&dataFinal={data_hoje}"
                f"&codigoModalidadeContratacao={mod}&uf={uf}&pagina={pag}&tamanhoPagina=50"
            )
            try:
                time.sleep(0.3)
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    items = data.get('data', [])
                    for it in items:
                        obj = (it.get('objetoCompra') or '').lower()
                        if any(k in obj for k in keywords):
                            pncp_id = it.get('numeroControlePNCP')
                            mun = it.get('municipioNome') or it.get('unidadeOrgao', {}).get('municipioNome') or 'Município'
                            obras_reais.append({
                                'pncpId': pncp_id,
                                'uf': uf,
                                'municipioNome': mun,
                                'orgao': it.get('orgaoEntidade', {}).get('razaoSocial'),
                                'objeto': it.get('objetoCompra'),
                                'valor': it.get('valorTotalEstimado'),
                                'modalidadeNome': it.get('modalidadeNome'),
                                'dataAbertura': it.get('dataAberturaProposta') or it.get('dataInclusao'),
                                'dataEncerramento': it.get('dataEncerramentoProposta') or it.get('dataPublicacaoPncp'),
                                'urlPncp': f"https://pncp.gov.br/app/editais/{pncp_id}",
                                'raw': it
                            })
            except Exception as e:
                pass

print(f"Total de obras e engenharia encontradas: {len(obras_reais)}")

# Salvar em JSON para inspecionar e injetar
with open("real_pncp_obras.json", "w", encoding="utf-8") as f:
    json.dump(obras_reais, f, ensure_ascii=False, indent=2)

for o in obras_reais[:10]:
    print("=" * 60)
    print(f"[{o['uf']}] {o['municipioNome']} - {o['orgao']}")
    print(f"Modalidade: {o['modalidadeNome']} | Valor: R$ {o['valor']}")
    print(f"Objeto: {o['objeto'][:140]}...")
    print(f"URL PNCP Oficial: {o['urlPncp']}")
