// src/types/index.ts
export type UserRole = 'ADMIN' | 'SHIPPER' | 'AGENT' | 'PUBLIC';

export type ShipmentStatus = 'Created' | 'OutForDelivery' | 'Delivered' | 'Disputed';

export interface User {
    address: string;
    role: UserRole;
    name?: string;
    email?: string;
    createdAt?: string;
}

export interface Shipment {
    shipmentId: string;
    orderId: string;
    shipper: string;
    agent: string;
    receiverName: string;
    receiverEmail: string;
    createdAt: number;
    deliveredAt: number;
    gpsLocation: string;
    otpHash: string;
    photoIPFSHash: string;
    status: ShipmentStatus;
    escrowAmount: string; // in ETH
    txHash?: string;
    blockNumber?: number;
}

export interface ShipmentMetadata {
    shipmentId: string;
    orderId: string;
    shipper: string;
    agent: string;
    receiverName: string;
    receiverEmail: string;
    escrowAmount: string;
    status: ShipmentStatus;
    createdAt: string;
    otpHash: string;
    txHash?: string;
    deliveryTxHash?: string;
    photoUrl?: string;
    gpsLocation?: string;
    originLocation?: string;
    destinationLocation?: string;
    deliveredAt?: string;
    blockchainHash?: string;
}

export interface Agent {
    address: string;
    name: string;
    status: 'Active' | 'Revoked';
    authorizedAt: string;
    revokedAt?: string;
    deliveriesCompleted?: number;
}

export interface Shipper {
    address: string;
    name: string;
    status: 'Active' | 'Revoked';
    authorizedAt: string;
    revokedAt?: string;
}

export interface Analytics {
    totalShipments: number;
    delivered: number;
    disputed: number;
    inTransit: number;
    created: number;
    totalVolumeEth: string;
    totalAgents?: number;
}

export interface IPFSUploadResult {
    cid: string;
    url: string;
}

export interface CreateShipmentRequest {
    orderId: string;
    receiverName: string;
    receiverEmail: string;
    agentAddress: string;
    escrowAmount: string;
    shipper: string;
}

export interface CreateShipmentResponse {
    otp: string;
    otpHash: string;
    shipmentId: string;
    orderId: string;
}

export interface BlockchainShipment {
    shipmentId: bigint;
    orderId: string;
    shipper: string;
    agent: string;
    createdAt: bigint;
    deliveredAt: bigint;
    gpsLocation: string;
    otpHash: string;
    photoIPFSHash: string;
    status: number; // 0=Created, 1=OutForDelivery, 2=Delivered, 3=Disputed
    escrowAmount: bigint;
}

export interface TransactionStep {
    id: string;
    label: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    detail?: string;
}

export interface AuthSession {
    address: string;
    role: UserRole;
    name?: string;
    email?: string;
}
