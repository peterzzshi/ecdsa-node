import React, { useState } from 'react';
import { AxiosError } from 'axios';
import server from './server';

interface TransferProps {
  address: string;
  setBalance: (balance: number) => void;
}

function Transfer({ address, setBalance }: TransferProps) {
  const [sendAmount, setSendAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');

  const setValue = (setter: (value: string) => void) => (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => setter(evt.target.value);

  async function transfer(evt: React.FormEvent) {
    evt.preventDefault();

    try {
      const {
        data: { balance },
      } = await server.post<{ balance: number }>('send', {
        sender: address,
        amount: parseInt(sendAmount, 10),
        recipient,
      });
      setBalance(balance);
    } catch (ex) {
      const error = ex as AxiosError<{ message: string }>;
      alert(error.response?.data?.message || 'An error occurred');
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

      <input type="submit" className="button" value="Transfer" />
    </form>
  );
}

export default Transfer;
