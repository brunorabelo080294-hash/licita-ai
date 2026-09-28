import math
import json
from pathlib import Path
from typing import List, Tuple
from app.models import Oportunidade, Municipio

class GeofencingService:
    def calcular_distancia_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calcula a distância entre duas coordenadas usando a fórmula de Haversine.
        """
        R = 6371.0  # Raio da Terra em km

        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        dlon = lon2_rad - lon1_rad
        dlat = lat2_rad - lat1_rad

        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def filtrar_por_raio(self, empresa_lat: float, empresa_lon: float, oportunidades: List[Oportunidade], raio_km: float) -> List[Oportunidade]:
        """
        Filtra oportunidades que estão dentro do raio especificado da empresa.
        """
        filtradas = []
        for op in oportunidades:
            dist = self.calcular_distancia_km(empresa_lat, empresa_lon, op.municipio.latitude, op.municipio.longitude)
            op.distancia_km = round(dist, 2)
            if dist <= raio_km:
                filtradas.append(op)
        
        # Ordenar por proximidade
        filtradas.sort(key=lambda x: x.distancia_km or float('inf'))
        return filtradas

    def carregar_municipios(self) -> List[dict]:
        data_path = Path(__file__).parent.parent / "data" / "municipios_base.json"
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

geofencing_service = GeofencingService()
