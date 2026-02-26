
import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api"

def test_registration_uniqueness():
    print("Testing Registration Uniqueness...")
    
    # Use a unique identifier for this test run to avoid conflicts with real data
    ts = int(time.time())
    username = f"TestUser_{ts}"
    email = f"test_{ts}@example.com"
    phone = f"+254700{str(ts)[-6:]}"
    
    payload = {
        "full_name": "Test User",
        "email": email,
        "location": "Test City",
        "phone": phone,
        "username": username,
        "password": "Password123"
    }
    
    # 1. Successful registration
    print(f"Attempting first registration for {username}...")
    response = requests.post(f"{BASE_URL}/register", json=payload)
    print(f"Status: {response.status_code}, Response: {response.json()}")
    
    if response.status_code != 201:
        print("Initial registration failed!")
        return

    # 2. Duplicate username (case-insensitive)
    print("\nAttempting registration with duplicate username (different case)...")
    payload_dup_user = payload.copy()
    payload_dup_user["username"] = username.lower()
    payload_dup_user["email"] = f"diff_{ts}@example.com"
    payload_dup_user["phone"] = f"+254701{str(ts)[-6:]}"
    
    response = requests.post(f"{BASE_URL}/register", json=payload_dup_user)
    print(f"Status: {response.status_code}, Response: {response.json()}")
    if response.status_code == 400 and "Username already exists" in response.text:
        print("SUCCESS: Case-insensitive username check caught duplicate.")
    else:
        print("FAILED: Case-insensitive username check failed.")

    # 3. Duplicate email
    print("\nAttempting registration with duplicate email...")
    payload_dup_email = payload.copy()
    payload_dup_email["username"] = f"OtherUser_{ts}"
    payload_dup_email["phone"] = f"+254702{str(ts)[-6:]}"
    
    response = requests.post(f"{BASE_URL}/register", json=payload_dup_email)
    print(f"Status: {response.status_code}, Response: {response.json()}")
    if response.status_code == 400 and "Email already exists" in response.text:
        print("SUCCESS: Duplicate email caught.")
    else:
        print("FAILED: Duplicate email check failed.")

if __name__ == "__main__":
    test_registration_uniqueness()
