# GenAI Portfolio

A modern, AI-powered portfolio website featuring a React frontend and a RAG (Retrieval Augmented Generation) chatbot backend. The chatbot can intelligently answer questions about your professional experience, skills, and projects by retrieving context from your resume.

## 🌟 Features

- **Interactive Portfolio Website**: Beautiful, responsive single-page application built with React and Vite
- **AI-Powered Chatbot**: Intelligent assistant that answers questions about your professional background
- **RAG Backend**: Semantic search over your resume using LangChain, Pinecone, and OpenAI embeddings
- **Containerized Deployment**: Full Docker Compose setup for easy deployment
- **Chat with Memory**: Conversation history and context-aware responses
- **Smart Guardrails**: Ensures the chatbot stays on topic about your portfolio
- **Smooth Animations**: Intersection observers and scroll effects for engaging UX

## 🏗️ Architecture

```
GenAI-Portfolio/
├── frontend/              # React + Vite portfolio website
│   ├── src/
│   │   ├── components/   # UI components (Navbar, Hero, Chat, etc.)
│   │   ├── services/     # API integration
│   │   └── data/         # Portfolio content
│   └── Dockerfile
├── rag-backend/          # FastAPI + RAG chatbot
│   ├── app/
│   │   ├── main.py      # FastAPI application
│   │   └── services/    # RAG, retrieval, memory, guardrails
│   ├── scripts/         # Data ingestion scripts
│   ├── data/            # Resume PDF storage
│   └── Dockerfile
└── docker-compose.yml    # Orchestration
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Pinecone account ([Sign up here](https://www.pinecone.io/))
- Your resume as a PDF file

### 1. Clone the Repository

```bash
git clone https://github.com/008993368-yaz/GenAI-Portfolio.git
cd GenAI-Portfolio
```

### 2. Configure Environment Variables

Set the following environment variables in your system or pass them to Docker:

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX_NAME` - Your Pinecone index name
- `PINECONE_NAMESPACE` - Namespace for resume vectors (default: `resume-v1`)

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="sk-your-openai-key-here"
$env:PINECONE_API_KEY="pcsk-your-pinecone-key-here"
$env:PINECONE_INDEX_NAME="portfolio-resume"
$env:PINECONE_NAMESPACE="resume-v1"
```

**macOS/Linux:**
```bash
export OPENAI_API_KEY="sk-your-openai-key-here"
export PINECONE_API_KEY="pcsk-your-pinecone-key-here"
export PINECONE_INDEX_NAME="portfolio-resume"
export PINECONE_NAMESPACE="resume-v1"
```

**Get your API keys:**
- OpenAI: https://platform.openai.com/api-keys
- Pinecone: https://www.pinecone.io/ (create a free account)

**Note:** Create a Pinecone index with:
- Dimensions: 768 (for Pinecone's llama-text-embed-v2)
- Metric: Cosine similarity

### 3. Add Your Resume

Place your resume PDF in the backend data directory:

```bash
cp /path/to/your/resume.pdf rag-backend/data/resume.pdf
```

### 4. Ingest Your Resume (First Time Setup)

This step processes your resume and stores it in Pinecone for semantic search:

```bash
cd rag-backend

# Create a Python virtual environment
python -m venv .venv

# Activate it
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Windows CMD:
.venv\Scripts\activate.bat
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run ingestion script
python scripts/ingest_resume.py
```

**What happens during ingestion:**
1. Your PDF is loaded and parsed
2. Text is split into semantic chunks (600 chars with 100 char overlap)
3. Each chunk is embedded using OpenAI's embedding model
4. Vectors are uploaded to Pinecone with metadata
5. Idempotent process - safe to run multiple times

**Expected output:** You should see a summary showing pages processed, chunks created, and vectors upserted.

### 5. Launch the Application

```bash
# Return to root directory
cd ..

# Start both frontend and backend with Docker Compose
# Pass environment variables directly
docker-compose up --build
```

**Note:** Environment variables can be passed via:
- System environment variables (set before running docker-compose)
- Docker Compose environment section (edit docker-compose.yml)
- Command line: `docker-compose up` will use system environment variables

The application will be available at:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📦 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Nginx** - Production web server

### Backend
- **FastAPI** - Modern Python web framework
- **LangChain** - RAG orchestration framework
- **Pinecone** - Vector database for semantic search
- **OpenAI** - Embeddings (text-embedding-ada-002) and chat completions
- **PyPDF** - PDF parsing and processing

## 🎯 Usage

### Chatbot Interaction

Click the chat button on the portfolio website to start a conversation. The chatbot can answer questions like:

- "What are your technical skills?"
- "Tell me about your work experience"
- "What projects have you worked on?"
- "What's your educational background?"

The chatbot uses semantic search to find relevant information from your resume and generates contextual responses.

### API Endpoints

The backend exposes several endpoints (see full documentation at `/docs`):

- `POST /chat` - Send a message and get a response
- `POST /search` - Search your resume semantically
- `GET /health` - Health check endpoint

## 🛠️ Development

### Running Locally (Without Docker)

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

**Backend:**
```bash
cd rag-backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Visit http://localhost:8000/docs
```

### Customizing Portfolio Content

Edit the portfolio data in:
```
frontend/src/data/portfolioData.js
```

This file contains your:
- Personal information
- Skills
- Work experience
- Projects
- Education

### Testing the Chat API

See `rag-backend/CHAT_API_TESTS.md` and `rag-backend/CURL_TESTS.md` for comprehensive API testing examples.

## 🔧 Configuration

### Frontend Configuration

The frontend connects to the backend API. For production deployment, update the API URL in:
```javascript
// frontend/src/services/chatApi.js
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-backend-url.com'
  : 'http://localhost:8000';
