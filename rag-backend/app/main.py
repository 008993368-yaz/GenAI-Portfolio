"""
FastAPI RAG Backend
Portfolio chatbot backend with resume retrieval
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse, Response

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


def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if not request_id:
        request_id = uuid.uuid4().hex
        request.state.request_id = request_id
    return request_id


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _status_phrase(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Error"


def _extract_error_message(detail: Any) -> str:
    if isinstance(detail, dict):
        return str(detail.get("detail") or detail.get("error") or detail)
    if isinstance(detail, list):
        return "; ".join(str(item) for item in detail)
    if detail is None:
        return ""
    return str(detail)


def _attach_request_id_header(response: Response, request_id: str) -> Response:
    """Attach the request identifier to the outbound response headers."""
    response.headers["X-Request-ID"] = request_id
    return response


def _build_error_response(request: Request, status_code: int, error: str, detail: str) -> JSONResponse:
    request_id = _get_request_id(request)
    payload = ErrorResponse(
        error=error,
        detail=detail,
        timestamp=_utc_timestamp(),
        request_id=request_id,
    )
    response = JSONResponse(status_code=status_code, content=payload.model_dump())
    return _attach_request_id_header(response, request_id)

# Prometheus metrics
REQUEST_COUNT = Counter(
    "portfolio_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_DURATION_SECONDS = Histogram(
    "portfolio_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)

ERROR_COUNT = Counter(
    "portfolio_errors_total",
    "Total number of errors by type",
    ["endpoint", "error_type"],
)

ACTIVE_SESSIONS = Gauge(
    "portfolio_active_sessions",
    "Current number of active chat sessions",
)

EMBEDDING_CACHE_HIT_RATE = Gauge(
    "portfolio_embedding_cache_hit_rate_percent",
    "Embedding cache hit rate as a percentage",
)

EMBEDDING_CACHE_SIZE = Gauge(
    "portfolio_embedding_cache_size",
    "Current number of entries in embedding cache",
)


def _update_runtime_gauges() -> None:
    """Update Prometheus gauges sourced from memory and retriever services."""
    try:
        session_memory = get_memory()
        ACTIVE_SESSIONS.set(session_memory.get_session_count())
    except Exception:
        logger.exception("Failed to update active session gauge")

    try:
        from app.services.retriever import get_retriever

        retriever, _ = get_retriever()
        if retriever:
            cache_metrics = retriever.get_cache_metrics()
            EMBEDDING_CACHE_HIT_RATE.set(cache_metrics.get("hit_rate_percent", 0))
            EMBEDDING_CACHE_SIZE.set(cache_metrics.get("size", 0))
    except Exception:
        logger.exception("Failed to update embedding cache gauges")

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
    request_id = _get_request_id(request)
    response = _build_error_response(
        request=request,
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        error="Rate Limit Exceeded",
        detail=str(exc.detail) if Config.DEBUG else "Too many requests. Please try again later.",
    )

    current_limit = getattr(request.state, "view_rate_limit", None)
    if current_limit is not None:
        response = request.app.state.limiter._inject_headers(response, current_limit)
    else:
        response.headers["Retry-After"] = str(Config.RATE_LIMIT_RETRY_AFTER_SECONDS)

    logger.warning(
        "[%s] Rate limit exceeded for %s %s from %s",
        request_id,
        request.method,
        request.url.path,
        request.client.host if request.client else "unknown",
    )
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = _get_request_id(request)
    status_code = exc.status_code
    error = _status_phrase(status_code)
    if isinstance(exc.detail, dict):
        error = str(exc.detail.get("error") or error)

    if status_code >= 500 and not Config.DEBUG:
        detail = "An unexpected server error occurred."
    else:
        detail = _extract_error_message(exc.detail) or error

    log_level = logging.ERROR if status_code >= 500 else logging.WARNING
    logger.log(
        log_level,
        "[%s] HTTPException for %s %s -> %d: %s",
        request_id,
        request.method,
        request.url.path,
        status_code,
        detail,
    )
    if status_code >= 500:
        logger.debug("[%s] HTTPException raw detail: %r", request_id, exc.detail)

    return _build_error_response(request, status_code, error, detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = _get_request_id(request)
    detail = "; ".join(error.get("msg", "Invalid request") for error in exc.errors())
    if not Config.DEBUG:
        detail = "Request validation failed."

    logger.warning(
        "[%s] Validation error for %s %s: %s",
        request_id,
        request.method,
        request.url.path,
        exc.errors(),
    )
    return _build_error_response(
        request,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "Validation Error",
        detail,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = _get_request_id(request)
    detail = str(exc) if Config.DEBUG else "An unexpected server error occurred."

    logger.exception(
        "[%s] Unhandled exception for %s %s from %s",
        request_id,
        request.method,
        request.url.path,
        request.client.host if request.client else "unknown",
    )
    return _build_error_response(
        request,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Internal Server Error",
        detail,
    )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log request timing and final status, and propagate the same request ID on every response."""
    start_time = time.perf_counter()
    request_id = uuid.uuid4().hex
    request.state.request_id = request_id
    endpoint = request.url.path

    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        elapsed_seconds = elapsed_ms / 1000

        REQUEST_DURATION_SECONDS.labels(method=request.method, endpoint=endpoint).observe(elapsed_seconds)
        REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status_code="500").inc()
        ERROR_COUNT.labels(endpoint=endpoint, error_type="unhandled_exception").inc()
        _update_runtime_gauges()

        logger.exception(
            "[%s] Unhandled error for %s %s after %.2f ms from %s",
            request_id,
            request.method,
            endpoint,
            elapsed_ms,
            request.client.host if request.client else "unknown",
        )
        raise

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    elapsed_seconds = elapsed_ms / 1000

    REQUEST_DURATION_SECONDS.labels(method=request.method, endpoint=endpoint).observe(elapsed_seconds)
    REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status_code=str(response.status_code)).inc()

    if response.status_code >= 500:
        ERROR_COUNT.labels(endpoint=endpoint, error_type="http_5xx").inc()
    elif response.status_code >= 400:
        ERROR_COUNT.labels(endpoint=endpoint, error_type="http_4xx").inc()

    _update_runtime_gauges()
    
    # Log at different levels based on status code
    if response.status_code >= 500:
        log_level = logging.ERROR
    elif response.status_code >= 400:
        log_level = logging.WARNING
    else:
        log_level = logging.INFO
    
    logger.log(
        log_level,
        "[%s] %s %s -> %s in %.2f ms",
        request_id,
        request.method,
        endpoint,
        response.status_code,
        elapsed_ms,
    )
    return _attach_request_id_header(response, request_id)


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
    timestamp: str
    request_id: str


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
        ERROR_COUNT.labels(endpoint="/chat", error_type="configuration_error").inc()
        raise HTTPException(
            status_code=500,
            detail="Configuration error while processing chat request."
        )
    except Exception as e:
        # Other errors
        ERROR_COUNT.labels(endpoint="/chat", error_type="chat_error").inc()
        raise HTTPException(
            status_code=500,
            detail="Failed to generate chat response."
        )


