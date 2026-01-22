# Resume Data Directory

This directory contains your resume PDF that will be processed by the RAG ingestion pipeline.

## 📋 Requirements

**File Name:** `resume.pdf` (must be exactly this name)

**File Format:** PDF only

**Location:** Place your resume PDF in this directory: `rag-backend/data/resume.pdf`

## 🔄 What Happens During Ingestion

When you run `python scripts/ingest_resume.py`, the following process occurs:

1. **Load PDF** - Reads your `resume.pdf` file
2. **Extract Text** - Parses all pages and extracts text content
3. **Chunk Text** - Splits content into overlapping chunks (600 chars, 100 overlap)
4. **Generate Embeddings** - Creates vector embeddings using OpenAI's text-embedding-ada-002
5. **Store in Pinecone** - Uploads vectors to your Pinecone index with metadata
6. **Create IDs** - Uses deterministic hashing for idempotent updates

## 📊 Chunk Metadata

Each chunk stored in Pinecone includes:

- `source`: Always "resume"
- `filename`: Name of the PDF file
- `chunk_index`: Sequential number of the chunk
- `page`: Page number from PDF (if available)
- `text`: Full text content of the chunk
- `text_preview`: First 100 characters for quick reference

## ✅ Best Practices

- **Keep it Updated:** Replace `resume.pdf` with your latest version and re-run ingestion
- **Idempotent:** Running ingestion multiple times is safe - existing chunks are updated
- **File Size:** Most resumes (1-5 pages) work well; very large files may take longer
- **Format:** Ensure PDF has selectable text (not scanned images)
- **Privacy:** Never commit your actual resume to public repositories

## 🔒 Security Note

The `resume.pdf` file should be in `.gitignore` to prevent accidental commits. Only commit this README file, not your actual resume.

## 💡 Tips

- **Test with Sample:** Start with a sample resume to test the pipeline
- **Check Extraction:** Ensure text is properly extracted (not image-based PDFs)
- **Monitor Costs:** Each ingestion uses OpenAI API credits for embeddings
- **Update Regularly:** Re-run ingestion when your resume changes
