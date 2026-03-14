import os
import random
import uuid
import datetime
from faker import Faker
import firebase_admin
from firebase_admin import credentials, firestore
import qrcode
import urllib.parse

# Initialize Faker
fake = Faker()

# Create directory for QR codes
os.makedirs('qrcodes', exist_ok=True)

def find_service_account():
    """Finds a JSON file that looks like a Firebase service account."""
    for file in os.listdir('.'):
        if file.endswith('.json') and 'firebase-adminsdk' in file:
            return file
    if os.path.exists('firebase-service-account.json'):
        return 'firebase-service-account.json'
    return None

def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    path = find_service_account()
    if not path:
        print("Error: Firebase service account JSON not found.")
        print("Please place your service account JSON in the root directory.")
        return None
    
    print(f"Using service account: {path}")
    cred = credentials.Certificate(path)
    firebase_admin.initialize_app(cred)
    return firestore.client()

def create_synthetic_users(db, count=10):
    """Creates synthetic researchers/users in Firestore."""
    roles = ['AGENT', 'SHIPPER']
    user_ids = []
    
    print(f"Generating {count} synthetic users...")
    for _ in range(count):
        uid_full = str(uuid.uuid4())
        uid = uid_full[:20]  # Ensure it's a string slice
        role = random.choice(roles)
        now = datetime.datetime.now().isoformat()
        user_data = {
            'address': uid.lower(),
            'role': role,
            'name': fake.name(),
            'email': fake.email(),
            'createdAt': now,
            'updatedAt': now
        }
        
        db.collection('users').document(uid).set(user_data)
        user_ids.append({'uid': uid, 'role': role, 'address': uid.lower()})
        print(f"  Created {role}: {user_data['name']} ({uid})")
        
    return user_ids

def create_synthetic_shipments(db, user_ids, count=20):
    """Creates synthetic shipments in Firestore."""
    shippers = [u['address'] for u in user_ids if u['role'] == 'SHIPPER']
    agents = [u['address'] for u in user_ids if u['role'] == 'AGENT']
    
    if not shippers or not agents:
        print("Error: Need at least one shipper and one agent to create shipments.")
        return

    statuses = ['Created', 'PickedUp', 'OutForDelivery', 'Delivered', 'Cancelled', 'Disputed']
    
    print(f"Generating {count} synthetic shipments...")
    for _ in range(count):
        shipment_id = str(uuid.uuid4())
        shipper_wallet = random.choice(shippers)
        agent_wallet = random.choice(agents)
        
        # Generate realistic coordinates (e.g., around San Francisco area)
        lat = 37.7749 + random.uniform(-0.1, 0.1)
        lng = -122.4194 + random.uniform(-0.1, 0.1)
        gps_location = f"{lat:.6f},{lng:.6f}"
        
        shipment_data = {
            'orderId': f"ORD-{random.randint(1000, 9999)}",
            'receiverName': fake.name(),
            'receiverEmail': fake.email(),
            'escrowAmount': "{:.4f}".format(random.uniform(0.01, 0.5)),
            'shipper': shipper_wallet,
            'agent': agent_wallet,
            'shipmentId': shipment_id,
            'status': random.choice(statuses),
            'createdAt': datetime.datetime.now().isoformat(),
            'otpHash': '0x' + str(uuid.uuid4()).replace('-', ''), # Mock hash
            'gpsLocation': gps_location,
        }
        
        db.collection('shipments').document(shipment_id).set(shipment_data)
        
        # Generate QR Code image
        query_params = {
            'orderId': shipment_data['orderId'],
            'receiverName': shipment_data['receiverName'],
            'agent': shipment_data['agent']
        }
        query_string = urllib.parse.urlencode(query_params)
        qr_data = f"chaindeliver://public/status/{shipment_id}?{query_string}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(f"qrcodes/shipment_{shipment_data['orderId']}.png")
        
        print(f"  Created Shipment: {shipment_data['orderId']} ({shipment_id}) - QR saved")

def main():
    db = initialize_firebase()
    if not db:
        return

    # Seed data
    users = create_synthetic_users(db, count=10)
    create_synthetic_shipments(db, users, count=20)
    
    print("\nData seeding complete!")

if __name__ == "__main__":
    main()
