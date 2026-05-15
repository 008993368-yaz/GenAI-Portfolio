"""Vercel FastAPI entrypoint.

Vercel discovers Python functions from the `api/` directory. Keep the
application implementation in `app.main` and expose it here for deployment.
"""

from app.main import app

