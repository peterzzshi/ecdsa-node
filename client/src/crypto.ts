import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { utf8ToBytes, toHex, hexToBytes } from 'ethereum-cryptography/utils';

/**
 * Sign a transaction message with a private key
 */
export async function signTransaction(
  privateKeyHex: string,
  message: { sender: string; recipient: string; amount: number }
): Promise<{ signature: string; recovery: number; messageHash: string }> {
  // Remove 0x prefix if present
  const cleanPrivKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;

  // Create a deterministic message from transaction data
  const messageString = JSON.stringify(message);
  const messageBytes = utf8ToBytes(messageString);
  const messageHash = keccak256(messageBytes);

  console.log('Message string:', messageString);
  console.log('Message hash:', toHex(messageHash));

  // Sign the message hash using ethereum-cryptography's secp256k1
  const sig = secp256k1.sign(messageHash, hexToBytes(cleanPrivKey));

  console.log('Signature object:', sig);
  console.log('Recovery bit:', sig.recovery);

  // Get the compact signature (64 bytes) and recovery bit
  const signature = sig.toCompactRawBytes();
  const recovery = sig.recovery;

  return {
    signature: toHex(signature),
    recovery: recovery,
    messageHash: toHex(messageHash)
  };
}


