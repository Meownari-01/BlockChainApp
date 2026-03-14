import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, firestore
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
RPC_URL = os.getenv("SEPOLIA_RPC_URL", "https://rpc.sepolia.org")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY") # Or Shipper Private Key
SERVICE_ACCOUNT_PATH = "techmeow-44f21-firebase-adminsdk-fbsvc-ed1492ed4d.json"

if not CONTRACT_ADDRESS or not PRIVATE_KEY:
    print("Error: CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY not found in .env")
    sys.exit(1)

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    print("Error: Could not connect to Ethereum RPC")
    sys.exit(1)

# Contract ABI (Partial for assignAgent)
ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "shipmentId", "type": "uint256"},
            {"internalType": "address", "name": "agentAddress", "type": "address"}
        ],
        "name": "assignAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

def is_valid_eth_address(address):
    return Web3.is_address(address)

def assign_shipment(shipment_id_str, agent_address):
    try:
        # 1. Update Firestore
        print(f"\n[Firestore] Updating shipment {shipment_id_str}...")
        doc_ref = db.collection("shipments").document(shipment_id_str)
        doc = doc_ref.get()
        
        if not doc.exists:
            print(f"  ! ERROR: Shipment {shipment_id_str} not found in Firestore")
            return

        doc_ref.update({
            "agent": agent_address.lower(),
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        print("  ✓ Success: Agent assigned in Firestore.")

        # 2. Blockchain Transaction
        print(f"\n[Blockchain] Checking address and credentials...")
        
        if not is_valid_eth_address(agent_address):
            print(f"  ! SKIP: '{agent_address}' is not a valid Ethereum address.")
            print("    The blockchain assignment requires a real 0x... address.")
            return

        if not CONTRACT_ADDRESS or not PRIVATE_KEY or "YourContractAddress" in CONTRACT_ADDRESS or "your_admin_wallet" in PRIVATE_KEY:
            print("  ! SKIP: Blockchain credentials are missing or still placeholders in .env.")
            print("    Please set real CONTRACT_ADDRESS and ADMIN_PRIVATE_KEY.")
            return

        print(f"  Assigning agent {agent_address} on-chain...")
        account = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)
        
        # Convert hex string ID to integer for the contract
        try:
            # Try to convert from hex (as stored by ethers.id)
            numeric_id = int(shipment_id_str, 16)
        except ValueError:
            # Fallback to direct integer if it's not hex
            numeric_id = int(shipment_id_str)

        nonce = w3.eth.get_transaction_count(account.address)
        
        tx = contract.functions.assignAgent(
            numeric_id,
            Web3.to_checksum_address(agent_address)
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"  ✓ Success: Transaction sent! Hash: {tx_hash.hex()}")
        print("  Waiting for confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"  ✓ Confirmed in block {receipt['blockNumber']}")

    except Exception as e:
        print(f"  ! ERROR: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python assign_shipment.py <shipment_id> <agent_address>")
        sys.exit(1)
        
    s_id = sys.argv[1]
    a_addr = sys.argv[2]
    assign_shipment(s_id, a_addr)
