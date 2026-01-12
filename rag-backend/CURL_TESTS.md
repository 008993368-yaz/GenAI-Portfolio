# RAG Backend - cURL Test Commands

## Prerequisites
Start the FastAPI server:
```bash
cd app
python -m uvicorn main:app --reload
```

## Test 1: Health Check
```bash
curl http://localhost:8000/
```

## Test 2: Configuration Info
```bash
curl http://localhost:8000/info
```

## Test 3: Accenture Role/Responsibilities Query
```bash
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"What were the responsibilities at Accenture?\", \"top_k\": 5}"
```

## Test 4: Testing Frameworks Query
```bash
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"What testing frameworks were used?\", \"top_k\": 5}"
```

## Test 5: Education/GPA Query
```bash
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"What is the education background and GPA?\", \"top_k\": 5}"
```

## Windows PowerShell Versions

### Test 3: Accenture (PowerShell)
```powershell
$body = @{
    query = "What were the responsibilities at Accenture?"
    top_k = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/rag/search" -Method Post -Body $body -ContentType "application/json"
```

### Test 4: Testing Frameworks (PowerShell)
```powershell
$body = @{
    query = "What testing frameworks were used?"
    top_k = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/rag/search" -Method Post -Body $body -ContentType "application/json"
```

### Test 5: Education/GPA (PowerShell)
```powershell
$body = @{
    query = "What is the education background and GPA?"
    top_k = 5
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/rag/search" -Method Post -Body $body -ContentType "application/json"
```

## Using Python Test Script
```bash
python test_api.py
```
