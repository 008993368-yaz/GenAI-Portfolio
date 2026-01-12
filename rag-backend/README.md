# RAG Backend - Portfolio Chatbot

FastAPI backend with RAG (Retrieval Augmented Generation) for portfolio chatbot using LangChain, Pinecone, and OpenAI.

## Features

- 📄 PDF resume ingestion
- 🔍 Semantic search with OpenAI embeddings
- 🌲 Vector storage in Pinecone
- ⚡ Idempotent ingestion (deterministic IDs)

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

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your actual keys
# OPENAI_API_KEY=sk-...
# PINECONE_API_KEY=pcsk_...
# PINECONE_INDEX_NAME=your-index-name
# PINECONE_NAMESPACE=resume-v1  # optional
```

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

## Next Steps

- [ ] Add retrieval endpoints
- [ ] Implement chat functionality
- [ ] Add API routes for querying
- [ ] Deploy to production

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
