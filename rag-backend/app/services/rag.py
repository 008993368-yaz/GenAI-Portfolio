"""
RAG Service
Complete RAG pipeline: retrieval from Pinecone + OpenAI generation
"""

import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage


class RAGConfig:
    """Configuration for RAG pipeline"""
    
    def __init__(self):
        # Pinecone settings
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")
        self.pinecone_namespace = os.getenv("PINECONE_NAMESPACE", "resume-v1")
        self.embed_model = os.getenv("PINECONE_EMBED_MODEL", "llama-text-embed-v2")
        self.rag_top_k = int(os.getenv("RAG_TOP_K", "5"))
        
        # OpenAI settings
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate required environment variables"""
        if not self.pinecone_api_key:
            return False, "PINECONE_API_KEY is required"
        if not self.pinecone_index_name:
            return False, "PINECONE_INDEX_NAME is required"
        if not self.openai_api_key:
            return False, "OPENAI_API_KEY is required"
        return True, None


class RAGPipeline:
    """Complete RAG pipeline with retrieval and generation"""
    
    def __init__(self, config: RAGConfig):
        self.config = config
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=config.pinecone_api_key)
        self.index = self.pc.Index(config.pinecone_index_name)
        
        # Initialize OpenAI
        self.llm = ChatOpenAI(
            model=config.openai_model,
            openai_api_key=config.openai_api_key,
            temperature=0.7,
        )
        
        # System prompt defining Yazhini's persona and constraints
        self.system_prompt = """You are Yazhini Elanchezhian's portfolio assistant, a friendly and professional AI that helps visitors learn about Yazhini's background, skills, and experience.

**Your Role:**
- Provide accurate information about Yazhini based ONLY on the resume context provided
- Be warm, conversational, and helpful
- Speak in first person as if you are representing Yazhini (use "I" and "my")

**Strict Rules:**
1. ONLY use information from the PROVIDED RESUME CONTEXT below
2. If the resume context doesn't contain the answer, explicitly say: "I don't have that specific detail in my resume context. Feel free to ask about my projects, skills, work experience, or education."
3. NEVER make up or hallucinate information
4. If asked about something not in the context, suggest what you CAN answer (e.g., "I can tell you about my work at Accenture, my technical skills, or my education")
5. Keep responses concise but informative (2-4 sentences typically)
6. For follow-up questions, use the conversation history to maintain context

**Topics you can discuss (if in context):**
- Work experience and responsibilities
- Technical skills and technologies
- Education and academic achievements
- Projects and accomplishments
- Tools and frameworks used
- Professional background

Remember: Accuracy over completeness. If you're not sure, say so."""
    
    def _embed_query(self, query: str) -> List[float]:
        """
        Embed query using Pinecone inference
        
        Args:
            query: User query string
            
        Returns:
            Embedding vector
        """
        embeddings = self.pc.inference.embed(
            model=self.config.embed_model,
            inputs=[query],
            parameters={"input_type": "query"}
        )
        return embeddings[0]['values']
    
    def _retrieve_context(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieve relevant resume chunks from Pinecone
        
        Args:
            query: User query
            top_k: Number of chunks to retrieve (defaults to config value)
            
        Returns:
            List of matching chunks with text and metadata
        """
        if top_k is None:
            top_k = self.config.rag_top_k
        
        # Embed the query
        query_vector = self._embed_query(query)
        
        # Query Pinecone
        results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            namespace=self.config.pinecone_namespace
        )
        
        # Extract chunks
        chunks = []
        for match in results.get('matches', []):
            chunks.append({
                'text': match.metadata.get('text', ''),
                'score': match.score,
                'source': match.metadata.get('source', 'resume'),
                'chunk_index': match.metadata.get('chunk_index', 0)
            })
        
        return chunks
    
    def _build_context_string(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Build context string from retrieved chunks
        
        Args:
            chunks: Retrieved resume chunks
            
        Returns:
            Formatted context string
        """
        if not chunks:
            return "No relevant resume context found."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[Context {i}]\n{chunk['text']}\n")
        
        return "\n".join(context_parts)
    
    def generate_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
        top_k: Optional[int] = None
    ) -> str:
        """
        Generate response using RAG pipeline
        
        Args:
            query: User's question
            conversation_history: Previous messages (list of dicts with 'role' and 'content')
            top_k: Number of chunks to retrieve
            
        Returns:
            Generated response
        """
        # Retrieve relevant context
        chunks = self._retrieve_context(query, top_k)
        context_string = self._build_context_string(chunks)
        
        # Build messages for LLM
        messages = []
        
        # System message with instructions
        messages.append(SystemMessage(content=self.system_prompt))
        
        # Add conversation history if available
        if conversation_history:
            for msg in conversation_history:
                if msg['role'] == 'user':
                    messages.append(HumanMessage(content=msg['content']))
                elif msg['role'] == 'assistant':
                    messages.append(AIMessage(content=msg['content']))
        
        # Add current query with context
        user_message = f"""RESUME CONTEXT:
{context_string}

USER QUESTION: {query}

Please answer based ONLY on the resume context above. If the context doesn't contain the information, say so clearly."""
        
        messages.append(HumanMessage(content=user_message))
        
        # Generate response
        response = self.llm.invoke(messages)
        
        return response.content


# Singleton instance
_rag_pipeline: Optional[RAGPipeline] = None
_rag_config: Optional[RAGConfig] = None


def get_rag_pipeline() -> tuple[Optional[RAGPipeline], Optional[str]]:
    """
    Get or initialize the RAG pipeline singleton
    
    Returns:
        Tuple of (RAGPipeline instance, error_message)
    """
    global _rag_pipeline, _rag_config
    
    if _rag_pipeline is not None:
        return _rag_pipeline, None
    
    # Initialize config
    _rag_config = RAGConfig()
    is_valid, error = _rag_config.validate()
    
    if not is_valid:
        return None, error
    
    try:
        _rag_pipeline = RAGPipeline(_rag_config)
        return _rag_pipeline, None
    except Exception as e:
        return None, f"Failed to initialize RAG pipeline: {str(e)}"


def generate_rag_response(
    query: str,
    conversation_history: Optional[List[Dict]] = None,
    top_k: Optional[int] = None
) -> str:
    """
    Generate response using the RAG pipeline
    
    Args:
        query: User's question
        conversation_history: Previous conversation messages
        top_k: Number of context chunks to retrieve
        
    Returns:
        Generated response
        
    Raises:
        ValueError: If RAG pipeline is not configured
        Exception: If generation fails
    """
    pipeline, error = get_rag_pipeline()
    
    if error:
        raise ValueError(error)
    
    if not pipeline:
        raise Exception("RAG pipeline initialization failed")
    
    return pipeline.generate_response(query, conversation_history, top_k)
