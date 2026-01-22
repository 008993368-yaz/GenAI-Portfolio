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


def generate_suggested_questions(
    last_user_message: Optional[str] = None,
    conversation_summary: Optional[str] = None
) -> List[str]:
    """
    Generate 2 contextually relevant suggested questions about Yazhini's portfolio
    
    Args:
        last_user_message: Most recent user message for context
        conversation_summary: Summary of the conversation so far
        
    Returns:
        List of 2 suggested questions
        
    Raises:
        Exception: If generation fails (caller should handle with fallback)
    """
    # Default fallback suggestions
    fallback_suggestions = [
        "Can you tell me about your background?",
        "What kind of experience do you have?"
    ]
    
    try:
        pipeline, error = get_rag_pipeline()
        
        if error or not pipeline:
            print(f"RAG pipeline error for suggestions: {error}")
            return fallback_suggestions
        
        # Determine query for context retrieval
        retrieval_query = (
            last_user_message or 
            conversation_summary or 
            "portfolio overview"
        )
        
        # Retrieve 3-5 relevant resume chunks for context
        chunks = pipeline._retrieve_context(retrieval_query, top_k=4)
        context_string = pipeline._build_context_string(chunks)
        
        # Build prompt for generating suggestions
        suggestion_prompt = f"""Based on the following resume context, generate EXACTLY 2 simple HR screening questions that a recruiter might ask a candidate.

RESUME CONTEXT:
{context_string}

REQUIREMENTS:
1. Questions should sound like typical HR interview questions (experience, background, skills overview)
2. Keep questions conversational and non-technical
3. Each question should be 5-10 words long
4. NO personal sensitive information (phone, address, age, etc.)
5. Questions should be broad and open-ended
6. NO numbering or bullet points in the output
7. Examples: "Tell me about yourself", "What's your background?", "Walk me through your experience"

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings with exactly 2 questions. Example:
["Can you tell me about your background?", "What kind of experience do you have?"]

Generate the 2 questions now:"""
        
        # Generate suggestions using LLM
        messages = [HumanMessage(content=suggestion_prompt)]
        response = pipeline.llm.invoke(messages)
        
        # Parse JSON response
        import json
        import re
        
        response_text = response.content.strip()
        
        # Try to extract JSON array from response
        # Handle cases where model wraps response in markdown code blocks
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            suggestions = json.loads(json_str)
            
            # Validate and clean suggestions
            if isinstance(suggestions, list):
                # Clean each suggestion
                cleaned = []
                for s in suggestions:
                    if isinstance(s, str):
                        # Trim whitespace and remove numbering
                        s = s.strip()
                        s = re.sub(r'^\d+[\.\)]\s*', '', s)  # Remove "1. " or "1) "
                        s = re.sub(r'^[-•]\s*', '', s)  # Remove bullet points
                        
                        # Filter out too long items
                        if len(s) <= 120 and s:
                            cleaned.append(s)
                
                # Deduplicate while preserving order
                seen = set()
                deduplicated = []
                for s in cleaned:
                    s_lower = s.lower()
                    if s_lower not in seen:
                        seen.add(s_lower)
                        deduplicated.append(s)
                
                # Ensure exactly 2 items
                if len(deduplicated) >= 2:
                    return deduplicated[:2]
                else:
                    # Pad with fallback if needed
                    remaining = 2 - len(deduplicated)
                    return deduplicated + fallback_suggestions[:remaining]
        
        # If parsing failed, return fallback
        print(f"Failed to parse suggestions JSON: {response_text[:200]}")
        return fallback_suggestions
        
    except Exception as e:
        print(f"Error generating suggestions: {str(e)}")
        return fallback_suggestions

