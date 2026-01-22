# RAG Backend - Portfolio Chatbot

FastAPI backend with RAG (Retrieval Augmented Generation) for intelligent portfolio chatbot powered by LangChain, Pinecone, and OpenAI.

## ✨ Features

- 📄 **PDF Resume Ingestion** - Automated parsing and processing of resume PDFs
- 🔍 **Semantic Search** - Context-aware retrieval using OpenAI embeddings (text-embedding-ada-002)
- 🌲 **Vector Database** - Scalable storage in Pinecone with namespaces
- ⚡ **Idempotent Ingestion** - Deterministic chunk IDs for safe re-runs
- 💬 **Conversational Memory** - Maintains chat context across messages
- 🛡️ **Guardrails** - Keeps conversations focused on portfolio topics
- 🚀 **RESTful API** - FastAPI endpoints with automatic OpenAPI documentation
- 🔄 **CORS Enabled** - Ready for frontend integration

## Setup

### 1. Prerequisites

- Python 3.10+
- Pinecone account with API key
- OpenAI API key
- Your resume as a PDF file

### 2. Install Dependencies

**Outside Docker (Local):**
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**With Docker:**
```bash
# Build image
docker build -t rag-backend .

# Run container
docker run --env-file .env -v $(pwd)/data:/app/data rag-backend
```

### 3. Configure Environment

Create a `.env` file in the `rag-backend/` directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-key-here

# Pinecone Configuration
PINECONE_API_KEY=pcsk-your-actual-key-here
PINECONE_INDEX_NAME=portfolio-resume
PINECONE_NAMESPACE=resume-v1

# Optional: Model Configuration
# EMBEDDING_MODEL=text-embedding-ada-002
# CHAT_MODEL=gpt-4
```

**Important:**
- Never commit the `.env` file to version control (it's in `.gitignore`)
- Get your OpenAI key: https://platform.openai.com/api-keys
- Get your Pinecone key: https://www.pinecone.io/
- Create a Pinecone index with 1536 dimensions (for ada-002 embeddings)

### 4. Add Your Resume

Place your resume PDF in the `data/` directory:
```bash
data/resume.pdf
```

## Running Ingestion

### Outside Docker (Local)

```bash
# Activate virtual environment first
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Run ingestion script
python scripts/ingest_resume.py
```

### Inside Docker

First, create a Dockerfile:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY scripts/ ./scripts/
COPY data/ ./data/
COPY .env .env

# Run ingestion
CMD ["python", "scripts/ingest_resume.py"]
```

Then run:

```bash
# Build
docker build -t rag-backend .

# Run ingestion
docker run --rm --env-file .env -v $(pwd)/data:/app/data rag-backend python scripts/ingest_resume.py
```

## Ingestion Details

### Chunking Strategy
- **Chunk size:** 600 characters (~500-800 tokens)
- **Overlap:** 100 characters (~80-120 tokens)
- **Splitter:** RecursiveCharacterTextSplitter

### Metadata Stored
Each vector includes:
- `source`: "resume"
- `filename`: Name of PDF file
- `chunk_index`: Sequential chunk number
- `page`: Page number (if available)
- `text_preview`: First 100 chars of chunk
- `text`: Full chunk text

### Idempotency
- Uses **deterministic IDs** based on content hash
- Re-running overwrites existing vectors
- Safe to run multiple times

## Project Structure

```
rag-backend/
├── data/
│   ├── resume.pdf          # Your resume (you provide)
│   └── README.md           # Data directory info
├── scripts/
│   └── ingest_resume.py    # Ingestion script
├── .env                     # Your actual keys (gitignored)
├── .env.example             # Example environment variables
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Expected Output

```
✅ Environment variables loaded
📄 Loading PDF: data/resume.pdf
✅ Loaded 2 pages
✂️  Created 15 chunks
🌲 Connecting to Pinecone...
✅ Using existing index: your-index-name
🔄 Embedding and upserting 15 chunks to namespace 'resume-v1'...
  ✓ Upserted batch 1/1

============================================================
📊 INGESTION SUMMARY
============================================================
📄 Pages processed:    15
✂️  Chunks created:     15
☁️  Vectors upserted:   15
🔑 ID strategy:        Deterministic (idempotent)
============================================================

✨ Ingestion complete! Your resume is now searchable.
```

## Tech Stack

- **FastAPI** - Web framework
- **LangChain** - RAG orchestration
- **Pinecone** - Vector database
- **OpenAI** - Embeddings (text-embedding-ada-002)
- **PyPDF** - PDF parsing

## 📡 API Endpoints

Once running, the backend provides:

- **POST /chat** - Send a message and receive AI-generated response
  ```json
  {
    "message": "What are your technical skills?",
    "conversation_id": "optional-session-id"
  }
  ```

- **POST /search** - Semantic search over resume
  ```json
  {
    "query": "python experience",
    "top_k": 3
  }
  ```

- **GET /health** - Health check endpoint

- **GET /docs** - Interactive API documentation (Swagger UI)

- **GET /redoc** - Alternative API documentation

See `CHAT_API_TESTS.md` and `CURL_TESTS.md` for detailed testing examples.

## 🧪 Testing

```bash
# Run API tests
python test_api.py

# Test chat endpoint
python test_chat.py

# Or use curl (see CURL_TESTS.md)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about your experience"}'
```

## Troubleshooting

**"Resume PDF not found"**
- Ensure `data/resume.pdf` exists
- Check file path and name

**"Missing required environment variables"**
- Verify `.env` file exists
- Check all required keys are set

**Pinecone connection errors**
- Verify API key is correct
- Check index name matches Pinecone dashboard
- Ensure region is correct (defaults to us-east-1)

## License

MIT
