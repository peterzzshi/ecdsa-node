import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

// Enable sync methods
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);
secp.hashes.sha256 = sha256;

async function poc() {
  console.log('=== Testing signature recovery ===\n');

  const privateKey = secp.utils.randomSecretKey();
  const publicKey = secp.getPublicKey(privateKey, false);

  console.log('Private key:', secp.etc.bytesToHex(privateKey));
  console.log('Public key:', secp.etc.bytesToHex(publicKey));
  console.log('Public key length:', publicKey.length, '\n');

  const message = { sender: '0xtest', recipient: '0xrecip', amount: 100 };
  const messageString = JSON.stringify(message);
  const messageBytes = new TextEncoder().encode(messageString);
  const messageHash = keccak_256(messageBytes);

  console.log('Message:', messageString);
  console.log('Message hash:', secp.etc.bytesToHex(messageHash));
  console.log('Message hash length:', messageHash.length, '\n');

  // Sign with recovered format
  const signature = await secp.signAsync(messageHash, privateKey, { format: 'recovered', prehash: false });

  console.log('Signature:', secp.etc.bytesToHex(signature));
  console.log('Signature length:', signature.length);
  console.log('Recovery byte:', signature[0], '\n');

  // Try to recover the public key
  try {
    console.log('Attempting to recover public key (no options)...');
    const recoveredPubKey = secp.recoverPublicKey(signature, messageHash);

    console.log('Recovered public key:', secp.etc.bytesToHex(recoveredPubKey));
    console.log('Recovered public key length:', recoveredPubKey.length);

    // Compare compressed versions
    const publicKeyCompressed = secp.getPublicKey(privateKey, true);
    console.log('Original public key (compressed):', secp.etc.bytesToHex(publicKeyCompressed));
    console.log('Keys match (compressed):', secp.etc.bytesToHex(recoveredPubKey) === secp.etc.bytesToHex(publicKeyCompressed));

    // Try to get uncompressed recovered key
    const recoveredPoint = secp.Point.fromBytes(recoveredPubKey);
    const recoveredPubKeyUncompressed = recoveredPoint.toBytes(false);
    console.log('Recovered public key (uncompressed):', secp.etc.bytesToHex(recoveredPubKeyUncompressed));
    console.log('Keys match (uncompressed):', secp.etc.bytesToHex(recoveredPubKeyUncompressed) === secp.etc.bytesToHex(publicKey), '\n');
  } catch (error) {
    console.error('ERROR during recovery:', error);
  }

  // Now try with prehash: false option
  try {
    console.log('Attempting to recover public key (prehash: false)...');
    const recoveredPubKey2 = secp.recoverPublicKey(signature, messageHash, { prehash: false });

    console.log('Recovered public key:', secp.etc.bytesToHex(recoveredPubKey2));

    const publicKeyCompressed = secp.getPublicKey(privateKey, true);
    console.log('Keys match (compressed):', secp.etc.bytesToHex(recoveredPubKey2) === secp.etc.bytesToHex(publicKeyCompressed));
  } catch (error) {
    console.error('ERROR during recovery with prehash: false:', error);
  }
}

poc();

