import json

with open('frontend/src/data/oportunidadesPncpReais.json', 'r', encoding='utf-8') as f:
    ops = json.load(f)

print(f"Total: {len(ops)}")
abertas = [o for o in ops if o.get('statusPrazo') in ['aberta', 'futura']]
print(f"Abertas: {len(abertas)}")

for o in abertas[:20]:
    mun = o['municipio']
    print(f"[{o.get('distanciaKm')} km] {mun.get('nome')}/{mun.get('uf')} (lat: {mun.get('latitude')}, lon: {mun.get('longitude')}) | Cat: {o.get('categoria')} | Modalidade: {o.get('modalidade')} | {o.get('objetoResumido')[:40]}")
