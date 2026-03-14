import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid
import datetime
import random
from faker import Faker

fake = Faker()

def seed_agent_work():
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
    
    # 1. Get all agents
    print("📍 Fetching AGENT users...")
    users_ref = db.collection('users')
    agents = []
    agents_query = users_ref.where('role', '==', 'AGENT').stream()
    
    for doc in agents_query:
        data = doc.to_dict()
        agents.append({
            'id': doc.id,
            'address': data.get('address', doc.id.lower()),
            'name': data.get('name', 'Agent')
        })
        # Ensure agent is active
        if data.get('status') != 'Active':
            doc.reference.update({'status': 'Active'})
    
    if not agents:
        print("⚠️ No agents found. Creating a generic test agent...")
        test_agent_addr = "0x7890123456789012345678901234567890123456".lower()
        db.collection('users').document(test_agent_addr).set({
            'address': test_agent_addr,
            'role': 'AGENT',
            'name': 'Test Agent',
            'status': 'Active',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        agents.append({'address': test_agent_addr, 'name': 'Test Agent'})

    # 1.1 Add the specific demo agent from the screenshot if not already there
    demo_agent_addr = "0xAgentDemo1234567890AbcDef0000000000000003".lower()
    if not any(a['address'] == demo_agent_addr for a in agents):
        print(f"📍 Adding demo agent {demo_agent_addr} to seeding list...")
        db.collection('users').document(demo_agent_addr).set({
            'address': demo_agent_addr,
            'role': 'AGENT',
            'name': 'Demo Agent',
            'status': 'Active',
            'createdAt': firestore.SERVER_TIMESTAMP
        }, merge=True)
        agents.append({'address': demo_agent_addr, 'name': 'Demo Agent'})

    # 2. Find or create a shipper
    shipper_query = users_ref.where('role', '==', 'SHIPPER').limit(1).stream()
    shippers = list(shipper_query)
    if shippers:
        shipper_address = shippers[0].to_dict().get('address')
    else:
        shipper_address = "0xshipper123456789012345678901234567890123".lower()
        db.collection('users').document(shipper_address).set({
            'address': shipper_address,
            'role': 'SHIPPER',
            'name': 'Default Shipper',
            'createdAt': firestore.SERVER_TIMESTAMP
        })

    # 3. Add 4 shipments for EVERY agent (2 Created, 2 OutForDelivery)
    print(f"🚀 Seeding 4 shipments for each of the {len(agents)} agents...")
    
    for agent in agents:
        print(f"  📦 Seeding for {agent['name']} ({agent['address']})...")
        for i in range(4):
            shipment_id = str(uuid.uuid4())
            now = datetime.datetime.now().isoformat()
            status = 'Created' if i < 2 else 'OutForDelivery'
            
            # Generate a route between Hosur and Coimbatore
            # Hosur: 12.7409, 77.8253
            # Coimbatore: 11.0168, 76.9558
            
            origin_lat = 12.7409 + random.uniform(-0.1, 0.1)
            origin_lng = 77.8253 + random.uniform(-0.1, 0.1)
            
            dest_lat = 11.0168 + random.uniform(-0.1, 0.1)
            dest_lng = 76.9558 + random.uniform(-0.1, 0.1)
            
            # For "Created", location is at origin. For "OutForDelivery", it's somewhere in between.
            if status == 'Created':
                lat, lng = origin_lat, origin_lng
            else:
                ratio = random.uniform(0.3, 0.8)
                lat = origin_lat + (dest_lat - origin_lat) * ratio
                lng = origin_lng + (dest_lng - origin_lng) * ratio
            
            shipment_data = {
                'orderId': f"ORD-{random.randint(10000, 99999)}",
                'receiverName': fake.name(),
                'receiverEmail': fake.email(),
                'escrowAmount': "{:.4f}".format(random.uniform(0.01, 0.05)),
                'shipper': shipper_address,
                'agent': agent['address'],
                'shipmentId': shipment_id,
                'status': status,
                'createdAt': (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 5))).isoformat(),
                'updatedAt': now,
                'gpsLocation': f"{lat:.6f},{lng:.6f}",
                'originLocation': f"{origin_lat:.6f},{origin_lng:.6f}",
                'destinationLocation': f"{dest_lat:.6f},{dest_lng:.6f}"
            }
            db.collection('shipments').document(shipment_id).set(shipment_data)

    print("\n✅ Seeding complete! Agents should now see multiple deliveries.")

if __name__ == "__main__":
    seed_agent_work()
