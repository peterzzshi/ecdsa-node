## Project 1: Build a Web App using ECDSA

This project is an example of using a client and server to facilitate transfers between different addresses. Since there is just a single server on the back-end handling transfers, this is clearly very centralized. We won't worry about distributed consensus for this project.

However, something that we would like to incorporate is Public Key Cryptography. By using Elliptic Curve Digital Signatures we can make it so the server only allows transfers that have been signed for by the person who owns the associated address.

### 🚀 Modern TypeScript Implementation

This implementation has been fully converted to **TypeScript** with modern tooling:

**Tech Stack:**
- **Client**: React 18 + TypeScript + Vite + SCSS
- **Server**: Express + TypeScript + nodemon (hot reload)
- **Cryptography**: @noble/secp256k1 v3.0.0 + ethereum-cryptography v3.2.0
- **Code Quality**: ESLint 9 with Airbnb style guide

**Key Features:**
- ✅ Full TypeScript type safety across client and server
- ✅ Modern cryptographic libraries (noble-curves ecosystem)
- ✅ Ethereum-style addresses (0x + 20 hex characters)
- ✅ ECDSA signature recovery for authentication
- ✅ Hot reload development experience
- ✅ Linting and code quality tools

## Video Instructions
For an overview of this project as well as getting started instructions, check out the following video:

https://www.youtube.com/watch?v=GU5vlKaNvmI

If you are interested in a text-based guide, please read on below. ⬇️

## Project Structure

```
ecdsa-node/
├── client/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx           # Main application component
│   │   ├── Wallet.tsx        # Wallet component (private key → address)
│   │   ├── Transfer.tsx      # Transfer component (sign & send)
│   │   ├── crypto.ts         # Client-side signing functions
│   │   └── server.ts         # Axios API client
│   ├── package.json
│   ├── tsconfig.json         # TypeScript configuration
│   ├── vite.config.ts        # Vite configuration
│   └── eslint.config.mjs     # ESLint 9 configuration
│
└── server/                    # Express + TypeScript backend
    ├── src/
    │   ├── index.ts          # Main server with balance management
    │   └── crypto.ts         # Signature verification & recovery
    ├── script/
    │   └── generate.ts       # Key pair generation script
    ├── package.json
    ├── tsconfig.json         # TypeScript configuration
    ├── nodemon.json          # Nodemon configuration
    └── eslint.config.mjs     # ESLint 9 configuration
```

## Setup Instructions
 
### Client

