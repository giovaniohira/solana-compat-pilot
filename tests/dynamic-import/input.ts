const solanaWeb3 = await import("@solana/web3.js");

const connection = new solanaWeb3.Connection("https://api.devnet.solana.com");

console.log(connection);
