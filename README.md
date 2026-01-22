# GenAI Portfolio

A modern, AI-powered portfolio website featuring a React frontend and a RAG (Retrieval Augmented Generation) chatbot backend. The chatbot can intelligently answer questions about your professional experience, skills, and projects by retrieving context from your resume.

## 🌟 Features

- **Interactive Portfolio Website**: Beautiful, responsive single-page application built with React
- **AI-Powered Chatbot**: Intelligent assistant that answers questions about your professional background
- **RAG Backend**: Semantic search over your resume using LangChain, Pinecone, and OpenAI
- **Containerized Deployment**: Full Docker Compose setup for easy deployment
- **Real-time Chat**: WebSocket-based chat interface with conversation memory
- **Smart Guardrails**: Ensures the chatbot stays on topic about your portfolio

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

```bash
# Copy the example environment file
cp rag-backend/.env.example rag-backend/.env

# Edit the .env file with your actual API keys
# Required variables:
# - OPENAI_API_KEY=sk-...
# - PINECONE_API_KEY=pcsk_...
# - PINECONE_INDEX_NAME=your-index-name
# - PINECONE_NAMESPACE=resume-v1
```

### 3. Add Your Resume

Place your resume PDF in the backend data directory:

```bash
cp /path/to/your/resume.pdf rag-backend/data/resume.pdf
```

### 4. Ingest Your Resume (First Time Only)

This step processes your resume and stores it in Pinecone for semantic search:

```bash
cd rag-backend

# Create a Python virtual environment
python -m venv .venv

# Activate it
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run ingestion
python scripts/ingest_resume.py
```

### 5. Launch the Application

```bash
# Return to root directory
cd ..

# Start both frontend and backend with Docker Compose
docker-compose up --build
```

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

The frontend connects to the backend API. Update the API URL in:
```javascript
// frontend/src/services/chatApi.js
const API_BASE_URL = 'http://localhost:8000';
```

### Backend Configuration

All configuration is managed through environment variables in `rag-backend/.env`:

- `OPENAI_API_KEY` - Your OpenAI API key
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX_NAME` - Pinecone index name
- `PINECONE_NAMESPACE` - Namespace for resume vectors (e.g., "resume-v1")

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
# Run backend with custom port
docker run -p 9000:8000 --env-file rag-backend/.env portfolio-backend

# Run frontend with custom port
docker run -p 3000:80 portfolio-frontend
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
- Verify `.env` file exists in `rag-backend/` directory
- Check that Docker Compose is configured to use the env file
- Ensure no extra spaces in `.env` file

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

---

Made with ❤️ by Yazhini
