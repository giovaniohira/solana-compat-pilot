const solanaWeb3 = require("@solana/web3.js");

const keypair = solanaWeb3.Keypair.generate();
const transaction = new solanaWeb3.Transaction();

console.log(keypair.publicKey, transaction);
