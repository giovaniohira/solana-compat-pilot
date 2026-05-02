import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const mint = new PublicKey("So11111111111111111111111111111111111111112");

connection.onAccountChange(mint, () => {}, "confirmed");
