import { ethers } from 'ethers';

/**
 * Generates a SHA256 hash of the delivery data
 * @param data Object containing delivery information
 * @returns SHA256 hash string
 */
export const generateDeliveryHash = (data) => {
  const jsonString = JSON.stringify(data);
  return ethers.sha256(ethers.toUtf8Bytes(jsonString));
};