The client folder contains a [React app](https://reactjs.org/) using [Vite](https://vitejs.dev/) and **TypeScript**. To get started, follow these steps:

1. Open up a terminal in the `/client` folder
2. Run `npm install` to install all the dependencies
3. Run `npm run dev` to start the application 
4. Now you should be able to visit the app at http://localhost:5173/

**Additional client scripts:**
- `npm run build` - Build the TypeScript project for production
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting errors

### Server

The server folder contains a Node.js server using [Express](https://expressjs.com/) and **TypeScript**. To run the server, follow these steps:

1. Open a terminal within the `/server` folder 
2. Run `npm install` to install all the dependencies 
3. Run `npm run dev` to start the development server with hot reload

**Additional server scripts:**
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript (production)
- `npm run generate` - Generate private keys and Ethereum addresses
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting errors

The application should connect to the default server port (3042) automatically!

## 🏁 Your Goal: Set Up a Secure ECDSA-based Web Application

Only read this section **AFTER** you've followed the **Setup Instructions** above!

This project begins with a client that is allowed to transfer any funds from any account to another account. That's not very secure. By applying digital signatures we can require that only the user with the appropriate private key can create a signature that will allow them to move funds from one account to the other. Then, the server can verify the signature to move funds from one account to another.

Your project is considered **done** when you have built the following features in a secure way (NOTE: your project is not final if it still uses private keys anywhere on the client side!):
- Incorporate public key cryptography so transfers can only be completed with a valid signature
- The person sending the transaction should have to verify that they own the private key corresponding to the address that is sending funds

> 🤔 While you're working through this project consider the security implications of your implementation decisions. What if someone intercepted a valid signature, would they be able to replay that transfer by sending it back to the server?

## Recommended Approach To Building This Project

There are many ways to approach this project. The goal is to create a client-server webapp that safely validates transaction intents, using public key cryptography, between accounts. Below is a phased approach that clearly details out a roadmap to solving this goal:

### **Phase 1**
- You have successfully git cloned this project onto your local machine
- You installed all dependencies by running `npm install` both in the `/client` and in the `/server` folders
- You have a website running on http://localhost:5173/ by running `npm run dev` in the `/client` folder
- You have a server process running by running `npm run dev` in the `/server` folder (TypeScript development mode with hot reload via nodemon + ts-node)
- A balance displays on the `Wallet Address` input box when you type in valid Ethereum addresses (0x + 40 hex characters)
- The server uses **TypeScript** (`src/index.ts`) and maintains balances for Ethereum-style addresses
- When you enter an address that has funds, you can send an amount to any other address (using the right-hand column); this action withdraws the specified amount from the sender account. You should see these changes in real time
- Even if you reload the page on http://localhost:5173/, the balance changes you've previously made still remain - this is because your **server** is keeping track of balances, not your client (i.e., your front-end)

If all of these are complete, move on to **Phase 2**! ⬇️

### **Phase 2**

At this point, our app security is not very good. If we deploy this app now, anyone can access any balance and make changes. This means that Alice (or really.. anyone!) can type in any address and transfer an amount, even if that account is not actually her account! We need to find a way to assign ownership of accounts. 

Let's incorporate some of the cryptography we've learned in the previous lessons to build a half-baked solution. This project uses modern cryptography libraries:
- **[@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1)** v3.0.0 - For ECDSA operations
- **[ethereum-cryptography](https://www.npmjs.com/package/ethereum-cryptography)** v3.2.0 - For Keccak-256 hashing

> ✅ **Already Installed!** Both libraries are already included in this TypeScript project's dependencies.

In **Phase 2**, your job is to implement private keys so that when a user interacts with your application, the ONLY way they are allowed to move funds is if they provide the **private key** of the account they want to move funds from.

The key change is to use **real Ethereum addresses** derived from private keys in the server's `balances` object (`server/src/index.ts`).

#### Generating Key Pairs

You can generate private keys and their corresponding Ethereum addresses using the included script:

```bash
cd server
npm run generate
```

This script (`server/script/generate.ts`) will:
1. Generate random private keys using `@noble/secp256k1`
2. Derive the uncompressed public key from each private key
3. Create Ethereum-style addresses (0x + 20 hex bytes) by:
   - Removing the first byte (0x04 prefix) from the uncompressed public key
   - Taking the Keccak-256 hash of the remaining public key bytes
   - Using the last 20 bytes of the hash as the address

**Example output:**
```
🔐 Generating key pairs...

Account 1:
Private Key: a1b2c3d4e5f6...
Public Key:  04e5f6g7h8i9...
Address:     0x5c134bd1119da76fdd9e9c53516d7010b99b88dd

Account 2:
...
```

To pass **Phase 2**:

- You have replaced the placeholder addresses in `server/src/index.ts` with actual Ethereum addresses generated using the script above or by implementing your own key generation
- These addresses are derived from randomly generated private keys using the secp256k1 elliptic curve
- You are able to transfer funds between addresses by entering a **private key** in the webapp, which automatically derives the corresponding Ethereum address
- The client (`client/src/Wallet.tsx`) derives the Ethereum address from the private key using the same algorithm (uncompressed public key → Keccak-256 → last 20 bytes)

> 🎉 **Extra credit completed!** This implementation already uses Ethereum-style addresses (0x + 20 hex characters) instead of full public keys!
 
### **Phase 3**

Asking users to input a private key directly into your webapp is a big no-no! 🚫

The next step for YOU to accomplish is to make it so that you can send a **signed transaction** to the server, via your webapp; the server should then authenticate that transaction by **recovering the public address from the signature itself**. If that address has funds, move the funds to the intended recipient. All of this should be accomplished via digital signatures alone.

#### Implementation Overview

This project implements **ECDSA signature recovery** using the secp256k1 elliptic curve:

**Client-side** (`client/src/crypto.ts`):
1. Creates a transaction message: `{ sender, recipient, amount }`
2. Serializes the message to JSON and hashes it using Keccak-256
3. Signs the hash with the user's private key using `@noble/secp256k1`
4. Sends the signature, message hash, and original message to the server

**Server-side** (`server/src/crypto.ts`):
1. Receives the signature, message hash, and transaction message
2. Verifies the message hash matches the received message (prevents tampering)
3. **Recovers the public key** from the signature using `secp.recoverPublicKey()`
4. Derives the Ethereum address from the recovered public key
5. Validates that the recovered address matches the claimed sender address
6. If valid, processes the transaction and moves funds

**Key files:**
- `server/src/index.ts` - Main server logic with balance management and signature verification
- `server/src/crypto.ts` - Signature recovery and address derivation functions
- `client/src/crypto.ts` - Transaction signing function
- `client/src/Transfer.tsx` - UI component that signs and sends transactions
- `client/src/Wallet.tsx` - Derives address from private key for user convenience

To pass **Phase 3**:

- ✅ Your app validates and moves funds using digital signatures
- ✅ The server recovers the public address from the signature itself (not from client claims)
- ✅ Private keys are only used client-side for signing - never sent to the server
- ✅ The signature includes a recovery byte, allowing public key recovery without knowing it in advance
- ✅ Message tampering is prevented by verifying the hash on the server

> 🔒 **Security Note**: While this implementation is more secure, consider these improvements for production:
> - Add nonces or timestamps to prevent replay attacks
> - Implement proper key management (hardware wallets, MetaMask integration)
> - Add rate limiting and other anti-abuse measures
> - Use HTTPS in production to prevent man-in-the-middle attacks

## Sample Solution

Want to peek at a solution while you craft your own? Check [this repo](https://github.com/AlvaroLuken/exchange-secp256k1) out.
