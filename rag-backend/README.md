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

# Run container with environment variables
docker run \
  -e OPENAI_API_KEY=\"your-key\" \
  -e PINECONE_API_KEY=\"your-key\" \
  -e PINECONE_INDEX_NAME=\"your-index\" \
  -v $(pwd)/data:/app/data \
  rag-backend
```

### 3. Configure Environment Variables

Set the following environment variables in your system:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX_NAME` - Your Pinecone index name

**Optional (with defaults):**
- `PINECONE_NAMESPACE` - Namespace for vectors (default: `resume-v1`)
- `PINECONE_EMBED_MODEL` - Embedding model (default: `llama-text-embed-v2`)
- `OPENAI_MODEL` - Chat model (default: `gpt-4o-mini`)
- `RAG_TOP_K` - Number of chunks to retrieve (default: `5`)

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
$env:PINECONE_API_KEY="pcsk-your-key-here"
$env:PINECONE_INDEX_NAME="portfolio-resume"
```

**macOS/Linux:**
```bash
export OPENAI_API_KEY="sk-your-key-here"
export PINECONE_API_KEY="pcsk-your-key-here"
export PINECONE_INDEX_NAME="portfolio-resume"
```

**Important:**
- Get your OpenAI key: https://platform.openai.com/api-keys
- Get your Pinecone key: https://www.pinecone.io/
- Create a Pinecone index with 768 dimensions (for llama-text-embed-v2)

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

# Ensure environment variables are set
# Windows PowerShell:
$env:OPENAI_API_KEY="your-key"
$env:PINECONE_API_KEY="your-key"
$env:PINECONE_INDEX_NAME="your-index"

# macOS/Linux:
# export OPENAI_API_KEY="your-key"
# export PINECONE_API_KEY="your-key"
# export PINECONE_INDEX_NAME="your-index"

# Run ingestion script
python scripts/ingest_resume.py
```

### Inside Docker

```bash
# Build the Docker image
docker build -t rag-backend .

# Run ingestion with environment variables
docker run --rm \
  -e OPENAI_API_KEY="your-key" \
  -e PINECONE_API_KEY="your-key" \
  -e PINECONE_INDEX_NAME="your-index" \
  -v $(pwd)/data:/app/data \
  rag-backend python scripts/ingest_resume.py
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
├── app/
│   ├── config.py           # Environment variable configuration
│   ├── main.py             # FastAPI application
│   └── services/           # RAG, retrieval, memory, guardrails
├── data/
│   ├── resume.pdf          # Your resume (you provide)
│   └── README.md           # Data directory info
├── scripts/
│   └── ingest_resume.py    # Ingestion script
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
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
- Verify environment variables are set in your system
- Check variable names are correct (case-sensitive)
- For Docker: ensure variables are passed using `-e` flag or docker-compose environment section

**Pinecone connection errors**
- Verify API key is correct
- Check index name matches Pinecone dashboard
- Ensure region is correct (defaults to us-east-1)

## License

MIT
