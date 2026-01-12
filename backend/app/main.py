import os
from typing import Dict, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.data.portfolio_data import PORTFOLIO_DATA
from app.services.guardrails import is_about_yazhini, get_fallback_response
from app.services.llm import generate_reply

app = FastAPI()

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend container
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (last 10 turns per session)
# Format: {session_id: [{"role": "user/assistant", "content": "..."}]}
session_history: Dict[str, List[Dict[str, str]]] = {}
MAX_HISTORY_PER_SESSION = 20  # 10 exchanges = 20 messages


class ChatRequest(BaseModel):
    sessionId: str
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Chat endpoint with guardrails and LLM-powered responses.
    Applies guardrails first, then uses OpenAI for intelligent replies.
    """
    # Check if OpenAI API key is configured
    if not os.getenv("OPENAI_API_KEY"):
        return ChatResponse(
            reply="OPENAI_API_KEY is not set on the backend."
        )
    
    # Apply guardrails - reject off-topic questions immediately
    if not is_about_yazhini(request.message):
        return ChatResponse(reply=get_fallback_response())
    
    # Get or initialize session history
    if request.sessionId not in session_history:
        session_history[request.sessionId] = []
    
    history = session_history[request.sessionId]
    
    # Generate LLM-powered response
    reply = generate_reply(
        message=request.message,
        session_id=request.sessionId,
        history=history,
        portfolio_data=PORTFOLIO_DATA
    )
    
    # Update session history
    history.append({"role": "user", "content": request.message})
    history.append({"role": "assistant", "content": reply})
    
    # Keep only last MAX_HISTORY_PER_SESSION messages
    if len(history) > MAX_HISTORY_PER_SESSION:
        session_history[request.sessionId] = history[-MAX_HISTORY_PER_SESSION:]
    
    return ChatResponse(reply=reply)
