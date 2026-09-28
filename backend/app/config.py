import os
from dotenv import load_dotenv

load_dotenv()

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        APP_NAME: str = "Licita Aí"
        GROQ_API_KEY: str = ""
        GEMINI_API_KEY: str = ""
        BRASIL_API_BASE_URL: str = "https://brasilapi.com.br/api"
        JWT_SECRET_KEY: str = "super_secret_jwt_key_for_dev_only"
        PNCP_API_BASE_URL: str = "https://pncp.gov.br/api/consulta/v1"
        PNCP_USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        PNCP_MAX_RETRIES: int = 5
        PNCP_DEFAULT_TIMEOUT: float = 20.0

        model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        APP_NAME: str = os.getenv("APP_NAME", "Licita Aí")
        GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
        GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
        BRASIL_API_BASE_URL: str = os.getenv("BRASIL_API_BASE_URL", "https://brasilapi.com.br/api")
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "super_secret_jwt_key_for_dev_only")
        PNCP_API_BASE_URL: str = os.getenv("PNCP_API_BASE_URL", "https://pncp.gov.br/api/consulta/v1")
        PNCP_USER_AGENT: str = os.getenv("PNCP_USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        PNCP_MAX_RETRIES: int = int(os.getenv("PNCP_MAX_RETRIES", "5"))
        PNCP_DEFAULT_TIMEOUT: float = float(os.getenv("PNCP_DEFAULT_TIMEOUT", "20.0"))

settings = Settings()
