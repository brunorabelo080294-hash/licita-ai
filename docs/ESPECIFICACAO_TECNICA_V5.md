# Documento Master de Especificação Técnica — Plataforma "Licita Aí"

**Versão:** 5.0 (Multiplataforma Web Desktop + Mobile PWA)  
**Projeto:** SaaS B2G para Micro e Pequenas Empresas (MPEs) e MEIs  
**Foco Regional Inicial:** Zona da Mata Mineira e Região Serrana do RJ  
**Elaborado para:** Bruno Rabelo Baganha de Souza / Diretoria de Produto  
**Data:** Setembro de 2026

---

## 1. Visão Executiva e Proposta de Valor

O **Licita Aí** é uma plataforma inteligente concebida para quebrar a barreira burocrática das compras públicas brasileiras. O sistema funciona como um **"despachante digital"** e um **copiloto de inteligência comercial** para o pequeno empresário que fornece para prefeituras.

A interface abandona completamente a estética de portais governamentais, adotando a fluidez, clareza e acessibilidade de aplicativos de *delivery* e *fintech* (iFood, Nubank, Uber).

### 1.1. Diferencial Competitivo

| Dimensão | Concorrentes (ex: Licito.guru) | Licita Aí |
|---|---|---|
| **Público-alvo** | Comprador Público (servidores, pregoeiros) | **Vendedor / Fornecedor** (MPE, MEI, comerciante local) |
| **Proposta** | Gerar documentos para o órgão (ETP, TR, Edital) | **Encontrar, analisar e preparar o fornecedor para vencer** |
| **Modelo de venda** | B2G (ciclo longo, orçamento público) | **B2B (cartão/Pix, decisão rápida, R$ 99-249/mês)** |
| **Experiência** | Dashboard jurídico para desktop | **App mobile-first + Web desktop + WhatsApp** |
| **Geolocalização** | Nacional genérico | **Filtro por raio em km (logística real)** |

### 1.2. Mercado Endereçável

- **Brasil:** ~20 milhões de MPEs e MEIs ativos (SEBRAE, 2025).
- **Zona da Mata MG + Serra RJ:** ~500 municípios em raio de 200 km, com poder de compra municipal anual combinado superior a R$ 2 bilhões.
- **Nova Lei de Licitações (14.133/2021):** Obrigou a publicação digital de todos os processos no PNCP, tornando viável a automação em escala.

---

## 2. Experiência do Usuário (UX) e Interface (UI)

### 2.1. Identidade Visual

