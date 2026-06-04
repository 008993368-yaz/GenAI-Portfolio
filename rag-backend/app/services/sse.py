"""Server-Sent Events encoding for the streaming chat endpoint."""

import json
from typing import Dict


def sse_encode(envelope: Dict) -> str:
    """Serialize an event envelope dict to a single SSE record.

    Format: ``data: <json>\\n\\n``. ``ensure_ascii=False`` keeps unicode
    characters intact so the byte stream stays compact and readable.
    """
    return f"data: {json.dumps(envelope, ensure_ascii=False)}\n\n"
