"""
RAG Retriever Service
LangChain-based semantic search over resume using Pinecone
"""

import hashlib
import threading
import logging
from typing import List, Dict, Any, Optional
from httpx import ConnectError as HttpxConnectError
from httpx import TimeoutException as HttpxTimeoutException
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain.embeddings.base import Embeddings
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import Timeout as RequestsTimeout
from tenacity import before_sleep_log, retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import config


logger = logging.getLogger(__name__)


class EmbeddingCache:
    """
    Thread-safe LRU cache for embedding vectors.
    
    Caches embedding results by MD5 hash of input text.
    Tracks cache statistics (hits, misses, size).
    Max capacity: 1000 entries.
    """

    def __init__(self, max_size: int = 1000):
        """Initialize the cache with max size."""
        self.max_size = max_size
        self._cache: Dict[str, List[float]] = {}
        self._access_order: List[str] = []
        self._lock = threading.RLock()
        
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _get_cache_key(text: str) -> str:
        """Generate MD5 hash key for text."""
        return hashlib.md5(text.encode()).hexdigest()

    def get(self, text: str) -> Optional[List[float]]:
        """
        Retrieve cached embedding if available.
        
        Args:
            text: Input text to look up
            
        Returns:
            Cached embedding vector or None if not found
        """
        key = self._get_cache_key(text)
        
        with self._lock:
            if key in self._cache:
                self._hits += 1
                self._access_order.remove(key)
                self._access_order.append(key)
                logger.info("Embedding cache hit (hits=%d, misses=%d)", self._hits, self._misses)
                return self._cache[key]
            
            self._misses += 1
            return None

    def put(self, text: str, embedding: List[float]) -> None:
        """
        Store embedding vector in cache.
        
        Args:
            text: Input text
            embedding: Embedding vector to cache
        """
        key = self._get_cache_key(text)
        
        with self._lock:
            if key in self._cache:
                self._access_order.remove(key)
            elif len(self._cache) >= self.max_size:
                lru_key = self._access_order.pop(0)
                del self._cache[lru_key]
                logger.info("Embedding cache evicted LRU entry (size now=%d/%d)", len(self._cache), self.max_size)
            
            self._cache[key] = embedding
            self._access_order.append(key)

    def get_metrics(self) -> Dict[str, int]:
        """
        Get cache statistics (thread-safe).
        
        Returns:
            Dict with cache size, hits, misses, and hit rate
        """
        with self._lock:
            total = self._hits + self._misses
            hit_rate = int((self._hits / total * 100)) if total > 0 else 0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "total_accesses": total,
                "hit_rate_percent": hit_rate,
            }

    def clear(self) -> None:
        """Clear all cached entries."""
        with self._lock:
            self._cache.clear()
            self._access_order.clear()
            logger.info("Embedding cache cleared")

def _is_retryable_pinecone_exception(exc: BaseException) -> bool:
    """Return True for transient Pinecone/network errors that should be retried."""
    retryable_types = (
        TimeoutError,
        ConnectionError,
        RequestsConnectionError,
        RequestsTimeout,
        HttpxConnectError,
        HttpxTimeoutException,
    )
    if isinstance(exc, retryable_types):
        return True

    error_text = str(exc).lower()
    retry_markers = [
        "timeout",
        "timed out",
        "connection",
        "rate limit",
        "too many requests",
        "429",
        "temporarily unavailable",
    ]
    return any(marker in error_text for marker in retry_markers)


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
        self.cache = EmbeddingCache(max_size=1000)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_is_retryable_pinecone_exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def _embed_with_retry(self, texts: List[str], input_type: str):
        """Call Pinecone inference API with retry on transient failures."""
        return self.pc.inference.embed(
            model=self.model,
            inputs=texts,
            parameters={"input_type": input_type},
        )
    
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

        results = []
        uncached_texts = []
        uncached_indices = []

        # Check cache for each text
        for i, text in enumerate(texts):
            cached = self.cache.get(text)
            if cached is not None:
                results.append((i, cached))
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Fetch uncached embeddings
        if uncached_texts:
            embeddings = self._embed_with_retry(texts=uncached_texts, input_type="passage")
            for i, (orig_idx, emb) in enumerate(zip(uncached_indices, embeddings)):
                vec = emb['values']
                self.cache.put(uncached_texts[i], vec)
                results.append((orig_idx, vec))

        # Sort by original index and return
        results.sort(key=lambda x: x[0])
        return [vec for _, vec in results]
    
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a query string
        
        Args:
            text: Query text to embed
            
        Returns:
            Embedding vector
        """
        # Check cache first
        cached = self.cache.get(text)
        if cached is not None:
            return cached

        # Fetch from API if not cached
        embeddings = self._embed_with_retry(texts=[text], input_type="query")
        vec = embeddings[0]['values']
        
        # Cache the result
        self.cache.put(text, vec)
        return vec


class RetrieverConfig:
    """Configuration for Pinecone retriever"""
    
    def __init__(self):
        self.api_key = config.PINECONE_API_KEY
        self.index_name = config.PINECONE_INDEX_NAME
        self.namespace = config.PINECONE_NAMESPACE
        self.embed_model = config.PINECONE_EMBED_MODEL
        
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
    
    def retrieve(self, query: str, top_k: int = 5, request_id: Optional[str] = None) -> List[Dict[str, Any]]:
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

    def get_cache_metrics(self) -> Dict[str, int]:
        """
        Get embedding cache statistics
        
        Returns:
            Dict with cache metrics (size, hits, misses, hit rate)
        """
        return self.embeddings.cache.get_metrics()


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


def retrieve_resume_context(query: str, top_k: int = 5, request_id: Optional[str] = None) -> List[Dict[str, Any]]:
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
