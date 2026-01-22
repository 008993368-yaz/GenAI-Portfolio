"""
RAG Retriever Service
LangChain-based semantic search over resume using Pinecone
"""

import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain.embeddings.base import Embeddings
from langchain.schema import Document


class PineconeInferenceEmbeddings(Embeddings):
    """
    Custom LangChain embeddings class using Pinecone's inference API
    Wraps Pinecone's llama-text-embed-v2 model
    """
    
    def __init__(self, pinecone_client: Pinecone, model: str = "llama-text-embed-v2"):
        """
        Initialize Pinecone inference embeddings
        
        Args:
            pinecone_client: Initialized Pinecone client
            model: Embedding model name
        """
        self.pc = pinecone_client
        self.model = model
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of documents
        
        Args:
            texts: List of document texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        embeddings = self.pc.inference.embed(
            model=self.model,
            inputs=texts,
            parameters={"input_type": "passage"}
        )
        
        return [emb['values'] for emb in embeddings]
    
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a query string
        
        Args:
            text: Query text to embed
            
        Returns:
            Embedding vector
        """
        embeddings = self.pc.inference.embed(
            model=self.model,
            inputs=[text],
            parameters={"input_type": "query"}
        )
        
        return embeddings[0]['values']


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
    """LangChain-based retriever for resume chunks using Pinecone"""
    
    def __init__(self, config: RetrieverConfig):
        self.config = config
        
        # Initialize Pinecone client
        self.pc = Pinecone(api_key=config.api_key)
        
        # Create custom embeddings
        self.embeddings = PineconeInferenceEmbeddings(
            pinecone_client=self.pc,
            model=config.embed_model
        )
        
        # Initialize LangChain PineconeVectorStore
        self.vectorstore = PineconeVectorStore(
            index_name=config.index_name,
            embedding=self.embeddings,
            namespace=config.namespace,
            pinecone_api_key=config.api_key
        )
        
        # Create retriever
        self.retriever = self.vectorstore.as_retriever(
            search_kwargs={"k": 5}
        )
    
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
        # Update search kwargs if top_k is different
        if top_k != 5:
            self.retriever.search_kwargs = {"k": top_k}
        
        # Use LangChain's similarity search with scores
        results = self.vectorstore.similarity_search_with_score(query, k=top_k)
        
        # Format matches to maintain compatibility with existing API
        matches = []
        for doc, score in results:
            matches.append({
                'id': doc.metadata.get('id', ''),
                'score': float(score),
                'text': doc.page_content,
                'metadata': {k: v for k, v in doc.metadata.items() if k != 'text'}
            })
        
        return matches
    
    def get_retriever(self, k: int = 5):
        """
        Get the LangChain retriever instance
        
        Args:
            k: Number of documents to retrieve
            
        Returns:
            LangChain retriever with configured search parameters
        """
        self.retriever.search_kwargs = {"k": k}
        return self.retriever
    
    def get_vectorstore(self) -> PineconeVectorStore:
        """
        Get the underlying PineconeVectorStore instance
        
        Returns:
            PineconeVectorStore instance
        """
        return self.vectorstore


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
