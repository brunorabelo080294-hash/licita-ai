# Licita Aí 🌿

> **Seu despachante digital de licitações.**  
> Plataforma inteligente que conecta Micro e Pequenas Empresas às oportunidades de compras públicas da sua região.

## 🚀 Início Rápido

### Backend (Python + FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp ../.env.example ../.env   # Edite com suas chaves de API
uvicorn app.main:app --reload --port 8000
```

### Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Acesse:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

## 📁 Estrutura do Projeto

```
licita-ai/
├── docs/                        # Documentação técnica
│   └── ESPECIFICACAO_TECNICA_V5.md
├── backend/                     # API FastAPI (Python)
│   ├── app/
│   │   ├── api/                 # Rotas da API
│   │   ├── services/            # Lógica de negócio
│   │   ├── data/                # Dados estáticos (municípios)
│   │   ├── config.py            # Configurações
│   │   ├── models.py            # Modelos Pydantic
│   │   └── main.py              # App FastAPI
│   └── requirements.txt
├── frontend/                    # App React + TypeScript
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   ├── pages/               # Páginas da aplicação
│   │   ├── data/                # Dados mock para desenvolvimento
│   │   └── types/               # Interfaces TypeScript
│   └── package.json
├── .env.example                 # Template de variáveis de ambiente
└── README.md
```

## 🌎 Foco Regional

Zona da Mata Mineira e Região Serrana do RJ — municípios conectados pelas rodovias BR-116, BR-393 e BR-040.

## 📄 Licença

Uso interno — © 2026 Licita Aí
