"""
Session Memory Service
LangChain-based conversation history management per session
"""

import logging
import threading
import time
from typing import Dict, List, Optional
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import HumanMessage, AIMessage, BaseMessage

from app.config import config


logger = logging.getLogger(__name__)


class SessionMemory:
    """
    Manages LangChain conversation memory for multiple sessions
    
    Uses ConversationBufferWindowMemory to store the last N messages per session.
    Each session has its own independent memory instance.
    """
    
    def __init__(
        self,
        max_messages_per_session: int = config.DEFAULT_SESSION_MAX_MESSAGES_PER_SESSION,
        session_ttl_seconds: int = config.DEFAULT_SESSION_TTL_SECONDS,
        cleanup_interval_seconds: int = config.DEFAULT_SESSION_CLEANUP_INTERVAL_SECONDS,
    ):
        """
        Initialize session memory manager
        
        Args:
            max_messages_per_session: Maximum message pairs (user+AI) to keep per session
            session_ttl_seconds: Session time to live in seconds
            cleanup_interval_seconds: Interval between cleanup sweeps in seconds
        """
        # Convert to message window size based on the configured user+assistant exchange size.
        self.k = max(1, max_messages_per_session // config.DEFAULT_MESSAGES_PER_EXCHANGE)
        self._session_ttl_seconds = max(1, session_ttl_seconds)
        self._cleanup_interval_seconds = max(1, cleanup_interval_seconds)

        self._sessions: Dict[str, ConversationBufferWindowMemory] = {}
        self._last_access_by_session: Dict[str, float] = {}
        self._lock = threading.RLock()

        self._cleanup_count = 0
        self._cleanup_runs = 0

        self._stop_event = threading.Event()
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            name="session-memory-cleanup",
            daemon=True,
        )
        self._cleanup_thread.start()
        logger.info(
            "SessionMemory initialized (ttl=%ss, cleanup_interval=%ss)",
            self._session_ttl_seconds,
            self._cleanup_interval_seconds,
        )

    def _create_memory(self) -> ConversationBufferWindowMemory:
        return ConversationBufferWindowMemory(
            k=self.k,
            return_messages=True,
            memory_key="chat_history",
        )

    def _touch_session(self, session_id: str, now: Optional[float] = None) -> None:
        self._last_access_by_session[session_id] = now if now is not None else time.time()

    def _get_or_create_session_memory(self, session_id: str) -> ConversationBufferWindowMemory:
        memory = self._sessions.get(session_id)
        if memory is None:
            memory = self._create_memory()
            self._sessions[session_id] = memory
            logger.info(
                "Session created: id=%s, total_active_sessions=%d",
                session_id,
                len(self._sessions),
            )
        else:
            logger.debug("Session accessed: id=%s", session_id)

        self._touch_session(session_id)
        return memory

    def _cleanup_loop(self) -> None:
        while not self._stop_event.wait(self._cleanup_interval_seconds):
            removed_count = self.cleanup_expired_sessions()
            self._cleanup_runs += 1
            if removed_count > 0:
                logger.info(
                    "Cleanup sweep: removed=%d, active_sessions=%d, total_cleanup_runs=%d",
                    removed_count,
                    self.get_session_count(),
                    self._cleanup_runs,
                )
            else:
                logger.debug(
                    "Cleanup sweep: no expired sessions (active=%d, total_runs=%d)",
                    self.get_session_count(),
                    self._cleanup_runs,
                )

    def cleanup_expired_sessions(self) -> int:
        """Remove sessions that exceed the TTL threshold."""
        now = time.time()

        with self._lock:
            self._cleanup_runs += 1
            expired_session_ids = [
                session_id
                for session_id, last_access in self._last_access_by_session.items()
                if now - last_access >= self._session_ttl_seconds
            ]

            for session_id in expired_session_ids:
                self._sessions.pop(session_id, None)
                self._last_access_by_session.pop(session_id, None)

            removed_count = len(expired_session_ids)
            self._cleanup_count += removed_count
            return removed_count
    
    def add_message(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to session history
        
        Args:
            session_id: Unique session identifier
            role: "user" or "assistant"
            content: Message content
        """
        with self._lock:
            memory = self._get_or_create_session_memory(session_id)

            if role == "user":
                # Save user input
                memory.chat_memory.add_user_message(content)
            elif role == "assistant":
                # Save AI response
                memory.chat_memory.add_ai_message(content)
            else:
                logger.warning("Unsupported message role '%s' for session %s", role, session_id)
                return

            logger.info("Added %s message for session %s", role, session_id)
    
    def get_history(self, session_id: str) -> List[BaseMessage]:
        """
        Get conversation history for a session as LangChain messages
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of BaseMessage objects (HumanMessage, AIMessage)
        """
        with self._lock:
            if session_id not in self._sessions:
                return []

            self._touch_session(session_id)
            memory = self._sessions[session_id]
            return list(memory.chat_memory.messages)
    
    def get_history_for_llm(self, session_id: str) -> List[Dict]:
        """
        Get conversation history formatted as dictionaries for LLM context
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of message dicts with 'role' and 'content' keys
        """
        messages = self.get_history(session_id)
        formatted = []
        
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted.append({"role": "assistant", "content": msg.content})
        
        return formatted
    
    def get_memory(self, session_id: str) -> ConversationBufferWindowMemory:
        """
        Get the LangChain memory instance for a session
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            ConversationBufferWindowMemory instance
        """
        with self._lock:
            return self._get_or_create_session_memory(session_id)
    
    def clear_session(self, session_id: str) -> None:
        """
        Clear history for a specific session
        
        Args:
            session_id: Session to clear
        """
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].clear()
                self._sessions.pop(session_id, None)
                self._last_access_by_session.pop(session_id, None)
                logger.info("Cleared session memory: %s", session_id)
    
    def get_session_count(self) -> int:
        """Get number of active sessions"""
        with self._lock:
            return len(self._sessions)

    def get_cleanup_count(self) -> int:
        """Get total number of sessions removed by the TTL sweeper."""
        with self._lock:
            return self._cleanup_count

    def get_cleanup_runs(self) -> int:
        """Get total number of cleanup sweeps executed."""
        with self._lock:
            return self._cleanup_runs

    def get_metrics(self) -> Dict[str, int]:
        """Get thread-safe session memory metrics."""
        with self._lock:
            return {
                "active_sessions": len(self._sessions),
                "cleanup_count": self._cleanup_count,
                "cleanup_runs": self._cleanup_runs,
                "session_ttl_seconds": self._session_ttl_seconds,
                "cleanup_interval_seconds": self._cleanup_interval_seconds,
            }
    
    def get_message_count(self, session_id: str) -> int:
        """Get number of messages in a session"""
        with self._lock:
            if session_id not in self._sessions:
                return 0

            self._touch_session(session_id)
            return len(self._sessions[session_id].chat_memory.messages)


# Global singleton instance
_memory: Optional[SessionMemory] = None


def get_memory() -> SessionMemory:
    """
    Get or create the global session memory instance
    
    Returns:
        SessionMemory singleton
    """
    global _memory
    if _memory is None:
        _memory = SessionMemory(
            max_messages_per_session=config.DEFAULT_SESSION_MAX_MESSAGES_PER_SESSION,
            session_ttl_seconds=config.SESSION_TTL,
            cleanup_interval_seconds=config.SESSION_CLEANUP_INTERVAL,
        )
    return _memory
