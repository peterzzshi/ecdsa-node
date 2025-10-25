import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';

// Enable sync methods for @noble/secp256k1 v3.0.0
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp.hashes.sha256 = sha256;

/**
 * Sign a transaction message with a private key
 */
export async function signTransaction(
  privateKeyHex: string,
  message: { sender: string; recipient: string; amount: number },
): Promise<{ signature: string; messageHash: string }> {
  // Remove 0x prefix if present
  const cleanPrivKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;

  // Create a deterministic message from transaction data
  const messageBytes = new TextEncoder().encode(JSON.stringify(message));
  const messageHash = keccak_256(messageBytes);

  // Sign the message hash using @noble/secp256k1 with recovered format
  // This returns a 65-byte signature (64 bytes + 1 recovery byte)
  const sig = await secp.signAsync(messageHash, secp.etc.hexToBytes(cleanPrivKey), { format: 'recovered', prehash: false });

  return {
    signature: secp.etc.bytesToHex(sig),
    messageHash: secp.etc.bytesToHex(messageHash),
  };
}
