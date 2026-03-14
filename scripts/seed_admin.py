import firebase_admin
from firebase_admin import credentials, auth, firestore
import sys
import os

def find_service_account():
    """Finds the Firebase service account JSON file."""
    for file in os.listdir('.'):
        if file.endswith('.json') and 'firebase-adminsdk' in file:
            return file
    return None

def seed_admin(email, password, name="System Admin"):
    service_account_path = find_service_account()
    if not service_account_path:
        print("Error: Firebase service account JSON not found in the root directory.")
        return

    print(f"Using service account: {service_account_path}")
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    try:
        # 1. Create/Update user in Firebase Auth
        try:
            user = auth.get_user_by_email(email)
            print(f"User already exists in Auth: {user.uid}. Updating password...")
            auth.update_user(user.uid, password=password)
        except auth.UserNotFoundError:
            print(f"Creating new user in Auth: {email}...")
            user = auth.create_user(email=email, password=password, display_name=name)
        
        uid = user.uid
        
        # 2. Create/Update user in Firestore
        print(f"Setting role to ADMIN in Firestore for UID: {uid}...")
        user_ref = db.collection('users').document(uid.lower())
        user_ref.set({
            'address': uid.lower(), # App uses lowered UID as address for email users
            'role': 'ADMIN',
            'name': name,
            'email': email,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }, merge=True)

        print(f"Successfully seeded Admin user: {email}")
        print(f"UID: {uid}")
        print("\nYou can now login to the app with these credentials.")

    except Exception as e:
        print(f"Error seeding admin: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/seed_admin.py <email> <password> [name]")
        # Provide a default for ease of use if the user just wants it done
        email = "admin@chaindeliver.com"
        password = "AdminPassword123!"
        print(f"Using defaults: {email} / {password}")
        seed_admin(email, password)
    else:
        email = sys.argv[1]
        password = sys.argv[2]
        name = sys.argv[3] if len(sys.argv) > 3 else "System Admin"
        seed_admin(email, password, name)
