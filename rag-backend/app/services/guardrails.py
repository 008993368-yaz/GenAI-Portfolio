"""
Guardrails Service
Simple keyword-based filtering to keep conversations on-topic about Yazhini
"""

from typing import Set


# Keywords that indicate the user is asking about Yazhini
YAZHINI_KEYWORDS: Set[str] = {
    # Professional topics
    "experience", "work", "job", "role", "position", "career",
    "project", "projects", "built", "developed", "created",
    "skill", "skills", "technology", "technologies", "tech",
    "angular", "react", "frontend", "backend", "fullstack",
    "python", "javascript", "typescript", "java", "c#",
    "aws", "cloud", "azure", "docker", "kubernetes",
    "database", "sql", "mongodb", "api", "rest",
    "testing", "test", "unit", "integration", "jest", "jasmine",
    "agile", "scrum", "ci/cd", "devops",
    
    # Educational topics
    "education", "degree", "university", "college", "gpa",
    "csusb", "california", "bachelor", "masters",
    "course", "courses", "study", "studied",
    
    # Company names
    "accenture", "tcs", "cognizant", "infosys",
    
    # Resume-related
    "resume", "cv", "background", "qualification",
    "achievement", "accomplishment", "responsibility",
    
    # Personal/professional
    "portfolio", "you", "your", "yazhini", "elanchezhian",
    "tell me about", "what", "how", "when", "where", "why",
    "do you", "did you", "can you", "have you",
    
    # Common portfolio questions
    "who are you", "about yourself", "introduce",
    "contact", "email", "phone", "location", "hire",
}


def is_about_yazhini(message: str) -> bool:
    """
    Determine if a message is about Yazhini or relevant to portfolio questions
    
    Uses simple keyword matching to detect if the query is on-topic.
    This is intentionally permissive to avoid blocking legitimate questions.
    
    Args:
        message: User's message/query
        
    Returns:
        True if message appears to be about Yazhini's portfolio/resume
        False if clearly off-topic
    """
    if not message or len(message.strip()) < 3:
        return False
    
    message_lower = message.lower()
    
    # Check for any matching keywords
    for keyword in YAZHINI_KEYWORDS:
        if keyword in message_lower:
            return True
    
    # If message contains a question mark and "you/your", it's likely about Yazhini
    if "?" in message and ("you" in message_lower or "your" in message_lower):
        return True
    
    # Very short messages with question words are likely portfolio-related
    question_starters = ["what", "how", "when", "where", "why", "who", "can", "do", "did", "have"]
    first_word = message_lower.split()[0] if message_lower.split() else ""
    if first_word in question_starters:
        return True
    
    return False


def get_off_topic_response() -> str:
    """
    Get the standard response for off-topic queries
    
    Returns:
        Friendly redirect message
    """
    return (
        "That's outside my scope, but I'd love to tell you about my work. "
        "Ask me about my projects, skills, or experience."
    )
