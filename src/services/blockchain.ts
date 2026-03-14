// src/services/blockchain.ts
import { ethers, BrowserProvider, JsonRpcSigner, Contract } from 'ethers';
import { BlockchainShipment, Shipment, ShipmentStatus } from '../types';

// ABI for ProofOfDelivery contract
const CONTRACT_ABI = [
    'function createShipment(string calldata orderId, bytes32 otpHash) external payable returns (uint256)',
    'function assignAgent(uint256 shipmentId, address agentAddress) external',
    'function markOutForDelivery(uint256 shipmentId) external',
    'function confirmDelivery(uint256 shipmentId, string calldata gpsLocation, string calldata photoIPFSHash, string calldata providedOtp) external',
    'function disputeShipment(uint256 shipmentId) external',
    'function getShipment(uint256 shipmentId) external view returns (tuple(uint256 shipmentId, string orderId, address shipper, address agent, uint256 createdAt, uint256 deliveredAt, string gpsLocation, bytes32 otpHash, string photoIPFSHash, uint8 status, uint256 escrowAmount))',
    'function getShipmentsByShipper(address shipper) external view returns (uint256[])',
    'function grantRole(bytes32 role, address account) external',
    'function revokeRole(bytes32 role, address account) external',
    'function hasRole(bytes32 role, address account) external view returns (bool)',
    'event ShipmentCreated(uint256 indexed shipmentId, string orderId, address indexed shipper, bytes32 otpHash, uint256 escrowAmount)',
    'event AgentAssigned(uint256 indexed shipmentId, address indexed agent)',
    'event OutForDelivery(uint256 indexed shipmentId, address indexed agent)',
    'event ShipmentDelivered(uint256 indexed shipmentId, address indexed agent, string gpsLocation, string photoIPFSHash)',
    'event ShipmentDisputed(uint256 indexed shipmentId, address indexed disputedBy)',
    'event EscrowReleased(uint256 indexed shipmentId, address indexed agent, uint256 amount)',
];

const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '';
const SEPOLIA_RPC = process.env.EXPO_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org';

const STATUS_MAP: Record<number, ShipmentStatus> = {
    0: 'Created',
    1: 'OutForDelivery',
    2: 'Delivered',
    3: 'Disputed',
};

let _provider: BrowserProvider | null = null;
let _signer: JsonRpcSigner | null = null;
let _contract: Contract | null = null;

