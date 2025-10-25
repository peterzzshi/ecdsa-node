import React, { useState } from 'react';
import { AxiosError } from 'axios';
import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import server from './server';
import { signTransaction } from './crypto';

interface TransferProps {
  address: string;
  setBalance: (balance: number) => void;
}

function Transfer({ address, setBalance }: TransferProps) {
  const [sendAmount, setSendAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');

  const setValue = (setter: (value: string) => void) => (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => setter(evt.target.value);

  function deriveAddress(privateKey: string): string {
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

  async function transfer(evt: React.FormEvent) {
    evt.preventDefault();

    if (!privateKey) {
      alert('Please enter your private key to sign the transaction');
      return;
    }

    // Derive the address from the private key
    const derivedAddress = deriveAddress(privateKey);
    
    if (!derivedAddress) {
      alert('Invalid private key format');
      return;
    }

    // Verify that the private key corresponds to the wallet address
    if (derivedAddress.toLowerCase() !== address.toLowerCase()) {
      alert('Private key does not match the wallet address');
      return;
    }

    try {
      // Create the transaction message
      const message = {
        sender: address,
        amount: parseInt(sendAmount, 10),
        recipient,
      };

      // Sign the transaction
      const { signature, messageHash } = await signTransaction(privateKey, message);

      // Send the signed transaction to the server
      const {
        data: { balance },
      } = await server.post<{ balance: number }>('send', {
        message,
        signature,
        messageHash,
      });
      setBalance(balance);
      alert('Transaction successful!');
    } catch (ex) {
      const error = ex as AxiosError<{ message: string }>;
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      alert(`Transaction failed: ${errorMessage}`);
    }
  }

  return (
    <form className="container transfer" onSubmit={transfer}>
      <h1>Send Transaction</h1>

      <label>
        Send Amount
        <input
          placeholder="1, 2, 3..."
          value={sendAmount}
          onChange={setValue(setSendAmount)}
        />
      </label>

      <label>
        Recipient
        <input
          placeholder="Type an address, for example: 0x2"
          value={recipient}
          onChange={setValue(setRecipient)}
        />
      </label>

      <label>
        Private Key (for signing)
        <input
          type="password"
          placeholder="Enter your private key to sign this transaction"
          value={privateKey}
          onChange={setValue(setPrivateKey)}
        />
      </label>

      <input type="submit" className="button" value="Transfer" />
    </form>
  );
}

export default Transfer;
