"""
RAG Service
LangChain-based RAG pipeline: retrieval from Pinecone + OpenAI generation
"""

import logging
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.schema import HumanMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from openai import APIConnectionError, APITimeoutError, RateLimitError
from pydantic import BaseModel, Field
from tenacity import before_sleep_log, retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import config

from app.services.retriever import ResumeRetriever, RetrieverConfig


logger = logging.getLogger(__name__)

DEFAULT_SUGGESTION_FALLBACK = [
    "Can you tell me about your background?",
    "What kind of experience do you have?",
]


def _is_retryable_openai_exception(exc: BaseException) -> bool:
    """Return True for transient OpenAI/network errors that should be retried."""
    retryable_types = (
        APITimeoutError,
        APIConnectionError,
        RateLimitError,
        TimeoutError,
        ConnectionError,
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
        "503",
        "temporarily unavailable",
    ]
    return any(marker in error_text for marker in retry_markers)


RETRY_POLICY = retry(
    reraise=True,
    stop=stop_after_attempt(config.DEFAULT_RAG_RETRY_ATTEMPTS),
    wait=wait_exponential(
        multiplier=config.DEFAULT_RAG_RETRY_WAIT_MULTIPLIER,
        min=config.DEFAULT_RAG_RETRY_WAIT_MIN_SECONDS,
        max=config.DEFAULT_RAG_RETRY_WAIT_MAX_SECONDS,
    ),
    retry=retry_if_exception(_is_retryable_openai_exception),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)


class SuggestedQuestions(BaseModel):
    """Schema for suggested questions output"""
    questions: List[str] = Field(description=f"List of {config.DEFAULT_RAG_SUGGESTION_COUNT} suggested questions")


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
    
    def __init__(self, rag_config: RAGConfig):
        self.config = rag_config
        
        # Initialize retriever
        self.retriever_instance = ResumeRetriever(rag_config.retriever_config)
        self.retriever = self.retriever_instance.get_retriever(k=rag_config.rag_top_k)
        
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            model=rag_config.openai_model,
            openai_api_key=rag_config.openai_api_key,
            temperature=config.DEFAULT_RAG_TEMPERATURE,
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
        self.retrieval_chain = self._build_retrieval_chain(self.retriever)

    def _build_retrieval_chain(self, retriever):
        return create_retrieval_chain(
            retriever=retriever,
            combine_docs_chain=self.document_chain
        )

    @staticmethod
    def _convert_chat_history(conversation_history: Optional[List[Dict]]) -> List:
        chat_history = []
        if not conversation_history:
            return chat_history

        for message in conversation_history:
            role = message.get("role")
            content = message.get("content", "")
            if role == "user":
                chat_history.append(HumanMessage(content=content))
            elif role == "assistant":
                chat_history.append(AIMessage(content=content))
        return chat_history

    @staticmethod
    def _normalize_suggested_questions(questions: Any) -> List[str]:
        if isinstance(questions, dict) and "questions" in questions:
            candidate_questions = questions["questions"]
        elif isinstance(questions, list):
            candidate_questions = questions
        else:
            return []

        cleaned_questions = []
        for question in candidate_questions[:config.DEFAULT_RAG_SUGGESTION_COUNT]:
            if not isinstance(question, str):
                continue

            normalized_question = question.strip()
            normalized_question = normalized_question.lstrip("-• ")
            if normalized_question and normalized_question[0].isdigit():
                import re
                normalized_question = re.sub(r"^\d+[\.\)]\s*", "", normalized_question)

            word_count = len(normalized_question.split())
            if config.DEFAULT_SUGGESTION_WORD_COUNT_MIN <= word_count <= config.DEFAULT_SUGGESTION_WORD_COUNT_MAX:
                cleaned_questions.append(normalized_question)

        return cleaned_questions

    @RETRY_POLICY
    def _invoke_retrieval_chain_with_retry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke RAG chain with retries for transient OpenAI failures."""
        return self.retrieval_chain.invoke(payload)

    @RETRY_POLICY
    def _invoke_suggestion_chain_with_retry(self, chain, payload: Dict[str, Any]):
        """Invoke suggestion generation chain with retries for transient OpenAI failures."""
        return chain.invoke(payload)
    
    def generate_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
        top_k: Optional[int] = None,
        request_id: Optional[str] = None
    ) -> str:
        """
        Generate response using RAG pipeline
        
        Args:
            query: User's question
            conversation_history: Previous messages (list of dicts with 'role' and 'content')
            top_k: Number of chunks to retrieve (updates retriever if different)
            request_id: Request ID for tracing
            
        Returns:
            Generated response
        """
        import time
        req_id = request_id or "N/A"
        gen_start = time.perf_counter()
        
        # Update retriever k if specified
        if top_k is not None and top_k != self.config.rag_top_k:
            logger.debug("[%s] Updating retriever top_k from %d to %d", req_id, self.config.rag_top_k, top_k)
            self.retriever = self.retriever_instance.get_retriever(k=top_k)
            self.retrieval_chain = self._build_retrieval_chain(self.retriever)
        
        # Convert conversation history to LangChain message format
        chat_history = self._convert_chat_history(conversation_history)
        logger.debug("[%s] Converted %d messages to LangChain format", req_id, len(chat_history))
        
        # Invoke the retrieval chain
        try:
            retrieve_start = time.perf_counter()
            result = self._invoke_retrieval_chain_with_retry({
                "input": query,
                "chat_history": chat_history if chat_history else []
            })
            retrieve_ms = (time.perf_counter() - retrieve_start) * 1000
            
            answer = result["answer"]
            gen_ms = (time.perf_counter() - gen_start) * 1000
            logger.info(
                "[%s] Response generation completed in %.2f ms (retrieve=%.2f, answer_len=%d)",
                req_id,
                gen_ms,
                retrieve_ms,
                len(answer),
            )
            return answer
        except Exception as e:
            gen_ms = (time.perf_counter() - gen_start) * 1000
            logger.error(
                "[%s] Response generation failed after %.2f ms: %s",
                req_id,
                gen_ms,
                str(e),
                exc_info=True,
            )
            raise
    
    def generate_suggested_questions(
        self,
        last_user_message: Optional[str] = None,
        conversation_summary: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> List[str]:
        """
        Generate contextually relevant suggested questions using LangChain.

        Args:
            last_user_message: Most recent user message for context
            conversation_summary: Summary of the conversation so far
            request_id: Request ID for tracing

        Returns:
            List of suggested questions
        """
        import time

        req_id = request_id or "N/A"
        gen_start = time.perf_counter()
        fallback = DEFAULT_SUGGESTION_FALLBACK

        try:
            retrieval_query = (
                last_user_message or
                conversation_summary or
                "portfolio overview"
            )

            docs = self.retriever.invoke(retrieval_query)

            context_parts = []
            for i, doc in enumerate(docs[:config.DEFAULT_SUGGESTION_CONTEXT_DOC_LIMIT], 1):
                context_parts.append(f"[Context {i}]\n{doc.page_content}\n")
            context_string = "\n".join(context_parts) if context_parts else "No context available."

            parser = JsonOutputParser(pydantic_object=SuggestedQuestions)

            suggestion_prompt = ChatPromptTemplate.from_messages([
                (
                    "human",
                    f"""Based on the following resume context, generate EXACTLY {config.DEFAULT_RAG_SUGGESTION_COUNT} simple HR screening questions that a recruiter might ask a candidate.

