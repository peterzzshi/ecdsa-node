import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const port = 3042;

app.use(cors());
app.use(express.json());

interface Balances {
  [address: string]: number;
}

const balances: Balances = {
  '0x1': 100,
  '0x2': 50,
  '0x3': 75,
};

interface SendRequestBody {
  sender: string;
  recipient: string;
  amount: number;
}

app.get('/balance/:address', (req: Request, res: Response) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post('/send', (req: Request<object, object, SendRequestBody>, res: Response) => {
  const { sender, recipient, amount } = req.body;

  setInitialBalance(sender);
  setInitialBalance(recipient);

  if (balances[sender] < amount) {
    res.status(400).send({ message: 'Not enough funds!' });
  } else {
    balances[sender] -= amount;
    balances[recipient] += amount;
    res.send({ balance: balances[sender] });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address: string): void {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
