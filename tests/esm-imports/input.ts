import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const owner = new PublicKey("11111111111111111111111111111111");

console.log(connection, owner, LAMPORTS_PER_SOL);
