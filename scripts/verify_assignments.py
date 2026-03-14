import firebase_admin
from firebase_admin import credentials, firestore
import os

def verify_distribution():
    # Find service account
    service_account = None
    for file in os.listdir('.'):
        if file.endswith('.json') and 'firebase-adminsdk' in file:
            service_account = file
            break
    
    if not service_account:
        print("❌ Firebase service account JSON not found.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    
    agents = db.collection('users').where('role', '==', 'AGENT').stream()
    agent_list = []
    for a in agents:
        d = a.to_dict()
        agent_list.append({
            'address': d.get('address'),
            'status': d.get('status'),
            'name': d.get('name')
        })
    
    shipments = db.collection('shipments').stream()
    counts = {a['address']: 0 for a in agent_list}
    active_count: int = 0
    
    for a in agent_list:
        if a['status'] == 'Active':
            active_count += 1
            
    for s in shipments:
        d = s.to_dict()
        addr = d.get('agent')
        if addr in counts:
            counts[addr] += 1
            
    print(f"📊 Verification Results:")
    print(f"Total Agents: {len(agent_list)}")
    print(f"Active Agents: {active_count}")
    print(f"Assignments per Agent: {counts}")
    
    all_have_work = all(c >= 2 for c in counts.values())
    if all_have_work:
        print("✅ Success: All agents have at least 2 shipments assigned.")
    else:
        print("⚠️ Warning: Some agents have fewer than 2 shipments.")

if __name__ == "__main__":
    verify_distribution()
