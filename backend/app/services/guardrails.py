"""Guardrails module to validate questions are about Yazhini"""

# Keywords that indicate questions about Yazhini and her work
RELEVANT_KEYWORDS = [
    # Name variations
    "yazhini", "elanchezhian",
    
    # Professional topics
    "project", "projects", "geoassist", "scholarbot",
    "skill", "skills", "experience", "work", "job", "accenture",
    "education", "degree", "master", "bachelor", "university", "csusb", "sastra",
    
    # Technologies she works with
    "angular", "javascript", "python", "aws", "lambda", "docker",
    "langchain", "langgraph", "arcgis", "streamlit",
    "power bi", "power apps", "power automate",
    ".net", "azure", "cosmos",
    
    # Contact/location
    "contact", "email", "phone", "location", "redlands", "california",
    
    # General portfolio questions
    "portfolio", "about you", "tell me", "who are you", "background",
    "resume", "cv", "achievements", "accomplishments"
]

# Topics that are NOT relevant
IRRELEVANT_TOPICS = [
    "weather", "news", "politics", "sports", "recipe", "math", "homework",
    "write code", "debug", "fix", "calculate", "solve", "equation",
    "story", "joke", "game", "movie", "music", "celebrity"
]

FALLBACK_MESSAGE = "That's outside my scope, but I'd love to tell you about my work. Ask me about my projects, skills, or experience."


def is_about_yazhini(message: str) -> bool:
    """
    Check if the message is about Yazhini, her projects, skills, or experience.
    
    Returns True if relevant, False otherwise.
    """
    message_lower = message.lower()
    
    # First check for irrelevant topics - immediate rejection
    for topic in IRRELEVANT_TOPICS:
        if topic in message_lower:
            return False
    
    # Check for relevant keywords
    for keyword in RELEVANT_KEYWORDS:
        if keyword in message_lower:
            return True
    
    # If message is very short and conversational, allow it
    # (e.g., "hi", "hello", "thanks")
    if len(message.split()) <= 3 and any(
        greeting in message_lower 
        for greeting in ["hi", "hello", "hey", "thanks", "thank", "ok", "okay"]
    ):
        return True
    
    # Default to False for unrecognized topics
    return False


def get_fallback_response() -> str:
    """Return the fallback message for irrelevant questions"""
    return FALLBACK_MESSAGE
