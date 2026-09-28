from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, date

class Municipio(BaseModel):
    nome: str
    uf: str
    codigo_ibge: Optional[str] = None
    latitude: float
    longitude: float

class Empresa(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnaes: List[str]
    endereco: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Oportunidade(BaseModel):
    id: str
    municipio: Municipio
    orgao: str
    objeto_original: str
    objeto_resumido: str
    valor_maximo: float
    modalidade: str
    data_abertura: datetime
    data_encerramento: datetime
    url_edital: Optional[str] = None
    exclusivo_mpe: bool = False
    distancia_km: Optional[float] = None
    vantagem_lc123: bool = False

class StatusCND(BaseModel):
    tipo: str
    nome: str
    status: Literal['valido', 'vencendo', 'vencido']
    data_emissao: date
    data_validade: date
    dias_restantes: int

class SaudeFiscal(BaseModel):
    empresa_cnpj: str
    cnds: List[StatusCND]
    score_geral: str

class MensagemChat(BaseModel):
    role: Literal['user', 'assistant', 'system']
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

class ItemProposta(BaseModel):
    descricao: str
    quantidade: int
    valor_unitario: float
    valor_total: float

class PropostaComercial(BaseModel):
    oportunidade_id: str
    empresa: Empresa
    itens: List[ItemProposta]
    valor_total: float
    documentos_anexados: Optional[List[str]] = None
