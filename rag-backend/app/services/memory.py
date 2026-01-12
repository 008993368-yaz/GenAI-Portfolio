"""
Session Memory Service
In-memory conversation history management per session
"""

from typing import Dict, List, Optional
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Message:
    """Represents a single message in conversation history"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for LangChain"""
        return {
            "role": self.role,
            "content": self.content
        }


class SessionMemory:
    """
    Manages conversation history for multiple sessions
    
    Stores the last N messages per session in memory.
    Thread-safe for basic operations (not production-ready for high concurrency).
    """
    
    def __init__(self, max_messages_per_session: int = 10):
        """
        Initialize session memory
        
        Args:
            max_messages_per_session: Maximum messages to keep per session
        """
        self.max_messages = max_messages_per_session
        # Use deque for efficient FIFO operations
        self._sessions: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_messages_per_session)
        )
    
    def add_message(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to session history
        
        Args:
            session_id: Unique session identifier
            role: "user" or "assistant"
            content: Message content
        """
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.utcnow()
        )
        self._sessions[session_id].append(message)
    
    def get_history(self, session_id: str) -> List[Message]:
        """
        Get conversation history for a session
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of messages in chronological order
        """
        return list(self._sessions.get(session_id, []))
    
    def get_history_for_llm(self, session_id: str) -> List[Dict]:
        """
        Get conversation history formatted for LLM context
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of message dicts with role and content
        """
        messages = self.get_history(session_id)
        return [msg.to_dict() for msg in messages]
    
    def clear_session(self, session_id: str) -> None:
        """
        Clear history for a specific session
        
        Args:
            session_id: Session to clear
        """
        if session_id in self._sessions:
            self._sessions[session_id].clear()
    
    def get_session_count(self) -> int:
        """Get number of active sessions"""
        return len(self._sessions)
    
    def get_message_count(self, session_id: str) -> int:
        """Get number of messages in a session"""
        return len(self._sessions.get(session_id, []))


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
        _memory = SessionMemory(max_messages_per_session=10)
    return _memory
