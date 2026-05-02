import { Keypair } from "@solana/web3.js";

const payer = Keypair.generate();

console.log(payer.publicKey.toBase58());
