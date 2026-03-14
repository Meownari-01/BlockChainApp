import os
import sys
import shutil
import firebase_admin
from firebase_admin import credentials, firestore
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

def check_disk_space():
    print("\n[1] Checking Disk Space...")
    total, used, free = shutil.disk_usage("/")
    free_gb = free // (2**30)
    print(f"  Free Space on C: {free_gb} GB")
    if free_gb < 10:
        print("  ! WARNING: Less than 10GB free. Android Emulator may fail to launch.")
    else:
        print("  ✓ OK: Sufficient disk space.")

def check_android_sdk():
    print("\n[2] Checking Android Environment...")
    android_home = os.getenv("ANDROID_HOME")
    if not android_home:
        # Check common locations
        common = os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk")
        if os.path.exists(common):
            print(f"  ! WARNING: ANDROID_HOME is not set, but SDK found at: {common}")
            print(f"  Action: Set ANDROID_HOME={common}")
        else:
            print("  ! ERROR: Android SDK not found. Please install Android Studio.")
    else:
        print(f"  ✓ OK: ANDROID_HOME set to {android_home}")
        adb = os.path.join(android_home, "platform-tools", "adb.exe")
        if os.path.exists(adb):
            print("  ✓ OK: adb found.")
        else:
            print("  ! ERROR: adb.exe missing in platform-tools.")

def check_firebase():
    print("\n[3] Checking Firebase Configuration...")
    # Find service account
    sa_file = None
    for f in os.listdir('.'):
        if f.endswith('.json') and 'firebase-adminsdk' in f:
            sa_file = f
            break
    
    if sa_file:
        print(f"  ✓ OK: Found service account: {sa_file}")
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(sa_file)
                firebase_admin.initialize_app(cred)
            db = firestore.client()
            # Try a small read
            db.collection("users").limit(1).get()
            print("  ✓ OK: Successfully connected to Firestore.")
        except Exception as e:
            print(f"  ! ERROR: Failed to connect to Firestore: {e}")
    else:
        print("  ! ERROR: Firebase service account JSON missing in root directory.")

def check_blockchain():
    print("\n[4] Checking Blockchain Settings...")
    rpc = os.getenv("SEPOLIA_RPC_URL")
    contract = os.getenv("CONTRACT_ADDRESS")
    pkey = os.getenv("ADMIN_PRIVATE_KEY")
    
    if not rpc or "rpc.sepolia.org" in rpc:
        print(f"  ~ INFO: Using default Sepolia RPC: {rpc}")
    
    if not contract or "YourContractAddress" in contract:
        print("  ! ERROR: CONTRACT_ADDRESS is still a placeholder in .env")
    else:
        print(f"  ✓ OK: Contract address set: {contract}")

    if not pkey or "your_admin_wallet" in pkey:
        print("  ! ERROR: ADMIN_PRIVATE_KEY is still a placeholder in .env")
    else:
        print("  ✓ OK: Private key is set.")

    # Check RPC Connectivity
    if rpc:
        try:
            w3 = Web3(Web3.HTTPProvider(rpc))
            if w3.is_connected():
                print(f"  ✓ OK: Connected to Sepolia RPC.")
                if pkey and not pkey.startswith("your_"):
                    account = w3.eth.account.from_key(pkey)
                    balance = w3.eth.get_balance(account.address)
                    print(f"  ✓ OK: Wallet {account.address} connected. Balance: {w3.from_wei(balance, 'ether')} ETH")
            else:
                print("  ! ERROR: Could not connect to Sepolia RPC.")
        except Exception as e:
            print(f"  ! ERROR: Blockchain connection error: {e}")

if __name__ == "__main__":
    print("=== ChainDeliver Project Doctor ===")
    check_disk_space()
    check_android_sdk()
    check_firebase()
    check_blockchain()
    print("\n==================================")
    print("Fix the '! ERROR' items above to get the project fully running.")
