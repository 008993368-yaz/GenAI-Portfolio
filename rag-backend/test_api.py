#!/usr/bin/env python3
"""
Test script for RAG retrieval endpoints
Run this after starting the FastAPI server
"""

import requests
import json


BASE_URL = "http://localhost:8000"


def print_response(title: str, response: requests.Response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"TEST: {title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    print(f"\nResponse:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print()


def test_health():
    """Test health check endpoint"""
    response = requests.get(f"{BASE_URL}/")
    print_response("Health Check", response)


def test_info():
    """Test info endpoint"""
    response = requests.get(f"{BASE_URL}/info")
    print_response("Configuration Info", response)


def test_search_accenture():
    """Test search for Accenture role/responsibilities"""
    payload = {
        "query": "What were the responsibilities at Accenture?",
        "top_k": 5
    }
    response = requests.post(f"{BASE_URL}/rag/search", json=payload)
    print_response("Accenture Responsibilities Query", response)


def test_search_testing_frameworks():
    """Test search for testing frameworks"""
    payload = {
        "query": "What testing frameworks were used?",
        "top_k": 5
    }
    response = requests.post(f"{BASE_URL}/rag/search", json=payload)
    print_response("Testing Frameworks Query", response)


def test_search_education():
    """Test search for education/GPA"""
    payload = {
        "query": "What is the education background and GPA?",
        "top_k": 5
    }
    response = requests.post(f"{BASE_URL}/rag/search", json=payload)
    print_response("Education/GPA Query", response)


if __name__ == "__main__":
    print("\n🧪 RAG RETRIEVAL API TESTS")
    print("="*60)
    print("Make sure the FastAPI server is running on http://localhost:8000")
    print("Start it with: cd app && python -m uvicorn main:app --reload")
    print()
    
    try:
        # Run tests
        test_health()
        test_info()
        test_search_accenture()
        test_search_testing_frameworks()
        test_search_education()
        
        print("\n✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to server at http://localhost:8000")
        print("Please start the server first:")
        print("  cd app && python -m uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
