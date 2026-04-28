import { PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

const owner = new PublicKey("11111111111111111111111111111111");

console.log(owner, createMint);
