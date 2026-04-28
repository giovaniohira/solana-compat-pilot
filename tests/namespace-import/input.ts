import * as web3 from "@solana/web3.js";

const connection = new web3.Connection("https://api.devnet.solana.com");
const tx = new web3.Transaction();

console.log(connection, tx);
