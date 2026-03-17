import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cyber Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    
    # SECURITY
    SECRET_KEY: str = "INSECURE_CHANGE_ME_IN_PROD_Eq0p_4-12345"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # POSTGRES
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "changethis")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "cyberintel")
    SQLALCHEMY_DATABASE_URI: str | None = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str):
            return v
        return str(
            f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@"
            f"{info.data.get('POSTGRES_SERVER')}/{info.data.get('POSTGRES_DB')}"
        )

    # NEO4J
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "password")

    # REDIS CACHE
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # OSINT API KEYS
    SHODAN_API_KEY: str | None = os.getenv("SHODAN_API_KEY")
    CENSYS_API_ID: str | None = os.getenv("CENSYS_API_ID")
    CENSYS_API_SECRET: str | None = os.getenv("CENSYS_API_SECRET")
    INTEL_X_API_KEY: str | None = os.getenv("INTEL_X_API_KEY")
    ALIENVAULT_API_KEY: str | None = os.getenv("ALIENVAULT_API_KEY")
    LEAK_LOOKUP_API_KEY: str | None = os.getenv("LEAK_LOOKUP_API_KEY")

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
