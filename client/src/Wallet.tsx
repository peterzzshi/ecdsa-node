import React, { useState } from 'react';
import * as secp from 'ethereum-cryptography/secp256k1';
import { toHex } from 'ethereum-cryptography/utils';
import { keccak256 } from 'ethereum-cryptography/keccak';
import server from './server';

interface WalletProps {
  address: string;
  setAddress: (address: string) => void;
  balance: number;
  setBalance: (balance: number) => void;
}

function Wallet({ address, setAddress, balance, setBalance }: WalletProps) {
  const [privateKey, setPrivateKey] = useState<string>('');

  function deriveAddress(privateKey: string): string {
    try {
      const cleanPrivKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

      const privateKeyBytes = new Uint8Array(
        cleanPrivKey.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      const publicKey = secp.getPublicKey(privateKeyBytes, false);

      const publicKeyWithoutPrefix = publicKey.slice(1);

      const hash = keccak256(publicKeyWithoutPrefix);

      const addressBytes = hash.slice(-20);

      return `0x${toHex(addressBytes)}`;
    } catch (error) {
      return '';
    }
  }

  async function onChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const newPrivateKey = evt.target.value;
    setPrivateKey(newPrivateKey);

    const derivedAddress = deriveAddress(newPrivateKey);
    setAddress(derivedAddress);

    if (derivedAddress) {
      try {
        const {
          data: { balance: newBalance },
        } = await server.get<{ balance: number }>(`balance/${derivedAddress}`);
        setBalance(newBalance);
      } catch (error) {
        setBalance(0);
      }
    } else {
      setBalance(0);
    }
  }

  return (
    <div className="container wallet">
      <h1>Your Wallet</h1>

      <label>
        Private Key
        <input
          placeholder="Type your private key, for example: 0xa1b2c3..."
          value={privateKey}
          onChange={onChange}
        />
      </label>

      <div className="address">
        Address:
        {' '}
        {address || 'Enter a valid private key'}
      </div>

      <div className="balance">
        Balance:
        {' '}
        {balance}
      </div>
    </div>
  );
}

export default Wallet;
