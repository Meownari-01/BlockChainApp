import firebase_admin
from firebase_admin import credentials, firestore
import os

def activate_all_agents():
    # Initialize Firebase
    service_account = None
    for file in os.listdir('.'):
        if file.endswith('.json') and 'firebase' in file.lower():
            service_account = file
            break
    
    if not service_account:
        print("❌ Firebase service account JSON not found in current directory.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    users_ref = db.collection('users')
    
    # Query all agents
    agents_query = users_ref.where('role', '==', 'AGENT').stream()
    
    count = 0
    for doc in agents_query:
        data = doc.to_dict()
        if data.get('status') != 'Active':
            print(f"🔄 Activating agent: {data.get('name', 'Unknown')} ({doc.id})")
            doc.reference.update({
                'status': 'Active',
                'authorizedAt': firestore.SERVER_TIMESTAMP if not data.get('authorizedAt') else data.get('authorizedAt')
            })
            count += 1
    
    if count == 0:
        print("✅ All agents are already active.")
    else:
        print(f"✅ Successfully activated {count} agents.")

if __name__ == "__main__":
    activate_all_agents()
