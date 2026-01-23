"""
FastAPI RAG Backend
Portfolio chatbot backend with resume retrieval
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from app.services.retriever import retrieve_resume_context
from app.services.guardrails import is_about_yazhini, get_off_topic_response
from app.services.memory import get_memory
from app.services.rag import generate_rag_response, generate_suggested_questions
from app.config import Config

# Initialize FastAPI app
app = FastAPI(
    title="Portfolio RAG Backend",
    description="Semantic search over resume using Pinecone + LLaMA embeddings",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class ChatRequest(BaseModel):
    sessionId: str = Field(..., description="Unique session identifier")
    message: str = Field(..., description="User message", min_length=1)


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant's response")


class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query", min_length=1)
    top_k: int = Field(5, description="Number of results to return", ge=1, le=20)


class Match(BaseModel):
    id: str
    score: float
    text: str
    metadata: Dict[str, Any]


class SearchResponse(BaseModel):
    query: str
    matches: List[Match]
    count: int


class ErrorResponse(BaseModel):
    error: str
    detail: str


class SuggestionsRequest(BaseModel):
    last_user_message: str | None = Field(None, description="Last user message for context")
    conversation_summary: str | None = Field(None, description="Summary of conversation")


class SuggestionsResponse(BaseModel):
    suggestions: List[str] = Field(..., description="List of suggested questions")


# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Portfolio RAG Backend",
        "version": "1.0.0"
    }


# Chat endpoint - main RAG pipeline
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Yazhini's portfolio assistant
    
    Uses guardrails, retrieval, and generation pipeline:
    1. Check if message is on-topic (guardrails)
    2. If off-topic, return standard redirect (no API calls)
    3. If on-topic, retrieve context from Pinecone
    4. Generate response using OpenAI with context
    5. Store conversation in session memory
    
    Args:
        request: ChatRequest with sessionId and message
        
    Returns:
        ChatResponse with assistant's reply
        
    Raises:
        HTTPException: If RAG pipeline fails
    """
    try:
        # Get session memory
        memory = get_memory()
        
        # Guardrail check - is this about Yazhini?
        if not is_about_yazhini(request.message):
            # Off-topic - return redirect without calling Pinecone/OpenAI
            off_topic_reply = get_off_topic_response()
            
            # Still store in memory for context
            memory.add_message(request.sessionId, "user", request.message)
            memory.add_message(request.sessionId, "assistant", off_topic_reply)
            
            return ChatResponse(reply=off_topic_reply)
        
        # On-topic - proceed with RAG pipeline
        
        # Get conversation history for context
        conversation_history = memory.get_history_for_llm(request.sessionId)
        
        # Generate response using RAG
        reply = generate_rag_response(
            query=request.message,
            conversation_history=conversation_history
        )
        
        # Store in memory
        memory.add_message(request.sessionId, "user", request.message)
        memory.add_message(request.sessionId, "assistant", reply)
        
        return ChatResponse(reply=reply)
        
    except ValueError as e:
        # Configuration error
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Configuration Error",
                "detail": str(e)
            }
        )
    except Exception as e:
        # Other errors
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Chat Error",
                "detail": f"Failed to generate response: {str(e)}"
            }
        )


# RAG search endpoint (debug - no LLM)
@app.post("/rag/search", response_model=SearchResponse)
async def search_resume(request: SearchRequest):
    """
    Semantic search over resume chunks
    
    This is a debug endpoint that returns raw retrieval results without LLM processing.
    
    Args:
        request: SearchRequest containing query and top_k
        
    Returns:
        SearchResponse with matched chunks
        
    Raises:
        HTTPException: If Pinecone is not configured or search fails
    """
    try:
        # Retrieve relevant context
        matches = retrieve_resume_context(
            query=request.query,
            top_k=request.top_k
        )
        
        return SearchResponse(
            query=request.query,
            matches=matches,
            count=len(matches)
        )
        
    except ValueError as e:
        # Configuration error (missing env vars)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Configuration Error",
                "detail": str(e)
            }
        )
    except Exception as e:
        # Other errors (Pinecone API, network, etc.)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Search Error",
                "detail": f"Failed to search resume: {str(e)}"
            }
        )


# Suggestions endpoint
@app.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(request: SuggestionsRequest):
    """
    Generate suggested questions for the chatbot
    
    Uses RAG retrieval to get relevant context, then generates
    contextually relevant questions about Yazhini's portfolio.
    
    Args:
        request: SuggestionsRequest with optional last_user_message and conversation_summary
        
    Returns:
        SuggestionsResponse with 2 suggested questions
        
    Raises:
        HTTPException: If generation fails
    """
    try:
        # Generate suggestions using RAG service
        suggestions = generate_suggested_questions(
            last_user_message=request.last_user_message,
            conversation_summary=request.conversation_summary
        )
        
        return SuggestionsResponse(suggestions=suggestions)
        
    except Exception as e:
        # Log error but don't expose details to client
        print(f"Suggestions generation error: {str(e)}")
        
        # Return fallback suggestions on any error
        fallback_suggestions = [
            "Can you tell me about your background?",
            "What kind of experience do you have?"
        ]
        
        return SuggestionsResponse(suggestions=fallback_suggestions)


# Additional info endpoint
@app.get("/info")
async def get_info():
    """Get backend configuration info (non-sensitive)"""
    from app.config import config
    
    return {
        "pinecone_configured": bool(config.PINECONE_API_KEY),
        "index_name": config.PINECONE_INDEX_NAME or "not_set",
        "namespace": config.PINECONE_NAMESPACE,
        "embed_model": config.PINECONE_EMBED_MODEL,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
