"""
Configuration module for RAG Backend
Loads all environment variables in a centralized location
"""

import os
from typing import Optional


class Config:
    """Centralized configuration from environment variables"""

    # Default tuning values used when environment variables are not provided.
    # These are intentionally conservative to keep chat responses grounded and session state bounded.
    DEFAULT_RAG_TOP_K: int = 5
    DEFAULT_RAG_TEMPERATURE: float = 0.7
    DEFAULT_RAG_RETRY_ATTEMPTS: int = 3
    DEFAULT_RAG_RETRY_WAIT_MIN_SECONDS: int = 2
    DEFAULT_RAG_RETRY_WAIT_MAX_SECONDS: int = 10
    DEFAULT_RAG_RETRY_WAIT_MULTIPLIER: int = 1
    DEFAULT_RAG_SUGGESTION_COUNT: int = 2
    DEFAULT_SUGGESTION_CONTEXT_DOC_LIMIT: int = 4
    DEFAULT_SUGGESTION_WORD_COUNT_MIN: int = 5
    DEFAULT_SUGGESTION_WORD_COUNT_MAX: int = 10
    DEFAULT_MESSAGES_PER_EXCHANGE: int = 2

    DEFAULT_SESSION_MAX_MESSAGES_PER_SESSION: int = 10
    DEFAULT_SESSION_TTL_SECONDS: int = 3600
    DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS: int = 300
    
    # Pinecone Configuration
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "")
    PINECONE_NAMESPACE: str = os.getenv("PINECONE_NAMESPACE", "resume-v1")
    PINECONE_EMBED_MODEL: str = os.getenv("PINECONE_EMBED_MODEL", "llama-text-embed-v2")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # RAG Configuration
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", str(DEFAULT_RAG_TOP_K)))

    # Session memory configuration
    SESSION_TTL: int = int(os.getenv("SESSION_TTL", str(DEFAULT_SESSION_TTL_SECONDS)))
    SESSION_CLEANUP_INTERVAL: int = int(os.getenv("SESSION_CLEANUP_INTERVAL", str(DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS)))

    # Rate limiting configuration
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
    RATE_LIMIT_DEFAULT: str = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
    CHAT_RATE_LIMIT: str = os.getenv("CHAT_RATE_LIMIT", "10/minute")
    SUGGESTIONS_RATE_LIMIT: str = os.getenv("SUGGESTIONS_RATE_LIMIT", "20/minute")
    RATE_LIMIT_RETRY_AFTER_SECONDS: int = int(os.getenv("RATE_LIMIT_RETRY_AFTER_SECONDS", "60"))

    # Logging configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "rag-backend.log")
    
    # CORS Configuration
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    )
    
    @classmethod
    def get_cors_origins(cls) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in cls.CORS_ORIGINS.split(",") if origin.strip()]
    
    @classmethod
    def validate_required(cls) -> tuple[bool, Optional[str]]:
        """Validate that required environment variables are set"""
        required_vars = {
            "PINECONE_API_KEY": cls.PINECONE_API_KEY,
            "PINECONE_INDEX_NAME": cls.PINECONE_INDEX_NAME,
            "OPENAI_API_KEY": cls.OPENAI_API_KEY,
        }
        
        missing = [key for key, value in required_vars.items() if not value]
        if missing:
            return False, f"Missing required environment variables: {', '.join(missing)}"
        
        return True, None


# Create a singleton instance
config = Config()
