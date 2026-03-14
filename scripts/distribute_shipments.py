import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid
import datetime
import random
from faker import Faker

fake = Faker()

def distribute_shipments():
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
    
    # 1. Activate all agents
    print("📍 Activating all agents...")
    users_ref = db.collection('users')
    agents = []
    agents_query = users_ref.where('role', '==', 'AGENT').stream()
    
    for doc in agents_query:
        data = doc.to_dict()
        if data.get('status') != 'Active':
            print(f"  ✅ Activating: {data.get('name', 'Agent')} ({doc.id})")
            doc.reference.update({'status': 'Active'})
        agents.append({
            'id': doc.id,
            'address': data.get('address', doc.id.lower()),
            'name': data.get('name', 'Agent')
        })
    
    if not agents:
        print("❌ No agents found in database.")
        return

    print(f"✅ Found {len(agents)} active agents.")

    # 2. Distribute existing shipments
    print("\n📍 Distributing existing shipments...")
    shipments_ref = db.collection('shipments')
    all_shipments = list(shipments_ref.stream())
    
    if all_shipments:
        for i, doc in enumerate(all_shipments):
            agent = agents[i % len(agents)]
            print(f"  🚚 Assigning shipment {doc.id} to {agent['name']}")
            doc.reference.update({
                'agent': agent['address'],
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
    
    # 3. Ensure every agent has at least 2 shipments
    print("\n📍 Ensuring work for every agent...")
    shipper_query = users_ref.where('role', '==', 'SHIPPER').limit(1).stream()
    shippers = list(shipper_query)
    
    if not shippers:
        print("⚠️ No shippers found for synthetic data. Creating one...")
        shipper_id = str(uuid.uuid4())
        shipper_id = shipper_id[:20]
        shipper_data = {
            'address': shipper_id.lower(),
            'role': 'SHIPPER',
            'name': 'Default Shipper',
            'email': 'shipper@example.com',
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        db.collection('users').document(shipper_id).set(shipper_data)
        shipper_address = shipper_id.lower()
    else:
        shipper_address = shippers[0].to_dict().get('address')

    for agent in agents:
        # Count current assignments
        current = len([s for s in all_shipments if s.to_dict().get('agent') == agent['address']])
        needed = 2 - current
        
        if needed > 0:
            print(f"  ➕ Creating {needed} shipments for {agent['name']}...")
            for _ in range(needed):
                shipment_id = str(uuid.uuid4())
                now = datetime.datetime.now().isoformat()
                
                # Coordinates (example: SF area)
                lat = 37.7749 + random.uniform(-0.1, 0.1)
                lng = -122.4194 + random.uniform(-0.1, 0.1)
                
                shipment_data = {
                    'orderId': f"ORD-{random.randint(1000, 9999)}",
                    'receiverName': fake.name(),
                    'receiverEmail': fake.email(),
                    'escrowAmount': "{:.4f}".format(random.uniform(0.01, 0.1)),
                    'shipper': shipper_address,
                    'agent': agent['address'],
                    'shipmentId': shipment_id,
                    'status': 'Created',
                    'createdAt': now,
                    'updatedAt': now,
                    'gpsLocation': f"{lat:.6f},{lng:.6f}"
                }
                db.collection('shipments').document(shipment_id).set(shipment_data)

    print("\n✅ Bulk assignment complete! All agents now have shipments.")

if __name__ == "__main__":
    distribute_shipments()
