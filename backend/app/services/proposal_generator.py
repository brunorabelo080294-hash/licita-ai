from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from app.models import PropostaComercial

class ProposalGeneratorService:
    def gerar_proposta_pdf(self, proposta: PropostaComercial) -> bytes:
        """
        Gera um PDF estruturado de proposta comercial utilizando ReportLab.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Cabeçalho da Empresa
        elements.append(Paragraph(f"<b>PROPOSTA COMERCIAL</b>", styles['Title']))
        elements.append(Spacer(1, 12))
        
        nome_empresa = proposta.empresa.nome_fantasia or proposta.empresa.razao_social
        
        info_empresa = f"""
        <b>Empresa:</b> {nome_empresa}<br/>
        <b>CNPJ:</b> {proposta.empresa.cnpj}<br/>
        <b>Endereço:</b> {proposta.empresa.endereco or 'Não informado'}
        """
        elements.append(Paragraph(info_empresa, styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Dados da Licitação
        info_licitacao = f"<b>Ref: Licitação / Oportunidade ID:</b> {proposta.oportunidade_id}"
        elements.append(Paragraph(info_licitacao, styles['Normal']))
        elements.append(Spacer(1, 20))

        # Tabela de Itens
        data = [["Descrição", "Qtd", "Valor Unit. (R$)", "Total (R$)"]]
        for item in proposta.itens:
            data.append([
                item.descricao,
                str(item.quantidade),
                f"{item.valor_unitario:.2f}",
                f"{item.valor_total:.2f}"
            ])
            
        data.append(["", "", "Valor Total Geral:", f"{proposta.valor_total:.2f}"])

        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (2, -1), (2, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(t)
        elements.append(Spacer(1, 40))
        
        # Assinatura
        elements.append(Paragraph("________________________________________________", styles['Normal']))
        elements.append(Paragraph("Assinatura do Representante Legal", styles['Normal']))

        doc.build(elements)
        return buffer.getvalue()

proposal_generator = ProposalGeneratorService()