- **Fundo:** Limpo (clean), slate-50/white.
- **Tipografia:** Inter (sem serifas), amigável e legível.
- **Paleta de Cores:**
  - **Verde Ocean** (#0D9488, teal-600): Segurança, aprovação, Cofre Digital, indicadores positivos.
  - **Laranja Quente** (#F97316, orange-500): CTAs, botões de ação, urgência de prazos.
  - **Slate Gray** (#334155 a #94A3B8): Textos, fundos, elementos neutros.
  - **Verde Brilhante** (#22C55E, green-500): Selo de vantagem LC 123, documentos válidos.
  - **Âmbar** (#F59E0B, amber-500): Alertas de vencimento, atenção.
  - **Vermelho** (#EF4444, red-500): Documentos vencidos, risco financeiro.

### 2.2. Estratégia Multiplataforma

| Plataforma | Experiência | Caso de Uso Principal |
|---|---|---|
| **Mobile (PWA/App)** | Estilo delivery: cards verticais, bottom navigation, botões táteis grandes, gravação de áudio | Conferir oportunidades no balcão, no trânsito, mandar áudio de dúvida |
| **Desktop (Web)** | Sidebar fixa, split-screen (PDF do edital + copiloto IA), tabelas analíticas, download em lote | Ler editais extensos, montar proposta, analisar planilhas, imprimir dossiê |
| **WhatsApp (Fase 2)** | Alertas proativos, consultas por áudio, CTA de ação rápida | Receber oportunidade filtrada e agir em 30 segundos |

### 2.3. Onboarding "Zero Atrito"

1. O usuário fornece apenas o **CNPJ**.
2. A API (BrasilAPI) retorna a Razão Social, Nome Fantasia e CNAEs.
3. O sistema apresenta seletores rápidos (*chips*) para confirmar o mix de produtos (ex: "Alimentos", "Material de Limpeza", "Papelaria").
4. O usuário define o **raio máximo de entrega** em quilômetros (slider interativo: 25km a 300km).
5. Pronto para usar — menos de 2 minutos.

---

## 3. Arquitetura de Módulos Funcionais

### 3.1. Vitrine Universal de Oportunidades (O *Feed*)

Sistema de rolagem vertical exibindo licitações filtradas por **raio logístico** e **CNAE** da empresa.

- **Cobertura Total de Modalidades:** Dispensas Eletrônicas, Pregões, Concorrências, Sistema de Registro de Preços (SRP) e Inexigibilidades.
- **Fonte de Dados Primária:** API Pública do PNCP (Portal Nacional de Contratações Públicas), filtrada por códigos IBGE dos municípios dentro do raio.
- **Estrutura do Card:**
  - Brasão/nome do município + badge de UF
  - Objeto resumido pela IA ("Aquisição de gêneros alimentícios para merenda escolar")
  - Valor máximo estimado (em destaque, formatado em R$)
  - Distância em km do fornecedor até a prefeitura
  - Prazo de encerramento com contagem regressiva
  - Marcadores visuais: `[⚡ Dispensa]`, `[⚖️ Pregão]`, `[📋 Concorrência]`, `[📦 SRP]`
- **Selo de Vantagem LC 123:** Destaque automático em verde brilhante para licitações onde a MPE possui prioridade de desempate regional ou exclusividade.

### 3.2. Cofre Digital Inteligente e Dossiê Dinâmico

Automação do passivo documental da empresa.

- **Semáforo de Saúde Fiscal:** Indicador visual no topo da tela com status de cada certidão:
  - 🟢 **Válido** (> 30 dias para vencer)
  - 🟡 **Vencendo** (15 a 30 dias)
  - 🔴 **Vencido** (< 15 dias ou expirado)
- **Certidões Monitoradas:** CND Federal (Receita/PGFN), CNDT (Trabalhista), CRF (FGTS/Caixa), CND Estadual (SEFAZ-MG ou SEFAZ-RJ), CND Municipal (com alerta de upload manual).
- **Motor OCR Integrado:** Fotografia de atestados de capacidade técnica, contratos sociais ou balanços → extração de dados → arquivamento como texto pesquisável.
- **Geração de Proposta:** Ao clicar em "Quero Participar", a IA mapeia a modalidade, extrai as exigências daquele edital específico, puxa os documentos do Cofre Digital e gera um PDF único com Proposta Comercial + Habilitação.

### 3.3. Inteligência Comercial (Calculadoras e Risco)

- **Calculadora de Viabilidade:** Intersecção entre custos (produto + frete) e histórico de preços do PNCP na região.
  - Inputs: Custo do produto, custo do frete, margem desejada.
  - Outputs: Preço mínimo de venda, preço sugerido de lance, comparação com média regional.
  - Termômetro de Risco: barra colorida (verde → amarelo → vermelho) indicando se a margem é segura, apertada ou resulta em prejuízo.
- **Termômetro de Adimplência (Fase 2):** Análise preditiva do portal da transparência indicando o tempo médio de pagamento da prefeitura.
- **Inteligência de Preço Reversa:** Sugestão de faixa de lance baseada no histórico de compras homologadas anteriores para o mesmo item na região.

### 3.4. SOS IA: O Copiloto Conversacional

Chat de consultoria e defesa operando em tempo real.

- **Entrada Multimodal (Voice-to-Text):** Processamento de áudios via Groq/Whisper para perguntas faladas durante a rotina operacional.
- **Contextualização Dinâmica:** Se o chat é aberto dentro da tela de uma licitação, o edital é anexado ao prompt de forma invisível. A IA responde baseada nas cláusulas do documento e nas normativas do TCU.
- **Geração de Peças de Defesa:** Identificação de exigências abusivas (direcionamento de marca, prazos exíguos) e elaboração automática de pedidos de esclarecimento ou ofícios de impugnação.
- **Linguagem Acessível:** Respostas em português simples e direto, sem juridiquês, como se fosse um amigo advogado explicando no balcão.

---

## 4. Diretrizes Técnicas e de Segurança

### 4.1. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Backend** | Python + FastAPI | Ecossistema rico para IA, PDF, scraping; async nativo |
| **Frontend** | React + TypeScript + Vite + Tailwind CSS | SPA responsiva, PWA-ready, performance excelente |
| **IA (Chat Rápido)** | Groq (Llama 3.3 70B + Whisper) | Latência sub-segundo para chat e transcrição de áudio |
| **IA (Análise de PDFs)** | Google Gemini (Flash/Pro) | Janela de contexto de 1M+ tokens para editais de 100+ páginas |
| **Dados de Licitações** | API Pública do PNCP | Fonte oficial obrigatória pela Lei 14.133/2021 |
| **Dados Empresariais** | BrasilAPI (CNPJ) | Gratuita, confiável, dados da Receita Federal |
| **Geolocalização** | Haversine + Base IBGE própria | Cálculo de distância entre fornecedor e prefeitura |
| **PDF** | ReportLab + pdfplumber | Geração de propostas e extração de dados de editais |
| **Banco de Dados (Prod)** | PostgreSQL + PostGIS | Consultas geoespaciais nativas para o motor de raio |
| **WhatsApp (Fase 2)** | Evolution API / Z-API | Alertas proativos e copiloto conversacional |

### 4.2. Arquitetura de IA Híbrida

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (App / Web / WhatsApp)            │
├──────────────┬──────────────────────────────┬───────────────┤
│  Chat Rápido │  Transcrição de Áudio        │ Análise de    │
│  (Texto)     │  (Voice-to-Text)             │ Edital (PDF)  │
├──────────────┼──────────────────────────────┼───────────────┤
│     GROQ     │       GROQ                   │    GEMINI     │
│  Llama 3.3   │     Whisper Large v3         │  Flash / Pro  │
│  ~200ms      │     ~1s para 30s de áudio    │  Contexto 1M+ │
└──────────────┴──────────────────────────────┴───────────────┘
```

### 4.3. Motor de Geolocalização

1. **Base Geográfica:** Tabela interna com latitude/longitude de ~500 sedes de municípios (MG e RJ), indexada por código IBGE.
2. **Cálculo de Distância:** Fórmula de Haversine (precisão de ~0,5% em distâncias < 200 km).
3. **Filtro de Raio:** Quando o fornecedor define raio de 100 km, todas as oportunidades de municípios com distância > 100 km são descartadas do feed.
4. **Cruzamento Interestadual:** O raio desconsidera fronteiras estaduais, viabilizando que um fornecedor de Leopoldina/MG veja oportunidades em Carmo/RJ (58 km) e vice-versa.

### 4.4. Matriz de Risco e Compliance (Regra de Ouro)

> ⚠️ **ZERO Lances Automáticos**
>
> A plataforma atua **exclusivamente na fase preparatória e analítica**. É expressamente proibida a integração de robôs para execução de lances em pregões eletrônicos. Todo preenchimento de valores nos portais do governo (ex: Compras.gov) deve ser executado **manualmente pelo usuário**.
>
> Essa premissa blinda a plataforma contra processos indenizatórios oriundos de falhas de rede, bugs de API ou digitação equivocada de margens.

---

## 5. Monetização

### 5.1. Planos Mensais

| Plano | Preço | Inclui |
|---|---|---|
| **Essencial** | R$ 99/mês | Feed de oportunidades, filtro por raio, alertas por e-mail |
| **Profissional** | R$ 199/mês | + Cofre Digital, Geração de Propostas, Copiloto IA (50 consultas/mês) |
| **Premium** | R$ 349/mês | + IA ilimitada, WhatsApp Copilot, Calculadora de Viabilidade, Suporte prioritário |

### 5.2. Canais de Aquisição

1. **Salas do Empreendedor** das prefeituras da Zona da Mata e Serra.
2. **SEBRAE/MG e SEBRAE/RJ** — programas de capacitação de fornecedores para licitações.
3. **Associações Comerciais** de Leopoldina, Cataguases, Ubá, Juiz de Fora, Nova Friburgo e Teresópolis.
4. **Google Ads e Meta Ads** segmentados por CNAE e geolocalização (raio de 200 km da sede).

---

## 6. Roadmap de Execução

### Fase 1 — MVP (Semanas 1-4)
- [x] Radar Regional: Ingestão de dados do PNCP para municípios MG/RJ
- [x] Feed de Oportunidades com geofencing (slider de raio)
- [x] Onboarding zero atrito (CNPJ → BrasilAPI → Chips de CNAE)
- [x] Cofre Digital (semáforo de CNDs)
- [x] Copiloto SOS IA (chat contextual)
- [x] Calculadora de Viabilidade

### Fase 2 — Tração (Meses 2-3)
- [ ] WhatsApp Copilot (alertas proativos + consultas por áudio)
- [ ] Geração de Proposta Comercial em PDF
- [ ] Automação de emissão de CNDs (Federal, Trabalhista, FGTS)
- [ ] Motor OCR para upload de documentos fotografados
- [ ] Termômetro de Adimplência (Portal da Transparência)

### Fase 3 — Escala (Meses 4-6)
- [ ] Expansão para Minas Gerais inteiro + RJ inteiro
- [ ] Inteligência de Preço Reversa (histórico PNCP)
- [ ] App nativo (React Native ou Flutter)
- [ ] Dashboard para parceiros (SEBRAE, Associações Comerciais)
- [ ] Sistema de pagamento e assinatura (Stripe / Pagar.me)

---

*Este documento é propriedade intelectual da equipe Licita Aí e destina-se ao uso interno de planejamento e desenvolvimento.*
