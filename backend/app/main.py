import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api import routes_auth, routes_oportunidades, routes_cofre, routes_ia, routes_precificacao, routes_vip
from app.config import settings
from app.services.pncp_core import agendar_sincronizacao

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend da plataforma Licita Aí, focada em MPEs/MEIs para licitações públicas.",
    version="1.0.0"
)

# Configuração de CORS para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos routers
app.include_router(routes_auth.router)
app.include_router(routes_oportunidades.router)
app.include_router(routes_cofre.router)
app.include_router(routes_ia.router)
app.include_router(routes_precificacao.router)
app.include_router(routes_vip.router)

# Agendamento da sincronização em background com APScheduler
agendar_sincronizacao(app, ufs=["MG", "RJ", "RS"], intervalo_minutos=60)

@app.get("/api")
async def api_info():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "mensagem": "Bem-vindo à API do Licita Aí!"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Localização dos arquivos estáticos do frontend (produção unificada)
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(DIST_DIR):
    DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "online", "app": settings.APP_NAME}

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
