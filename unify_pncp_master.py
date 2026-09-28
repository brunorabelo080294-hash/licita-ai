import json
import os
import re

# Carregar fontes
arquivos = [
    'pncp_cidades_foco.json',
    'real_pncp_oportunidades.json'
]

todos = []
vistos = set()

for arq in arquivos:
    if os.path.exists(arq):
        try:
            with open(arq, 'r', encoding='utf-8') as f:
                itens = json.load(f)
                print(f"Lendo {arq}: {len(itens)} itens")
                for it in itens:
                    pid = it.get('id') or it.get('numeroControlePNCP')
                    if pid and pid not in vistos:
                        vistos.add(pid)
                        todos.append(it)
        except Exception as e:
            print(f"Erro ao ler {arq}: {e}")

print(f"\nTotal consolidado unico: {len(todos)} licitacoes reais do PNCP")

# Normalizar categorias para bater exatamente com as do frontend:
# 'construcao' | 'alimentos' | 'limpeza' | 'ti' | 'saude' | 'veiculos' | 'geral'
MAPEAMENTO_CATEGORIAS = {
    'construcao': 'construcao',
    'alimentos': 'alimentos',
    'limpeza': 'limpeza',
    'ti': 'ti',
    'informatica': 'ti',
    'saude': 'saude',
    'veiculos': 'veiculos',
    'mobiliario': 'geral',
    'outros': 'geral',
    'geral': 'geral'
}

for item in todos:
    cat_original = item.get('categoria', 'geral')
    item['categoria'] = MAPEAMENTO_CATEGORIAS.get(cat_original, 'geral')
    
    # Garantir que urlPncp seja legitima
    pid = item.get('numeroControlePNCP') or item.get('id')
    item['urlPncp'] = f"https://pncp.gov.br/app/editais/{pid}"
    item['urlEdital'] = item['urlPncp']
    
    # Se linkSistemaOrigem estiver vazio ou for igual ao PNCP, garantir nome amigável
    if not item.get('linkSistemaOrigem'):
        item['linkSistemaOrigem'] = item['urlPncp']
        item['nomeSistemaOrigem'] = 'Portal Nacional PNCP'
    elif 'cnetmobile' in item['linkSistemaOrigem'] or 'comprasnet' in item['linkSistemaOrigem']:
        item['nomeSistemaOrigem'] = 'Comprasnet / Governo Federal'
    elif 'portaldecompraspublicas' in item['linkSistemaOrigem']:
        item['nomeSistemaOrigem'] = 'Portal de Compras Públicas'
    elif 'compras.mg.gov.br' in item['linkSistemaOrigem']:
        item['nomeSistemaOrigem'] = 'Portal Compras MG'
    elif 'licitanet' in item['linkSistemaOrigem']:
        item['nomeSistemaOrigem'] = 'Licitanet'

# Contagem por categoria
from collections import Counter
cats = Counter(t['categoria'] for t in todos)
print("\nDistribuicao de Categorias:")
for c, n in cats.most_common():
    print(f"  {c}: {n}")

# Cidades foco
cidades_foco = ['Muriaé', 'Leopoldina', 'Juiz de Fora', 'Cataguases', 'Ubá', 'Além Paraíba']
print("\nPresenca das cidades foco:")
for cf in cidades_foco:
    count = sum(1 for t in todos if cf.lower() in t['municipio']['nome'].lower() or cf.lower() in t['orgao'].lower())
    print(f"  {cf}: {count} licitacoes reais")

# Salvar no backend
backend_path = os.path.join('backend', 'app', 'data', 'oportunidades_pncp_reais.json')
with open(backend_path, 'w', encoding='utf-8') as f:
    json.dump(todos, f, ensure_ascii=False, indent=2)
print(f"\nSalvo em {backend_path}")

# Salvar no frontend
frontend_json = os.path.join('frontend', 'src', 'data', 'oportunidadesPncpReais.json')
with open(frontend_json, 'w', encoding='utf-8') as f:
    json.dump(todos, f, ensure_ascii=False, indent=2)
print(f"Salvo em {frontend_json}")
