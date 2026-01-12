"""
RAG Retriever Service
Handles semantic search over resume using Pinecone inference API
"""

import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone


class RetrieverConfig:
    """Configuration for Pinecone retriever"""
    
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.index_name = os.getenv("PINECONE_INDEX_NAME")
        self.namespace = os.getenv("PINECONE_NAMESPACE", "resume-v1")
        self.embed_model = os.getenv("PINECONE_EMBED_MODEL", "llama-text-embed-v2")
        
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate required environment variables"""
        if not self.api_key:
            return False, "PINECONE_API_KEY environment variable is missing"
        if not self.index_name:
            return False, "PINECONE_INDEX_NAME environment variable is missing"
        return True, None


class ResumeRetriever:
    """Retrieves relevant resume chunks using Pinecone inference"""
    
    def __init__(self, config: RetrieverConfig):
        self.config = config
        self.pc = Pinecone(api_key=config.api_key)
        self.index = self.pc.Index(config.index_name)
        
    def _embed_query(self, query: str) -> List[float]:
        """
        Embed query using Pinecone inference API
        
        Args:
            query: User query string
            
        Returns:
            List of embedding values
        """
        embeddings = self.pc.inference.embed(
            model=self.config.embed_model,
            inputs=[query],
            parameters={"input_type": "query"}
        )
        
        # Extract values from first (and only) embedding result
        return embeddings[0]['values']
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant resume context for a query
        
        Args:
            query: User query string
            top_k: Number of top matches to return
            
        Returns:
            List of matches, each containing:
                - id: chunk ID
                - score: similarity score
                - text: chunk text content
                - metadata: additional metadata (source, filename, etc.)
        """
        # Embed the query
        query_vector = self._embed_query(query)
        
        # Query Pinecone index
        results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=self.config.namespace
        )
        
        # Format matches
        matches = []
        for match in results.get('matches', []):
            # Extract text from metadata
            text = match.metadata.get('text', '')
            
            # Build metadata dict (everything except text)
            metadata = {k: v for k, v in match.metadata.items() if k != 'text'}
            
            matches.append({
                'id': match.id,
                'score': match.score,
                'text': text,
                'metadata': metadata
            })
        
        return matches


# Singleton instance (initialized on first use)
_retriever: Optional[ResumeRetriever] = None
_config: Optional[RetrieverConfig] = None


def get_retriever() -> tuple[Optional[ResumeRetriever], Optional[str]]:
    """
    Get or initialize the retriever singleton
    
    Returns:
        Tuple of (retriever, error_message)
        If successful: (ResumeRetriever instance, None)
        If failed: (None, error message)
    """
    global _retriever, _config
    
    if _retriever is not None:
        return _retriever, None
    
    # Initialize config
    _config = RetrieverConfig()
    is_valid, error = _config.validate()
    
    if not is_valid:
        return None, error
    
    try:
        _retriever = ResumeRetriever(_config)
        return _retriever, None
    except Exception as e:
        return None, f"Failed to initialize Pinecone retriever: {str(e)}"


def retrieve_resume_context(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Main retrieval function - retrieve relevant resume context for a query
    
    Args:
        query: User query string
        top_k: Number of top matches to return (default: 5)
        
    Returns:
        List of matches, each containing id, score, text, and metadata
        Returns empty list if retriever is not configured or on error
        
    Raises:
        ValueError: If Pinecone configuration is missing
        Exception: If retrieval fails
    """
    retriever, error = get_retriever()
    
    if error:
        raise ValueError(error)
    
    if not retriever:
        raise Exception("Retriever initialization failed")
    
    return retriever.retrieve(query, top_k)
