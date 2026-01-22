"""
RAG Service
LangChain-based RAG pipeline: retrieval from Pinecone + OpenAI generation
"""

from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.schema import HumanMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from app.config import config

from app.services.retriever import ResumeRetriever, RetrieverConfig


class SuggestedQuestions(BaseModel):
    """Schema for suggested questions output"""
    questions: List[str] = Field(description="List of 2 suggested questions")


class RAGConfig:
    """Configuration for RAG pipeline"""
    
    def __init__(self):
        # Pinecone/Retriever settings (delegated to RetrieverConfig)
        self.retriever_config = RetrieverConfig()
        self.rag_top_k = config.RAG_TOP_K
        
        # OpenAI settings
        self.openai_api_key = config.OPENAI_API_KEY
        self.openai_model = config.OPENAI_MODEL
        
    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate required environment variables"""
        # Validate retriever config
        is_valid, error = self.retriever_config.validate()
        if not is_valid:
            return False, error
        
        if not self.openai_api_key:
            return False, "OPENAI_API_KEY is required"
        return True, None


class RAGPipeline:
    """Complete RAG pipeline with LangChain retrieval and generation"""
    
    # System prompt defining Yazhini's persona
    SYSTEM_PROMPT = """You are Yazhini Elanchezhian's portfolio assistant, a friendly and professional AI that helps visitors learn about Yazhini's background, skills, and experience.

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
    
    def __init__(self, config: RAGConfig):
        self.config = config
        
        # Initialize retriever
        self.retriever_instance = ResumeRetriever(config.retriever_config)
        self.retriever = self.retriever_instance.get_retriever(k=config.rag_top_k)
        
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            model=config.openai_model,
            openai_api_key=config.openai_api_key,
            temperature=0.7,
        )
        
        # Create prompt template for RAG
        self.qa_prompt = ChatPromptTemplate.from_messages([
            ("system", self.SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", """RESUME CONTEXT:
{context}

USER QUESTION: {input}

Please answer based ONLY on the resume context above. If the context doesn't contain the information, say so clearly.""")
        ])
        
        # Create document chain
        self.document_chain = create_stuff_documents_chain(
            llm=self.llm,
            prompt=self.qa_prompt
        )
        
        # Create retrieval chain
        self.retrieval_chain = create_retrieval_chain(
            retriever=self.retriever,
            combine_docs_chain=self.document_chain
        )
    
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
            top_k: Number of chunks to retrieve (updates retriever if different)
            
        Returns:
            Generated response
        """
        # Update retriever k if specified
        if top_k is not None and top_k != self.config.rag_top_k:
            self.retriever = self.retriever_instance.get_retriever(k=top_k)
            self.retrieval_chain = create_retrieval_chain(
                retriever=self.retriever,
                combine_docs_chain=self.document_chain
            )
        
        # Convert conversation history to LangChain message format
        chat_history = []
        if conversation_history:
            for msg in conversation_history:
                if msg['role'] == 'user':
                    chat_history.append(HumanMessage(content=msg['content']))
                elif msg['role'] == 'assistant':
                    chat_history.append(AIMessage(content=msg['content']))
        
        # Invoke the retrieval chain
        result = self.retrieval_chain.invoke({
            "input": query,
            "chat_history": chat_history if chat_history else []
        })
        
        return result["answer"]
    
    def generate_suggested_questions(
        self,
        last_user_message: Optional[str] = None,
        conversation_summary: Optional[str] = None
    ) -> List[str]:
        """
        Generate 2 contextually relevant suggested questions using LangChain
        
        Args:
            last_user_message: Most recent user message for context
            conversation_summary: Summary of the conversation so far
            
        Returns:
            List of 2 suggested questions
        """
        # Default fallback suggestions
        fallback = [
            "Can you tell me about your background?",
            "What kind of experience do you have?"
        ]
        
        try:
            # Determine query for context retrieval
            retrieval_query = (
                last_user_message or 
                conversation_summary or 
                "portfolio overview"
            )
            
            # Retrieve context using the retriever
            docs = self.retriever.invoke(retrieval_query)
            
            # Build context string
            context_parts = []
            for i, doc in enumerate(docs[:4], 1):
                context_parts.append(f"[Context {i}]\n{doc.page_content}\n")
            context_string = "\n".join(context_parts) if context_parts else "No context available."
            
            # Create output parser
            parser = JsonOutputParser(pydantic_object=SuggestedQuestions)
            
            # Create prompt template for suggestions
            suggestion_prompt = ChatPromptTemplate.from_messages([
                ("human", """Based on the following resume context, generate EXACTLY 2 simple HR screening questions that a recruiter might ask a candidate.

RESUME CONTEXT:
{context}

REQUIREMENTS:
1. Questions should sound like typical HR interview questions (experience, background, skills overview)
2. Keep questions conversational and non-technical
3. Each question should be 5-10 words long
4. NO personal sensitive information (phone, address, age, etc.)
5. Questions should be broad and open-ended
6. Examples: "Tell me about yourself", "What's your background?", "Walk me through your experience"

{format_instructions}

Generate the 2 questions now:""")
            ])
            
            # Create chain with output parser
            chain = suggestion_prompt | self.llm | parser
            
            # Generate suggestions
            result = chain.invoke({
                "context": context_string,
                "format_instructions": parser.get_format_instructions()
            })
            
            # Extract and validate questions
            if isinstance(result, dict) and "questions" in result:
                questions = result["questions"]
            elif isinstance(result, list):
                questions = result
            else:
                return fallback
            
            # Clean and validate
            cleaned = []
            for q in questions[:2]:  # Take only first 2
                if isinstance(q, str) and 5 <= len(q) <= 120:
                    # Remove numbering and bullets
                    import re
                    q = re.sub(r'^\d+[\.\)]\s*', '', q.strip())
                    q = re.sub(r'^[-•]\s*', '', q)
                    if q:
                        cleaned.append(q)
            
            # Return cleaned or fallback
            if len(cleaned) >= 2:
                return cleaned[:2]
            elif len(cleaned) == 1:
                return cleaned + [fallback[1]]
            else:
                return fallback
                
        except Exception as e:
            print(f"Error generating suggestions: {str(e)}")
            return fallback


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
    fallback_suggestions = [
        "Can you tell me about your background?",
        "What kind of experience do you have?"
    ]
    
    try:
        pipeline, error = get_rag_pipeline()
        
        if error or not pipeline:
            print(f"RAG pipeline error for suggestions: {error}")
            return fallback_suggestions
        
        return pipeline.generate_suggested_questions(last_user_message, conversation_summary)
        
    except Exception as e:
        print(f"Error generating suggestions: {str(e)}")
        return fallback_suggestions

