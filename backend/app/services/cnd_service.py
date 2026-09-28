from datetime import date, timedelta
from app.models import SaudeFiscal, StatusCND

class CNDService:
    async def verificar_saude_fiscal(self, cnpj: str) -> SaudeFiscal:
        """
        Verifica a saúde fiscal da empresa através de certidões negativas de débito.
        Retorna dados mockados realistas para o semáforo de saúde (verde/amarelo/vermelho).
        """
        hoje = date.today()
        
        cnds = [
            StatusCND(
                tipo="FEDERAL",
                nome="Certidão Conjunta Federal (Receita e PGFN)",
                status="valido",
                data_emissao=hoje - timedelta(days=20),
                data_validade=hoje + timedelta(days=160),
                dias_restantes=160
            ),
            StatusCND(
                tipo="ESTADUAL",
                nome="Certidão Negativa Estadual",
                status="vencendo",
                data_emissao=hoje - timedelta(days=70),
                data_validade=hoje + timedelta(days=20), # Menos de 30 dias para vencer
                dias_restantes=20
            ),
            StatusCND(
                tipo="MUNICIPAL",
                nome="Certidão Negativa Municipal",
                status="vencido",
                data_emissao=hoje - timedelta(days=100),
                data_validade=hoje - timedelta(days=10), # Vencida
                dias_restantes=-10
            ),
            StatusCND(
                tipo="FGTS",
                nome="Certificado de Regularidade do FGTS",
                status="valido",
                data_emissao=hoje - timedelta(days=5),
                data_validade=hoje + timedelta(days=25), # Validade curta, mas mais que 15 dias
                dias_restantes=25
            )
        ]
        
        # Lógica do score:
        # Se tem vencida -> vermelho
        # Se tem vencendo -> amarelo
        # Caso contrário -> verde
        
        has_vencido = any(c.status == 'vencido' for c in cnds)
        has_vencendo = any(c.status == 'vencendo' for c in cnds)
        
        if has_vencido:
            score = "vermelho"
        elif has_vencendo:
            score = "amarelo"
        else:
            score = "verde"

        return SaudeFiscal(
            empresa_cnpj=cnpj,
            cnds=cnds,
            score_geral=score
        )

cnd_service = CNDService()
