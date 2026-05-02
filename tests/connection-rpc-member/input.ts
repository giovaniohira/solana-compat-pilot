import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

void connection.getLatestBlockhash();
