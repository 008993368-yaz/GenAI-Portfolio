"""
FastAPI RAG Backend
Portfolio chatbot backend with resume retrieval
"""

import logging
import time

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

from app.services.retriever import retrieve_resume_context
from app.services.guardrails import is_about_yazhini, get_off_topic_response
from app.services.memory import get_memory
from app.services.rag import generate_rag_response, generate_suggested_questions
from app.config import Config


def configure_logging() -> logging.Logger:
    """Configure structured logging to console and file."""
    root_logger = logging.getLogger()
    log_level = getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO)
    root_logger.setLevel(log_level)

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")

    if not root_logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        file_handler = logging.FileHandler(Config.LOG_FILE)
        file_handler.setFormatter(formatter)

        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)

    logger = logging.getLogger("portfolio_rag_backend")
    logger.setLevel(log_level)

    return logger


logger = configure_logging()

# Initialize FastAPI app
app = FastAPI(
    title="Portfolio RAG Backend",
    description="Semantic search over resume using Pinecone + LLaMA embeddings",
    version="1.0.0"
)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[Config.RATE_LIMIT_DEFAULT],
    headers_enabled=True,
    enabled=Config.RATE_LIMIT_ENABLED,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return a 429 response with rate limit headers."""
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
        },
    )

    current_limit = getattr(request.state, "view_rate_limit", None)
    if current_limit is not None:
        response = request.app.state.limiter._inject_headers(response, current_limit)
    else:
        response.headers["Retry-After"] = str(Config.RATE_LIMIT_RETRY_AFTER_SECONDS)

    logger.warning(
        "Rate limit exceeded for %s %s from %s",
        request.method,
        request.url.path,
        request.client.host if request.client else "unknown",
    )
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log request timing and final status for every API call."""
    start_time = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.exception(
            "Unhandled error for %s %s after %.2f ms",
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "%s %s -> %s in %.2f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


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
@limiter.limit(Config.CHAT_RATE_LIMIT)
async def chat(request: Request, payload: ChatRequest):
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
        if not is_about_yazhini(payload.message):
            # Off-topic - return redirect without calling Pinecone/OpenAI
            off_topic_reply = get_off_topic_response()
            
            # Still store in memory for context
            memory.add_message(payload.sessionId, "user", payload.message)
            memory.add_message(payload.sessionId, "assistant", off_topic_reply)
            
            return ChatResponse(reply=off_topic_reply)
        
        # On-topic - proceed with RAG pipeline
        
        # Get conversation history for context
        conversation_history = memory.get_history_for_llm(payload.sessionId)
        
        # Generate response using RAG
        reply = generate_rag_response(
            query=payload.message,
            conversation_history=conversation_history
        )
        
        # Store in memory
        memory.add_message(payload.sessionId, "user", payload.message)
        memory.add_message(payload.sessionId, "assistant", reply)
        
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
@limiter.limit(Config.SUGGESTIONS_RATE_LIMIT)
async def get_suggestions(request: Request, payload: SuggestionsRequest):
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
            last_user_message=payload.last_user_message,
            conversation_summary=payload.conversation_summary
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


@app.get("/metrics")
async def get_metrics():
    """Get system metrics (session management and embedding cache)"""
    from app.services.memory import get_memory
    from app.services.retriever import get_retriever
    
    session_memory = get_memory()
    session_metrics = session_memory.get_metrics() if session_memory else {}
    
    retriever, error = get_retriever()
    cache_metrics = retriever.get_cache_metrics() if retriever else {}
    
    return {
        "session_metrics": session_metrics,
        "embedding_cache_metrics": cache_metrics,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
