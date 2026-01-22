"""
Session Memory Service
LangChain-based conversation history management per session
"""

from typing import Dict, List, Optional
from collections import defaultdict
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import HumanMessage, AIMessage, BaseMessage


class SessionMemory:
    """
    Manages LangChain conversation memory for multiple sessions
    
    Uses ConversationBufferWindowMemory to store the last N messages per session.
    Each session has its own independent memory instance.
    """
    
    def __init__(self, max_messages_per_session: int = 10):
        """
        Initialize session memory manager
        
        Args:
            max_messages_per_session: Maximum message pairs (user+AI) to keep per session
        """
        # Convert to message window size (divide by 2 since each exchange is user+AI)
        self.k = max(1, max_messages_per_session // 2)
        self._sessions: Dict[str, ConversationBufferWindowMemory] = defaultdict(
            lambda: ConversationBufferWindowMemory(
                k=self.k,
                return_messages=True,
                memory_key="chat_history"
            )
        )
    
    def add_message(self, session_id: str, role: str, content: str) -> None:
        """
        Add a message to session history
        
        Args:
            session_id: Unique session identifier
            role: "user" or "assistant"
            content: Message content
        """
        memory = self._sessions[session_id]
        
        if role == "user":
            # Save user input
            memory.chat_memory.add_user_message(content)
        elif role == "assistant":
            # Save AI response
            memory.chat_memory.add_ai_message(content)
    
    def get_history(self, session_id: str) -> List[BaseMessage]:
        """
        Get conversation history for a session as LangChain messages
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            List of BaseMessage objects (HumanMessage, AIMessage)
        """
        if session_id not in self._sessions:
            return []
        
        memory = self._sessions[session_id]
        return memory.chat_memory.messages
    
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
        return self._sessions[session_id]
    
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
        if session_id not in self._sessions:
            return 0
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
        _memory = SessionMemory(max_messages_per_session=10)
    return _memory