```

For local development, the default `http://localhost:8000` works with Docker Compose.

### Backend Configuration

All configuration is managed through environment variables:

- `OPENAI_API_KEY` - Your OpenAI API key
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name
- `PINECONE_NAMESPACE` - Namespace for resume vectors (default: "resume-v1")
- `PINECONE_EMBED_MODEL` - Embedding model (default: "llama-text-embed-v2")
- `OPENAI_MODEL` - Chat model (default: "gpt-4o-mini")
- `RAG_TOP_K` - Number of chunks to retrieve (default: 5)

These can be set in your system environment or passed to Docker containers.

### Chunking Configuration

Modify chunking strategy in `rag-backend/scripts/ingest_resume.py`:
- **Chunk size**: Default 600 characters
- **Overlap**: Default 100 characters
- **Splitter**: RecursiveCharacterTextSplitter

## 🐳 Docker

### Building Images Separately

```bash
# Build frontend
docker build -t portfolio-frontend ./frontend

# Build backend
docker build -t portfolio-backend ./rag-backend
```

### Running with Custom Configuration

```bash
# Run backend with custom port and environment variables
docker run -p 9000:8000 \
  -e OPENAI_API_KEY="your-key" \
  -e PINECONE_API_KEY="your-key" \
  -e PINECONE_INDEX_NAME="your-index" \
  -e PINECONE_NAMESPACE="resume-v1" \
  portfolio-backend

# Run frontend with custom port
docker run -p 3000:80 portfolio-frontend
```

### Docker Compose Commands

```bash
# Start services
docker-compose up

# Start in detached mode
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

## 📝 Updating Your Resume

To update the chatbot's knowledge:

1. Replace the PDF in `rag-backend/data/resume.pdf`
2. Re-run the ingestion script:
   ```bash
   cd rag-backend
   source .venv/bin/activate
   python scripts/ingest_resume.py
   ```
3. The ingestion is idempotent, so running it multiple times is safe

## 🔍 Troubleshooting

### Chatbot Returns Generic Responses

**Issue**: The chatbot doesn't have specific information about you.

**Solution**: Ensure you've run the ingestion script and that your resume PDF is in `rag-backend/data/resume.pdf`.

### CORS Errors

**Issue**: Frontend can't connect to backend API.

**Solution**: 
- Ensure both services are running
- Check the API URL in `frontend/src/services/chatApi.js`
- Verify CORS settings in `rag-backend/app/main.py`

### Docker Build Failures

**Issue**: Docker build fails for frontend or backend.

**Solution**:
- Ensure Docker is running
- Try building with `--no-cache` flag: `docker-compose build --no-cache`
- Check that all required files exist

### Environment Variables Not Loading

**Issue**: Backend can't find API keys.

**Solution**:
- Verify environment variables are set in your system
- For Docker: Pass variables using `-e` flag or set them in docker-compose.yml
- Check variable names are correct (case-sensitive)
- Ensure values don't have quotes or extra spaces when setting in shell

### Pinecone Connection Errors

**Issue**: Can't connect to Pinecone index.

**Solution**:
- Verify API key is correct
- Ensure index name matches your Pinecone dashboard
- Check that the index exists and is in the correct region

## 📚 Additional Documentation

- [RAG Backend Documentation](rag-backend/README.md) - Detailed backend setup and configuration
- [Chat API Tests](rag-backend/CHAT_API_TESTS.md) - API testing guide
- [CURL Tests](rag-backend/CURL_TESTS.md) - Command-line testing examples

## 🤝 Contributing

This is a personal portfolio project, but suggestions and feedback are welcome! Feel free to open an issue or submit a pull request.

## 📄 License

MIT License - feel free to use this as a template for your own portfolio!

## 🎓 Credits

Built with modern web technologies and AI to showcase professional experience in an interactive way.

## 🚀 Deployment

### Deploying to Production

**Frontend:**
- Build the production bundle: `npm run build` in `frontend/`
- Deploy the `dist/` folder to any static hosting (Vercel, Netlify, GitHub Pages)
- Update the API base URL for your production backend

**Backend:**
- Deploy to platforms like Railway, Render, or AWS
- Ensure environment variables are set
- Make sure Pinecone index is accessible from production
- Update CORS settings in `app/main.py` to allow your frontend domain

**Full Stack:**
- Use Docker Compose on a VPS (DigitalOcean, AWS EC2, etc.)
- Configure reverse proxy (Nginx) for production
- Set up SSL certificates (Let's Encrypt)

---

**Author:** Yazhini  
**Repository:** [GenAI-Portfolio](https://github.com/008993368-yaz/GenAI-Portfolio)  
**License:** MIT
