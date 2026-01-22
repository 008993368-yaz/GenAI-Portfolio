"""
Configuration module for RAG Backend
Loads all environment variables in a centralized location
"""

import os
from typing import Optional


class Config:
    """Centralized configuration from environment variables"""
    
    # Pinecone Configuration
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "")
    PINECONE_NAMESPACE: str = os.getenv("PINECONE_NAMESPACE", "resume-v1")
    PINECONE_EMBED_MODEL: str = os.getenv("PINECONE_EMBED_MODEL", "llama-text-embed-v2")
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # RAG Configuration
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))
    
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
