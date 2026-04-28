import solanaWeb3 = require("@solana/web3.js");

const keypair = solanaWeb3.Keypair.generate();

console.log(keypair);
