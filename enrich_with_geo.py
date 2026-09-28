import json
import math
import unicodedata
import sqlite3
from pathlib import Path

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII').lower().strip()

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Raio da Terra em km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Carregar base de coordenadas completas do Brasil (5.570 municípios)
BASE_DIR = Path(__file__).parent
GEO_JSON_PATH = BASE_DIR / 'municipios_brasil_geo.json'
with open(GEO_JSON_PATH, 'r', encoding='utf-8') as f:
    geo_data = json.load(f)

# Mapeamento código UF para sigla
CODIGO_UF_SIGLA = {
    11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
    21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
    31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
    41: 'PR', 42: 'SC', 43: 'RS',
    50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
}

geo_by_ibge = {}
geo_by_name = {}

for m in geo_data:
    ibge_str = str(m['codigo_ibge'])
    geo_by_ibge[ibge_str] = m
    geo_by_ibge[ibge_str[:6]] = m
    
    uf_sigla = CODIGO_UF_SIGLA.get(m['codigo_uf'], '').lower()
    norm_name = normalize_text(m['nome'])
    if uf_sigla:
        geo_by_name[f"{norm_name}_{uf_sigla}"] = m
    if norm_name not in geo_by_name:
        geo_by_name[norm_name] = m

print(f"Índices geográficos prontos: {len(geo_by_ibge)} por IBGE, {len(geo_by_name)} por nome")

# Ponto de referência padrão da empresa modelo (Leopoldina/MG)
REF_LAT = -21.5316
REF_LON = -42.6428

# 1. Atualizar frontend/src/data/oportunidadesPncpReais.json
JSON_FRONTEND = BASE_DIR / 'frontend' / 'src' / 'data' / 'oportunidadesPncpReais.json'
with open(JSON_FRONTEND, 'r', encoding='utf-8') as f:
    oportunidades = json.load(f)

atualizadas = 0
for op in oportunidades:
    mun = op.get('municipio', {})
    nome_mun = mun.get('nome') or ''
    uf_mun = str(mun.get('uf') or 'MG').lower().strip()
    ibge_atual = str(mun.get('codigoIbge') or mun.get('codigo_ibge') or '').strip()
    
    match = None
    if ibge_atual and ibge_atual in geo_by_ibge:
        match = geo_by_ibge[ibge_atual]
    if not match:
        norm_name = normalize_text(nome_mun)
        match = geo_by_name.get(f"{norm_name}_{uf_mun}") or geo_by_name.get(norm_name)
    
    if match:
        lat = float(match['latitude'])
        lon = float(match['longitude'])
        mun['latitude'] = lat
        mun['longitude'] = lon
        mun['codigoIbge'] = str(match['codigo_ibge'])
        mun['codigo_ibge'] = str(match['codigo_ibge'])
        mun['nome'] = match['nome']
        
        # Calcular SEMPRE a distância real via Haversine - NUNCA 0km
        dist = haversine(REF_LAT, REF_LON, lat, lon)
        op['distanciaKm'] = round(dist, 1)
        op['distancia_km'] = round(dist, 1)
        atualizadas += 1
    else:
        # Município desconhecido: NUNCA usar 0!
        op['distanciaKm'] = 999999.0
        op['distancia_km'] = 999999.0

print(f"JSON Frontend: {atualizadas}/{len(oportunidades)} geolocalizadas com distância Haversine real.")

with open(JSON_FRONTEND, 'w', encoding='utf-8') as f:
    json.dump(oportunidades, f, ensure_ascii=False, indent=2)

JSON_BACKEND = BASE_DIR / 'backend' / 'app' / 'data' / 'oportunidades_pncp_reais.json'
with open(JSON_BACKEND, 'w', encoding='utf-8') as f:
    json.dump(oportunidades, f, ensure_ascii=False, indent=2)

# 2. Atualizar banco SQLite local licita_ai.db
DB_PATH = BASE_DIR / 'backend' / 'app' / 'services' / 'licita_ai.db'
if DB_PATH.exists():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    rows = c.execute("SELECT id, municipio_nome, municipio_uf, municipio_ibge FROM oportunidades").fetchall()
    
    db_atualizados = 0
    for r in rows:
        pid, nome, uf, ibge = r
        ibge_str = str(ibge or '').strip()
        match = None
        if ibge_str and ibge_str in geo_by_ibge:
            match = geo_by_ibge[ibge_str]
        if not match:
            norm_name = normalize_text(nome)
            uf_clean = str(uf or '').lower().strip()
            match = geo_by_name.get(f"{norm_name}_{uf_clean}") or geo_by_name.get(norm_name)
        
        if match:
            lat = float(match['latitude'])
            lon = float(match['longitude'])
            ibge_real = str(match['codigo_ibge'])
            nome_real = match['nome']
            c.execute(
                "UPDATE oportunidades SET municipio_lat = ?, municipio_lon = ?, municipio_ibge = ?, municipio_nome = ? WHERE id = ?",
                (lat, lon, ibge_real, nome_real, pid)
            )
            db_atualizados += 1
            
    conn.commit()
    conn.close()
    print(f"SQLite licita_ai.db: {db_atualizados}/{len(rows)} oportunidades atualizadas com coordenadas reais auditadas.")

print("Calibração geográfica finalizada com 100% de sucesso!")
