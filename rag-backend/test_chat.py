#!/usr/bin/env python3
"""
Automated test script for /chat endpoint
Tests the complete RAG pipeline with guardrails and memory
"""

import requests
import json
import time


BASE_URL = "http://localhost:8000"


def print_test_header(title: str):
    """Print formatted test header"""
    print(f"\n{'='*70}")
    print(f"TEST: {title}")
    print(f"{'='*70}")


def print_response(response: requests.Response):
    """Pretty print API response"""
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response:\n{json.dumps(data, indent=2)}")
    except:
        print(f"Response: {response.text}")


def test_health():
    """Test health check"""
    print_test_header("Health Check")
    response = requests.get(f"{BASE_URL}/")
    print_response(response)
    return response.status_code == 200


def test_accenture():
    """Test Accenture experience query"""
    print_test_header("Test 1: Accenture Experience (On-Topic)")
    
    payload = {
        "sessionId": "test-session-1",
        "message": "What did you do at Accenture?"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/chat", json=payload)
    print_response(response)
    
    assert response.status_code == 200, "Expected 200 status"
    assert "reply" in response.json(), "Expected 'reply' field"
    
    return True


def test_testing_frameworks():
    """Test testing frameworks query"""
    print_test_header("Test 2: Testing Frameworks (On-Topic)")
    
    payload = {
        "sessionId": "test-session-2",
        "message": "What testing frameworks did you use?"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/chat", json=payload)
    print_response(response)
    
    assert response.status_code == 200, "Expected 200 status"
    assert "reply" in response.json(), "Expected 'reply' field"
    
    return True


def test_education_gpa():
    """Test education/GPA query"""
    print_test_header("Test 3: Education and GPA (On-Topic)")
    
    payload = {
        "sessionId": "test-session-3",
        "message": "What is your GPA?"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/chat", json=payload)
    print_response(response)
    
    assert response.status_code == 200, "Expected 200 status"
    assert "reply" in response.json(), "Expected 'reply' field"
    
    return True


def test_off_topic():
    """Test off-topic guardrail"""
    print_test_header("Test 4: Off-Topic Question (Guardrail)")
    
    payload = {
        "sessionId": "test-session-4",
        "message": "What is the capital of France?"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    print("\n⚠️  This should trigger guardrail and NOT call Pinecone/OpenAI")
    
    response = requests.post(f"{BASE_URL}/chat", json=payload)
    print_response(response)
    
    assert response.status_code == 200, "Expected 200 status"
    data = response.json()
    assert "reply" in data, "Expected 'reply' field"
    
    expected_msg = "That's outside my scope"
    assert expected_msg in data["reply"], f"Expected guardrail message, got: {data['reply']}"
    
    print("\n✅ Guardrail worked! Off-topic query was redirected.")
    
    return True


def test_follow_up():
    """Test conversation memory with follow-up"""
    print_test_header("Test 5: Follow-Up Question (Memory)")
    
    session_id = "test-session-5"
    
    # First message
    print("\n--- Part 1: Initial question ---")
    payload1 = {
        "sessionId": session_id,
        "message": "Tell me about your work experience"
    }
    
    print(f"Request: {json.dumps(payload1, indent=2)}")
    response1 = requests.post(f"{BASE_URL}/chat", json=payload1)
    print_response(response1)
    
    time.sleep(1)  # Brief pause
    
    # Follow-up message
    print("\n--- Part 2: Follow-up question (should use context) ---")
    payload2 = {
        "sessionId": session_id,
        "message": "What technologies did you use there?"
    }
    
    print(f"Request: {json.dumps(payload2, indent=2)}")
    response2 = requests.post(f"{BASE_URL}/chat", json=payload2)
    print_response(response2)
    
    assert response1.status_code == 200, "Expected 200 for first message"
    assert response2.status_code == 200, "Expected 200 for follow-up"
    
    print("\n✅ Memory test completed. Follow-up should reference previous context.")
    
    return True


def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("🧪 RAG CHAT API - AUTOMATED TESTS")
    print("="*70)
    print("Server: http://localhost:8000")
    print("Make sure the server is running: cd app && python -m uvicorn main:app --reload")
    
    try:
        # Run tests
        tests = [
            ("Health Check", test_health),
            ("Accenture Experience", test_accenture),
            ("Testing Frameworks", test_testing_frameworks),
            ("Education/GPA", test_education_gpa),
            ("Off-Topic Guardrail", test_off_topic),
            ("Follow-Up Memory", test_follow_up),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except AssertionError as e:
                print(f"\n❌ Assertion failed: {e}")
                failed += 1
            except Exception as e:
                print(f"\n❌ Test error: {e}")
                failed += 1
        
        # Summary
        print("\n" + "="*70)
        print("📊 TEST SUMMARY")
        print("="*70)
        print(f"✅ Passed: {passed}/{len(tests)}")
        print(f"❌ Failed: {failed}/{len(tests)}")
        
        if failed == 0:
            print("\n🎉 All tests passed!")
        else:
            print(f"\n⚠️  {failed} test(s) failed")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to server")
        print("Please start the server first:")
        print("  cd app && python -m uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")


if __name__ == "__main__":
    main()