# RAG search endpoint (debug - no LLM)
@app.post("/rag/search", response_model=SearchResponse)
async def search_resume(request: Request, search_req: SearchRequest):
    """
    Semantic search over resume chunks
    
    This is a debug endpoint that returns raw retrieval results without LLM processing.
    
    Args:
        request: FastAPI Request object
        search_req: SearchRequest containing query and top_k
        
    Returns:
        SearchResponse with matched chunks
        
    Raises:
        HTTPException: If Pinecone is not configured or search fails
    """
    request_id = request.state.request_id
    start_time = time.perf_counter()
    query_len = len(search_req.query)
    
    try:
        logger.info(
            "[%s] Search request: query_len=%d, top_k=%d",
            request_id,
            query_len,
            search_req.top_k,
        )
        
        # Retrieve relevant context
        search_start = time.perf_counter()
        matches = retrieve_resume_context(
            query=search_req.query,
            top_k=search_req.top_k,
            request_id=request_id,
        )
        search_ms = (time.perf_counter() - search_start) * 1000
        logger.info(
            "[%s] Retrieval completed in %.2f ms (matches=%d)",
            request_id,
            search_ms,
            len(matches),
        )
        
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info("[%s] Search response completed in %.2f ms", request_id, elapsed_ms)
        
        return SearchResponse(
            query=search_req.query,
            matches=matches,
            count=len(matches)
        )
        
    except ValueError as e:
        # Configuration error (missing env vars)
        ERROR_COUNT.labels(endpoint="/rag/search", error_type="configuration_error").inc()
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "[%s] Configuration error after %.2f ms: %s",
            request_id,
            elapsed_ms,
            str(e),
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="Configuration error while searching resume data."
        )
    except Exception as e:
        # Other errors (Pinecone API, network, etc.)
        ERROR_COUNT.labels(endpoint="/rag/search", error_type="search_error").inc()
        raise HTTPException(
            status_code=500,
            detail="Failed to search resume."
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
    # Generate suggestions using RAG service. The service already returns a fallback list
    # if generation fails, so this endpoint can remain a simple successful response.
    suggestions = generate_suggested_questions(
        last_user_message=payload.last_user_message,
        conversation_summary=payload.conversation_summary
    )

    return SuggestionsResponse(suggestions=suggestions)


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
async def get_prometheus_metrics():
    """Expose Prometheus metrics for scraping."""
    _update_runtime_gauges()
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/metrics/json")
async def get_metrics_json():
    """Get system metrics (session management and embedding cache) in JSON format."""
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
