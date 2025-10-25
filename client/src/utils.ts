import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';

/**
 * Derive an Ethereum address from a private key
 * @param privateKey - The private key in hex format (with or without 0x prefix)
 * @returns The derived Ethereum address, or empty string if invalid
 */
export function deriveAddress(privateKey: string): string {
  try {
    const cleanPrivKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Validate hex string
    if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivKey)) {
      return '';
    }

    // Get uncompressed public key (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
    const publicKey = secp.getPublicKey(secp.etc.hexToBytes(cleanPrivKey), false);

    // Remove the 0x04 prefix (first byte)
    const publicKeyWithoutPrefix = publicKey.slice(1);

    // Hash the public key using Keccak-256
    const hash = keccak_256(publicKeyWithoutPrefix);

    // Take the last 20 bytes as the address
    const addressBytes = hash.slice(-20);

    return `0x${secp.etc.bytesToHex(addressBytes)}`;
  } catch {
    return '';
  }
}
