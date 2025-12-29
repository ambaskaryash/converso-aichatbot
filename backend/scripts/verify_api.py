import requests
import json
import asyncio
import websockets
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"
WS_URL = "ws://127.0.0.1:8000/api/v1"

def create_project():
    print("1. Creating Project...")
    payload = {
        "name": "Verification Project",
        "description": "Project created by verification script",
        "vector_namespace": "verify_ns_" + str(uuid.uuid4())[:8]
    }
    try:
        response = requests.post(f"{BASE_URL}/projects/", json=payload)
        response.raise_for_status()
        project = response.json()
        print(f"   Success! Project ID: {project['id']}")
        return project
    except Exception as e:
        print(f"   Error creating project: {e}")
        if hasattr(e, 'response') and e.response:
             print(e.response.text)
        sys.exit(1)

def ingest_knowledge(project_id, api_key):
    print("\n2. Ingesting Knowledge...")
    secret_fact = "The secret code for the verification vault is 'Omega-99'."
    payload = {
        "text": f"Important Security Information: {secret_fact}",
        "metadata": {"source": "manual_verification"}
    }
    headers = {"x-api-key": api_key}
    try:
        response = requests.post(f"{BASE_URL}/ingest/{project_id}/text", json=payload, headers=headers)
        response.raise_for_status()
        print(f"   Success! {response.json()['message']}")
    except Exception as e:
        print(f"   Error ingesting knowledge: {e}")
        if hasattr(e, 'response') and e.response:
             print(e.response.text)
        sys.exit(1)

async def test_chat(project_id, api_key):
    print("\n3. Testing Chat (WebSocket)...")
    uri = f"{WS_URL}/chat/{project_id}/ws?api_key={api_key}"
    
    try:
        async with websockets.connect(uri) as websocket:
            # Send message
            question = "What is the secret code for the vault?"
            print(f"   Sending: '{question}'")
            await websocket.send(json.dumps({"message": question, "session_id": "test-session"}))
            
            # Receive response
            full_response = ""
            while True:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data["type"] == "token":
                    full_response += data["content"]
                    print(data["content"], end="", flush=True)
                elif data["type"] == "done":
                    break
                elif data["type"] == "error":
                    print(f"\n   Error from server: {data['error']}")
                    break
            
            print("\n   Chat Complete.")
            
            if "Omega-99" in full_response or "Omega 99" in full_response:
                print("\n✅ VERIFICATION PASSED: Bot knew the secret code!")
            else:
                print("\n❌ VERIFICATION FAILED: Bot did not mention the secret code.")
                print(f"Full response: {full_response}")
                
    except Exception as e:
        print(f"\n   Error in chat: {e}")

if __name__ == "__main__":
    # 1. Create Project
    project = create_project()
    project_id = project['id']
    api_key = project['api_key']
    print(f"   API Key: {api_key}")
    
    # 2. Ingest Data
    ingest_knowledge(project_id, api_key)
    
    # 3. Chat
    asyncio.run(test_chat(project_id, api_key))