export const BlockchainService = {
    /**
     * Set the WalletConnect provider (called after wallet connection)
     */
    setProvider(walletProvider: ethers.Eip1193Provider): void {
        _provider = new ethers.BrowserProvider(walletProvider);
        _signer = null;
        _contract = null;
    },

    /**
     * Get JSON-RPC read-only provider for Sepolia
     */
    getReadProvider(): ethers.JsonRpcProvider {
        return new ethers.JsonRpcProvider(SEPOLIA_RPC);
    },

    /**
     * Get the BrowserProvider (WalletConnect)
     */
    getProvider(): BrowserProvider {
        if (!_provider) throw new Error('Provider not initialized. Connect wallet first.');
        return _provider;
    },

    /**
     * Get signer (lazy init)
     */
    async getSigner(): Promise<JsonRpcSigner> {
        if (!_signer) {
            _signer = await BlockchainService.getProvider().getSigner();
        }
        return _signer;
    },

    /**
     * Get typed contract instance
     */
    async getContract(readOnly = false): Promise<Contract> {
        if (readOnly) {
            return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, BlockchainService.getReadProvider());
        }
        if (!_contract) {
            const signer = await BlockchainService.getSigner();
            _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        }
        return _contract;
    },

    /**
     * Generate a mock transaction for Demo mode when no real wallet is connected.
     */
    async __mockTx(): Promise<ethers.TransactionResponse> {
        console.warn('DEMO MODE: Simulating blockchain transaction since no provider is connected.');
        await new Promise((r) => setTimeout(r, Math.random() * 500 + 500));
        const hash = '0xmock' + Math.random().toString(16).slice(2).padStart(60, '0');
        return {
            hash,
            wait: async () => {
                await new Promise((r) => setTimeout(r, 1000));
                return { status: 1, transactionHash: hash, blockNumber: 12345 } as any;
            }
        } as unknown as ethers.TransactionResponse;
    },

    /**
     * Create a new shipment with escrow payment
     */
    async createShipment(orderId: string, otpHash: string, escrowEth: string): Promise<ethers.TransactionResponse> {
        if (!_provider) return BlockchainService.__mockTx();
        const contract = await BlockchainService.getContract();
        const value = ethers.parseEther(escrowEth);
        const tx = await contract.createShipment(orderId, otpHash, { value });
        return tx as ethers.TransactionResponse;
    },

    /**
     * Assign agent to a shipment
     */
    async assignAgent(shipmentId: string, agentAddress: string): Promise<ethers.TransactionResponse> {
        if (!_provider) return BlockchainService.__mockTx();
        const contract = await BlockchainService.getContract();
        const tx = await contract.assignAgent(BigInt(shipmentId), agentAddress);
        return tx as ethers.TransactionResponse;
    },

    /**
     * Mark shipment as out for delivery
     */
    async markOutForDelivery(shipmentId: string): Promise<ethers.TransactionResponse> {
        if (!_provider) return BlockchainService.__mockTx();
        const contract = await BlockchainService.getContract();
        const tx = await contract.markOutForDelivery(BigInt(shipmentId));
        return tx as ethers.TransactionResponse;
    },

    /**
     * Confirm delivery with OTP, GPS, and IPFS hash
     */
    async confirmDelivery(
        shipmentId: string,
        gpsLocation: string,
        photoIPFSHash: string,
        providedOtp: string,
    ): Promise<ethers.TransactionResponse> {
        if (!_provider) return BlockchainService.__mockTx();
        const contract = await BlockchainService.getContract();
        const tx = await contract.confirmDelivery(BigInt(shipmentId), gpsLocation, photoIPFSHash, providedOtp);
        return tx as ethers.TransactionResponse;
    },

    /**
     * Dispute a shipment
     */
    async disputeShipment(shipmentId: string): Promise<ethers.TransactionResponse> {
        if (!_provider) return BlockchainService.__mockTx();
        const contract = await BlockchainService.getContract();
        const tx = await contract.disputeShipment(BigInt(shipmentId));
        return tx as ethers.TransactionResponse;
    },

    /**
     * Get full shipment data from chain
     */
    async getShipment(shipmentId: string): Promise<Shipment> {
        const contract = await BlockchainService.getContract(true);
        const raw = await contract.getShipment(BigInt(shipmentId));
        return BlockchainService.parseShipment(raw);
    },

    /**
     * Get all shipment IDs for a shipper address
     */
    async getShipmentsByShipper(shipperAddress: string): Promise<string[]> {
        const contract = await BlockchainService.getContract(true);
        const ids: bigint[] = await contract.getShipmentsByShipper(shipperAddress);
        return ids.map((id) => id.toString());
    },

    /**
     * Parse raw blockchain tuple to typed Shipment
     */
    parseShipment(raw: BlockchainShipment): Shipment {
        return {
            shipmentId: raw.shipmentId.toString(),
            orderId: raw.orderId,
            shipper: raw.shipper,
            agent: raw.agent,
            receiverName: '',
            receiverEmail: '',
            createdAt: Number(raw.createdAt),
            deliveredAt: Number(raw.deliveredAt),
            gpsLocation: raw.gpsLocation,
            otpHash: raw.otpHash,
            photoIPFSHash: raw.photoIPFSHash,
            status: STATUS_MAP[raw.status] ?? 'Created',
            escrowAmount: ethers.formatEther(raw.escrowAmount),
        };
    },

    /**
     * Wait for a transaction to be confirmed
     */
    async waitForTransaction(tx: ethers.TransactionResponse, confirmations = 1): Promise<ethers.TransactionReceipt | null> {
        return tx.wait(confirmations);
    },

    /**
     * Poll for transaction receipt (fallback)
     */
    async pollForReceipt(txHash: string, maxTries = 30): Promise<ethers.TransactionReceipt | null> {
        const provider = BlockchainService.getReadProvider();
        for (let i = 0; i < maxTries; i++) {
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) return receipt;
            await new Promise((r) => setTimeout(r, 3000));
        }
        return null;
    },

    /**
     * Listen to contract events
     */
    async listenToEvents(eventName: string, callback: (...args: unknown[]) => void): Promise<void> {
        const contract = await BlockchainService.getContract(true);
        contract.on(eventName, callback);
    },

    /**
     * Remove all event listeners
     */
    async removeAllListeners(): Promise<void> {
        if (_contract) {
            await _contract.removeAllListeners();
        }
    },

    /**
     * Format address for display
     */
    formatAddress(addr: string): string {
        if (!addr || addr.length < 10) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    },

    /**
     * Get Etherscan URL for Sepolia
     */
    getSepoliaEtherscanUrl(txHash: string): string {
        return `https://sepolia.etherscan.io/tx/${txHash}`;
    },

    getSepoliaAddressUrl(address: string): string {
        return `https://sepolia.etherscan.io/address/${address}`;
    },

    /**
     * Reset provider on disconnect
     */
    disconnect(): void {
        _provider = null;
        _signer = null;
        _contract = null;
    },
};
