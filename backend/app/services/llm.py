"""LLM service for generating AI-powered responses using LangChain"""

import os
import json
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Initialize LangChain ChatOpenAI model
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    max_tokens=500,
    api_key=os.getenv("OPENAI_API_KEY")
)


def build_system_prompt(portfolio_data: Dict[str, Any]) -> str:
    """
    Build the system prompt with persona and portfolio data.
    Enforces strict grounding to prevent hallucination.
    """
    portfolio_json = json.dumps(portfolio_data, indent=2)
    
    system_prompt = f"""You are Yazhini AI, speaking on behalf of Yazhini Elanchezhian, a skilled Application Engineer and Computer Science graduate student.

IDENTITY & TONE:
- You represent Yazhini in a friendly, professional manner
- You're enthusiastic about her work, projects, and technical skills
- Keep responses concise and recruiter-friendly (2-4 paragraphs max)

STRICT GROUNDING RULES:
- Answer ONLY using the portfolio data provided below
- Do NOT make up or infer information not present in the data
- If asked about something not in the portfolio, politely say you don't have that specific detail and suggest related topics you CAN discuss
- Focus on her projects (GeoAssist, ScholarBot), skills, experience at Accenture, and education

PORTFOLIO DATA:
{portfolio_json}

SCOPE:
- Answer questions about Yazhini's projects, skills, experience, education, and contact info
- If the user asks unrelated questions (weather, news, general knowledge), politely redirect them to ask about Yazhini's work
- Be helpful and informative while staying strictly within the portfolio data

Remember: You are here to help recruiters and visitors learn about Yazhini's qualifications and projects."""
    
    return system_prompt


def generate_reply(
    message: str,
    session_id: str,
    history: List[Dict[str, str]],
    portfolio_data: Dict[str, Any]
) -> str:
    """
    Generate an AI-powered reply using LangChain.
    
    Args:
        message: User's current message
        session_id: Session identifier (for logging/tracking)
        history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        portfolio_data: Yazhini's portfolio data dict
    
    Returns:
        AI-generated response as string
    """
    try:
        # Build system prompt with portfolio data
        system_prompt = build_system_prompt(portfolio_data)
        
        # Convert history to LangChain message format
        langchain_messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history (last 10 turns to keep context manageable)
        for msg in history[-20:]:  # Last 10 exchanges = 20 messages
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                langchain_messages.append(AIMessage(content=msg["content"]))
        
        # Add current user message
        langchain_messages.append(HumanMessage(content=message))
        
        # Invoke the LLM with LangChain
        response = llm.invoke(langchain_messages)
        
        # Extract and return the reply
        return response.content
        
    except Exception as e:
        # Log error and return graceful fallback
        print(f"Error calling LangChain LLM: {str(e)}")
        return "I apologize, but I'm having trouble generating a response right now. Please try again in a moment."
