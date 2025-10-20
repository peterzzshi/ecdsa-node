import React from 'react';
import server from './server';

interface WalletProps {
  address: string;
  setAddress: (address: string) => void;
  balance: number;
  setBalance: (balance: number) => void;
}

function Wallet({ address, setAddress, balance, setBalance }: WalletProps) {
  async function onChange(evt: React.ChangeEvent<HTMLInputElement>) {
    const newAddress = evt.target.value;
    setAddress(newAddress);
    if (newAddress) {
      const {
        data: { balance: newBalance },
      } = await server.get<{ balance: number }>(`balance/${newAddress}`);
      setBalance(newBalance);
    } else {
      setBalance(0);
    }
  }

  return (
    <div className="container wallet">
      <h1>Your Wallet</h1>

      <label>
        Wallet Address
        <input
          placeholder="Type an address, for example: 0x1"
          value={address}
          onChange={onChange}
        />
      </label>

      <div className="balance">
        Balance:
        {' '}
        {balance}
      </div>
    </div>
  );
}

export default Wallet;
