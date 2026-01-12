# End-to-End RAG Chat API - Test Commands

## Prerequisites

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Ensure environment variables are set in `.env`:**
```
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=yazhini-resume
PINECONE_NAMESPACE=resume-v1
OPENAI_API_KEY=your_openai_key
```

3. **Start the FastAPI server:**
```bash
cd app
python -m uvicorn main:app --reload
```

Server should be running at: http://localhost:8000

---

## Test 1: Accenture Role/Responsibilities (On-Topic)

### Bash/Linux/Mac:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-1",
    "message": "What did you do at Accenture?"
  }'
```

### PowerShell:
```powershell
$body = @{
    sessionId = "test-session-1"
    message = "What did you do at Accenture?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Expected:** Detailed response about Accenture experience from resume context.

---

## Test 2: Testing Frameworks (On-Topic)

### Bash/Linux/Mac:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-2",
    "message": "What testing frameworks did you use?"
  }'
```

### PowerShell:
```powershell
$body = @{
    sessionId = "test-session-2"
    message = "What testing frameworks did you use?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Expected:** Information about testing frameworks (Jest, Jasmine, XUnit, etc.) from resume.

---

## Test 3: Education/GPA (On-Topic)

### Bash/Linux/Mac:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-3",
    "message": "What is your GPA?"
  }'
```

### PowerShell:
```powershell
$body = @{
    sessionId = "test-session-3"
    message = "What is your GPA?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Expected:** GPA and education details from resume context.

---

## Test 4: Off-Topic Question (Guardrail Test)

### Bash/Linux/Mac:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-4",
    "message": "What is the capital of France?"
  }'
```

### PowerShell:
```powershell
$body = @{
    sessionId = "test-session-4"
    message = "What is the capital of France?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Expected Response:**
```json
{
  "reply": "That's outside my scope, but I'd love to tell you about my work. Ask me about my projects, skills, or experience."
}
```

This should NOT call Pinecone or OpenAI (check server logs).

---

## Test 5: Follow-Up Question (Memory Test)

First, ask about work experience:

### PowerShell:
```powershell
$body = @{
    sessionId = "test-session-5"
    message = "Tell me about your work experience"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

Then ask a follow-up:

```powershell
$body = @{
    sessionId = "test-session-5"
    message = "What technologies did you use there?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/chat" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

**Expected:** The assistant should understand "there" refers to the previous context (work experience).

---

## Additional Endpoints

### Health Check:
```bash
curl http://localhost:8000/
```

### Configuration Info:
```bash
curl http://localhost:8000/info
```

### Debug Search (no LLM):
```bash
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What skills do you have?", "top_k": 3}'
```

---

## Python Test Script

You can also use the Python test script for automated testing:

```bash
python test_chat.py
```

---

## Verify Server Logs

When testing off-topic questions, check the server logs. You should see:
- ✅ **Off-topic:** No Pinecone or OpenAI API calls
- ✅ **On-topic:** Pinecone retrieval + OpenAI generation

---

## Expected Behavior Summary

| Test | Query | Calls Pinecone? | Calls OpenAI? | Response Type |
|------|-------|-----------------|---------------|---------------|
| Test 1 | Accenture work | ✅ Yes | ✅ Yes | Detailed from context |
| Test 2 | Testing frameworks | ✅ Yes | ✅ Yes | List from context |
| Test 3 | GPA/Education | ✅ Yes | ✅ Yes | Education details |
| Test 4 | Off-topic (France) | ❌ No | ❌ No | Guardrail redirect |
| Test 5 | Follow-up | ✅ Yes | ✅ Yes | Uses conversation history |