RESUME CONTEXT:
{{context}}

REQUIREMENTS:
1. Questions should sound like typical HR interview questions (experience, background, skills overview)
2. Keep questions conversational and non-technical
3. Each question should be {config.DEFAULT_SUGGESTION_WORD_COUNT_MIN}-{config.DEFAULT_SUGGESTION_WORD_COUNT_MAX} words long
4. NO personal sensitive information (phone, address, age, etc.)
5. Questions should be broad and open-ended
6. Examples: "Tell me about yourself", "What's your background?", "Walk me through your experience"

{{format_instructions}}

Generate the {config.DEFAULT_RAG_SUGGESTION_COUNT} questions now:""",
                )
            ])

            chain = suggestion_prompt | self.llm | parser

            result = self._invoke_suggestion_chain_with_retry(chain, {
                "context": context_string,
                "format_instructions": parser.get_format_instructions(),
            })

            gen_ms = (time.perf_counter() - gen_start) * 1000
            logger.info("[%s] Suggestion generation completed in %.2f ms", req_id, gen_ms)

            cleaned = self._normalize_suggested_questions(result)
            candidate_count = len(result["questions"]) if isinstance(result, dict) and isinstance(result.get("questions"), list) else len(result) if isinstance(result, list) else 0

            logger.debug("[%s] Generated %d valid suggestions from %d candidates", req_id, len(cleaned), candidate_count)

            if len(cleaned) >= config.DEFAULT_RAG_SUGGESTION_COUNT:
                return cleaned[:config.DEFAULT_RAG_SUGGESTION_COUNT]
            if len(cleaned) == 1:
                return cleaned + [fallback[1]]

            logger.info("[%s] Could not generate valid suggestions, returning fallback", req_id)
            return fallback

        except Exception as e:
            gen_ms = (time.perf_counter() - gen_start) * 1000
            logger.error(
                "[%s] Suggestion generation failed after %.2f ms: %s",
                req_id,
                gen_ms,
                str(e),
                exc_info=True,
            )
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
    fallback_suggestions = DEFAULT_SUGGESTION_FALLBACK

    try:
        pipeline, error = get_rag_pipeline()

        if error or not pipeline:
            logger.warning("RAG pipeline unavailable for suggestions: %s", error)
            return fallback_suggestions

        return pipeline.generate_suggested_questions(last_user_message, conversation_summary)

    except Exception as e:
        logger.exception("Error generating suggestions: %s", str(e))
        return fallback_suggestions

