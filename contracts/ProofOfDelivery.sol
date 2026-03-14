// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProofOfDelivery
 * @notice Immutable on-chain delivery verification with escrow, OTP, GPS, and IPFS proof.
 * @dev Deployed on Ethereum Sepolia Testnet
 */
contract ProofOfDelivery is AccessControl, ReentrancyGuard {
    bytes32 public constant SHIPPER_ROLE = keccak256("SHIPPER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    uint256 private _shipmentCounter;

    enum Status {
        Created,        // 0
        OutForDelivery, // 1
        Delivered,      // 2
        Disputed        // 3
    }

    struct Shipment {
        uint256 shipmentId;
        string  orderId;
        address shipper;
        address agent;
        uint256 createdAt;
        uint256 deliveredAt;
        string  gpsLocation;
        bytes32 otpHash;
        string  photoIPFSHash;
        Status  status;
        uint256 escrowAmount;
    }

    // shipmentId => Shipment
    mapping(uint256 => Shipment) private _shipments;
    // shipper address => list of shipment IDs
    mapping(address => uint256[]) private _shipperShipments;

    // ── Custom Errors ──────────────────────────────────────────────────────────
    error NotShipper();
    error NotAgent();
    error NotAssignedAgent();
    error NotAdminOrShipper();
    error ShipmentNotFound();
    error InvalidStatus(Status current, Status expected);
    error InvalidOTP();
    error ZeroEscrow();
    error TransferFailed();

    // ── Events ─────────────────────────────────────────────────────────────────
    event ShipmentCreated(uint256 indexed shipmentId, string orderId, address indexed shipper, bytes32 otpHash, uint256 escrowAmount);
    event AgentAssigned(uint256 indexed shipmentId, address indexed agent);
    event OutForDelivery(uint256 indexed shipmentId, address indexed agent);
    event ShipmentDelivered(uint256 indexed shipmentId, address indexed agent, string gpsLocation, string photoIPFSHash);
    event ShipmentDisputed(uint256 indexed shipmentId, address indexed disputedBy);
    event EscrowReleased(uint256 indexed shipmentId, address indexed agent, uint256 amount);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SHIPPER_ROLE, admin);
    }

    // ── Shipper Functions ──────────────────────────────────────────────────────

    /**
     * @notice Create a new shipment with escrow. Caller must have SHIPPER_ROLE.
     * @param orderId Human-readable order identifier
     * @param otpHash keccak256 hash of the 6-digit OTP (stored off-chain)
     * @return shipmentId The new shipment ID
     */
    function createShipment(string calldata orderId, bytes32 otpHash)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        if (!hasRole(SHIPPER_ROLE, msg.sender)) revert NotShipper();
        if (msg.value == 0) revert ZeroEscrow();

        uint256 newId = ++_shipmentCounter;

        _shipments[newId] = Shipment({
            shipmentId:    newId,
            orderId:       orderId,
            shipper:       msg.sender,
            agent:         address(0),
            createdAt:     block.timestamp,
            deliveredAt:   0,
            gpsLocation:   "",
            otpHash:       otpHash,
            photoIPFSHash: "",
            status:        Status.Created,
            escrowAmount:  msg.value
        });

        _shipperShipments[msg.sender].push(newId);

        emit ShipmentCreated(newId, orderId, msg.sender, otpHash, msg.value);
        return newId;
    }

    /**
     * @notice Assign a delivery agent to a shipment.
     * @param shipmentId The shipment to assign
     * @param agentAddress The authorized agent's wallet address
     */
    function assignAgent(uint256 shipmentId, address agentAddress) external {
        Shipment storage s = _getShipment(shipmentId);
        if (s.shipper != msg.sender) revert NotShipper();
        if (!hasRole(AGENT_ROLE, agentAddress)) revert NotAgent();
        if (s.status != Status.Created) revert InvalidStatus(s.status, Status.Created);

        s.agent = agentAddress;
        emit AgentAssigned(shipmentId, agentAddress);
    }

    // ── Agent Functions ────────────────────────────────────────────────────────

    /**
     * @notice Mark shipment as out for delivery.
     * @param shipmentId The shipment being picked up
     */
    function markOutForDelivery(uint256 shipmentId) external {
        Shipment storage s = _getShipment(shipmentId);
        if (s.agent != msg.sender) revert NotAssignedAgent();
        if (s.status != Status.Created) revert InvalidStatus(s.status, Status.Created);

        s.status = Status.OutForDelivery;
        emit OutForDelivery(shipmentId, msg.sender);
    }

    /**
     * @notice Confirm delivery: validates OTP, stores proof, releases escrow to agent.
     * @param shipmentId The shipment being delivered
     * @param gpsLocation GPS coordinates string "lat,lon"
     * @param photoIPFSHash CID of the delivery photo on IPFS
     * @param providedOtp The raw OTP provided by the customer (validated against stored hash)
     */
    function confirmDelivery(
        uint256 shipmentId,
        string calldata gpsLocation,
        string calldata photoIPFSHash,
        string calldata providedOtp
    ) external nonReentrant {
        Shipment storage s = _getShipment(shipmentId);
        if (s.agent != msg.sender) revert NotAssignedAgent();
        if (s.status != Status.OutForDelivery) revert InvalidStatus(s.status, Status.OutForDelivery);

        // Validate OTP
        if (keccak256(abi.encodePacked(providedOtp)) != s.otpHash) revert InvalidOTP();

        s.status        = Status.Delivered;
        s.deliveredAt   = block.timestamp;
        s.gpsLocation   = gpsLocation;
        s.photoIPFSHash = photoIPFSHash;

        uint256 amount = s.escrowAmount;
        s.escrowAmount = 0;

        emit ShipmentDelivered(shipmentId, msg.sender, gpsLocation, photoIPFSHash);
        emit EscrowReleased(shipmentId, msg.sender, amount);

        // Release escrow to agent
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ── Admin / Shipper Functions ──────────────────────────────────────────────

    /**
     * @notice Dispute a shipment. Can be called by ADMIN or the original SHIPPER.
     * @param shipmentId The shipment to dispute
     */
    function disputeShipment(uint256 shipmentId) external {
        Shipment storage s = _getShipment(shipmentId);
        bool isAdmin   = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isShipper = s.shipper == msg.sender;
        if (!isAdmin && !isShipper) revert NotAdminOrShipper();
        if (s.status == Status.Delivered || s.status == Status.Disputed) {
            revert InvalidStatus(s.status, Status.OutForDelivery);
        }

        s.status = Status.Disputed;
        emit ShipmentDisputed(shipmentId, msg.sender);
    }

    // ── View Functions ─────────────────────────────────────────────────────────

    /**
     * @notice Get full shipment data.
     */
    function getShipment(uint256 shipmentId) external view returns (Shipment memory) {
        return _getShipment(shipmentId);
    }

    /**
     * @notice Get all shipment IDs for a shipper address.
     */
    function getShipmentsByShipper(address shipper) external view returns (uint256[] memory) {
        return _shipperShipments[shipper];
    }

    /**
     * @notice Get total number of shipments.
     */
    function totalShipments() external view returns (uint256) {
        return _shipmentCounter;
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    function _getShipment(uint256 shipmentId) internal view returns (Shipment storage) {
        if (shipmentId == 0 || shipmentId > _shipmentCounter) revert ShipmentNotFound();
        return _shipments[shipmentId];
    }
}
