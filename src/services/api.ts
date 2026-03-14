// src/services/api.ts
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    updateDoc,
    serverTimestamp,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ethers } from 'ethers';
import {
    User,
    UserRole,
    ShipmentMetadata,
    Agent,
    Shipper,
    Analytics,
    IPFSUploadResult,
    CreateShipmentRequest,
    CreateShipmentResponse,
} from '../types';

const USERS_COLLECTION = 'users';
const SHIPMENTS_COLLECTION = 'shipments';

/**
 * Utility to generate random OTP and its hash
 */
function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = ethers.id(otp); // This is equivalent to keccak256(utf8(otp))
    return { otp, otpHash };
}

export const ApiService = {
    /**
     * Get user role from Firestore
     */
    async getUserRole(address: string): Promise<{ role: UserRole; user: User }> {
        const docRef = doc(db, USERS_COLLECTION, address.toLowerCase());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { 
                role: data.role as UserRole, 
                user: { address, ...data } as User 
            };
        }
        throw new Error('User not found');
    },

    /**
     * Register or update user in Firestore
     */
    async registerUser(user: { address: string; role: UserRole; name?: string; email?: string }): Promise<User> {
        const docRef = doc(db, USERS_COLLECTION, user.address.toLowerCase());
        const docSnap = await getDoc(docRef);
        
        const userData = {
            ...user,
            address: user.address.toLowerCase(),
            updatedAt: serverTimestamp(),
            ...(docSnap.exists() ? {} : { createdAt: serverTimestamp() }),
        };
        
        await setDoc(docRef, userData, { merge: true });
        return { ...userData, createdAt: docSnap.exists() ? docSnap.data().createdAt : new Date().toISOString() } as any;
    },

    /**
     * Create shipment metadata and generate OTP in Firestore
     */
    async createShipmentMetadata(data: CreateShipmentRequest): Promise<CreateShipmentResponse> {
        const { otp, otpHash } = generateOTP();
        const shipmentId = ethers.id(`${data.orderId}-${Date.now()}`); // Unique ID based on order and time
        
        const shipmentData: ShipmentMetadata = {
            orderId: data.orderId,
            receiverName: data.receiverName,
            receiverEmail: data.receiverEmail,
            escrowAmount: data.escrowAmount,
            shipper: data.shipper.toLowerCase(),
            agent: data.agentAddress.toLowerCase(),
            shipmentId,
            status: 'Created',
            createdAt: new Date().toISOString(),
            otpHash,
        };

        const docRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
        await setDoc(docRef, shipmentData);

        return {
            otp,
            otpHash,
            shipmentId,
            orderId: data.orderId,
        };
    },

    /**
     * Get shipment metadata by ID
     */
    async getShipment(id: string): Promise<ShipmentMetadata> {
        // 1. Try direct lookup by document ID (shipmentId)
        const docRef = doc(db, SHIPMENTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { shipmentId: docSnap.id, ...docSnap.data() } as ShipmentMetadata;
        }

        // 2. Fallback: Search by orderId
        const q = query(collection(db, SHIPMENTS_COLLECTION), where('orderId', '==', id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const firstDoc = querySnapshot.docs[0];
            return { shipmentId: firstDoc.id, ...firstDoc.data() } as ShipmentMetadata;
        }

        throw new Error('Shipment not found. Check your ID and try again.');
    },

    /**
     * Update shipment metadata
     */
    async updateShipment(id: string, data: Partial<ShipmentMetadata>): Promise<ShipmentMetadata> {
        const docRef = doc(db, SHIPMENTS_COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
        
        const updated = await getDoc(docRef);
        return { shipmentId: updated.id, ...updated.data() } as ShipmentMetadata;
    },

    /**
     * Get all shipments for a shipper address
     */
    async getShipmentsByShipper(address: string): Promise<ShipmentMetadata[]> {
        const q = query(
            collection(db, SHIPMENTS_COLLECTION), 
            where('shipper', '==', address.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
    },

    /**
     * Get all shipments for an agent address
     */
    async getShipmentsByAgent(address: string): Promise<ShipmentMetadata[]> {
        const q = query(
            collection(db, SHIPMENTS_COLLECTION), 
            where('agent', '==', address.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
    },

    /**
     * Upload photo to IPFS - Fallback to generic IPFS or direct storage if needed
     * For now, this requires a backend or a specialized frontend IPFS client.
     * Since the user specifically asked about Firebase storage, we'll implement direct Firebase Storage upload.
     */
    async uploadToIPFS(photoUri: string): Promise<IPFSUploadResult> {
        // Since we migrated to Firestore, we'll use Firebase Storage for images
        // and Return a CID-like URL for the hash.
        const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
        const storage = getStorage();
        
        const filename = `deliveries/photo_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        
        const response = await fetch(photoUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        
        const url = await getDownloadURL(storageRef);
        return {
            cid: ethers.id(url), // Mocking a CID from the URL hash
            url: url
        };
    },

    /**
     * Authorize a new agent (admin only)
     */
    async authorizeAgent(address: string, name: string): Promise<Agent> {
        const docRef = doc(db, USERS_COLLECTION, address.toLowerCase());
        const agentData: Agent = {
            address: address.toLowerCase(),
            name,
            status: 'Active',
            authorizedAt: new Date().toISOString(),
        };
        
        await setDoc(docRef, { ...agentData, role: 'AGENT' }, { merge: true });
        return agentData;
    },

    /**
     * Revoke agent authorization (admin only)
     */
    async revokeAgent(address: string): Promise<{ success: boolean }> {
        const docRef = doc(db, USERS_COLLECTION, address.toLowerCase());
        await updateDoc(docRef, {
            status: 'Revoked',
            revokedAt: new Date().toISOString(),
        });
        return { success: true };
    },

    /**
     * Get list of all agents
     */
    async getAgents(): Promise<Agent[]> {
        const q = query(collection(db, USERS_COLLECTION), where('role', '==', 'AGENT'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as Agent);
    },

    /**
     * Get analytics summary
     */
    async getAnalytics(): Promise<Analytics> {
        const querySnapshot = await getDocs(collection(db, SHIPMENTS_COLLECTION));
        const shipments = querySnapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
        
        const analytics: Analytics = {
            totalShipments: shipments.length,
            delivered: shipments.filter(s => s.status === 'Delivered').length,
            disputed: shipments.filter(s => s.status === 'Disputed').length,
            inTransit: shipments.filter(s => s.status === 'OutForDelivery').length,
            created: shipments.filter(s => s.status === 'Created').length,
            totalVolumeEth: shipments.reduce((acc, s) => acc + parseFloat(s.escrowAmount || '0'), 0).toString(),
        };
        
        return analytics;
    },

    /**
     * Get all shipments (admin only)
     */
    async getAllShipments(): Promise<ShipmentMetadata[]> {
        const querySnapshot = await getDocs(collection(db, SHIPMENTS_COLLECTION));
        return querySnapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
    },

    /**
     * Subscribe to shipments for a shipper (Real-time)
     */
    subscribeToShipmentsByShipper(address: string, callback: (shipments: ShipmentMetadata[]) => void) {
        const q = query(
            collection(db, SHIPMENTS_COLLECTION), 
            where('shipper', '==', address.toLowerCase())
        );
        return onSnapshot(q, (snapshot) => {
            const shipments = snapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
            callback(shipments);
        });
    },

    /**
     * Subscribe to shipments for an agent (Real-time)
     */
    subscribeToShipmentsByAgent(address: string, callback: (shipments: ShipmentMetadata[]) => void) {
        const q = query(
            collection(db, SHIPMENTS_COLLECTION), 
            where('agent', '==', address.toLowerCase())
        );
        return onSnapshot(q, (snapshot) => {
            const shipments = snapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
            callback(shipments);
        });
    },

    /**
     * Subscribe to all shipments (Real-time admin)
     */
    subscribeToAllShipments(callback: (shipments: ShipmentMetadata[]) => void) {
        const q = collection(db, SHIPMENTS_COLLECTION);
        return onSnapshot(q, (snapshot) => {
            const shipments = snapshot.docs.map(doc => ({ shipmentId: doc.id, ...doc.data() } as ShipmentMetadata));
            callback(shipments);
        });
    },

    /**
     * Subscribe to all agents (Real-time admin)
     */
    subscribeToAgents(callback: (agents: Agent[]) => void) {
        const q = query(collection(db, USERS_COLLECTION), where('role', '==', 'AGENT'));
        return onSnapshot(q, (snapshot) => {
            const agents = snapshot.docs.map(doc => doc.data() as Agent);
            callback(agents);
        });
    },

    /**
     * Authorize a new shipper (admin only)
     */
    async authorizeShipper(address: string, name: string): Promise<Shipper> {
        const docRef = doc(db, USERS_COLLECTION, address.toLowerCase());
        const shipperData: Shipper = {
            address: address.toLowerCase(),
            name,
            status: 'Active',
            authorizedAt: new Date().toISOString(),
        };
        
        await setDoc(docRef, { ...shipperData, role: 'SHIPPER' }, { merge: true });
        return shipperData;
    },

    /**
     * Revoke shipper authorization (admin only)
     */
    async revokeShipper(address: string): Promise<{ success: boolean }> {
        const docRef = doc(db, USERS_COLLECTION, address.toLowerCase());
        await updateDoc(docRef, {
            status: 'Revoked',
            revokedAt: new Date().toISOString(),
        });
        return { success: true };
    },

    /**
     * Subscribe to all shippers (Real-time admin)
     */
    subscribeToShippers(callback: (shippers: Shipper[]) => void) {
        const q = query(collection(db, USERS_COLLECTION), where('role', '==', 'SHIPPER'));
        return onSnapshot(q, (snapshot) => {
            const shippers = snapshot.docs.map(doc => doc.data() as Shipper);
            callback(shippers);
        });
    },
};
