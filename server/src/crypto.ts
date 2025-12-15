import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

// Enable sync methods for @noble/secp256k1 v3.0.0
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp.hashes.sha256 = sha256;

/**
 * Recover the public key from a signature
 * This uses the secp256k1 recovery algorithm to derive the public key from signature + message hash
 */
/**
 * Recover the public key from a signature
 * This uses the secp256k1 recovery algorithm to derive the public key from signature + message hash
 * @param messageHash - Keccak-256 hash of the transaction message (hex string)
 * @param signature - 65-byte signature (64 bytes + 1 recovery byte) as hex string
 * @returns Uncompressed public key (65 bytes)
 * @throws {Error} If signature length is invalid
 */
export function recoverPublicKeyFromSignature(
  messageHash: string,
  signature: string,
): Uint8Array {
  const messageHashBytes = secp.etc.hexToBytes(messageHash);
  const signatureBytes = secp.etc.hexToBytes(signature);

  // The signature should be 65 bytes (64 bytes signature + 1 byte recovery)
  if (signatureBytes.length !== 65) {
    throw new Error(`Invalid signature length: expected 65 bytes, got ${signatureBytes.length}`);
  }

  // Recover the public key (returns compressed 33-byte key)
  // Must use prehash: false since we're passing a hash, not the original message
  const publicKeyCompressed = secp.recoverPublicKey(
    signatureBytes,
    messageHashBytes,
    { prehash: false },
  );

  // Convert to uncompressed format (65 bytes) for Ethereum address derivation
  const publicKeyPoint = secp.Point.fromBytes(publicKeyCompressed);
  // Return as raw bytes (uncompressed format - 65 bytes)
  return publicKeyPoint.toBytes(false);
}

/**
 * Derive Ethereum address from public key
 * @param publicKey - Uncompressed public key (65 bytes starting with 0x04)
 * @returns Ethereum address with 0x prefix (42 characters total)
 */
export function publicKeyToAddress(publicKey: Uint8Array): string {
  // Remove the first byte (0x04 prefix for uncompressed public key)
  const publicKeyWithoutPrefix = publicKey.slice(1);

  // Hash the public key using Keccak-256
  const hash = keccak_256(publicKeyWithoutPrefix);

  // Take the last 20 bytes as the address
  const addressBytes = hash.slice(-20);

  return `0x${secp.etc.bytesToHex(addressBytes)}`;
}

/**
 * Verify a signature and return the recovered address
 * @param messageHash - Keccak-256 hash of the transaction message
 * @param signature - 65-byte signature (64 bytes + 1 recovery byte)
 * @returns Ethereum address recovered from the signature
 */
export function verifySignatureAndGetAddress(
  messageHash: string,
  signature: string,
): string {
  const publicKey = recoverPublicKeyFromSignature(messageHash, signature);
  return publicKeyToAddress(publicKey);
}
