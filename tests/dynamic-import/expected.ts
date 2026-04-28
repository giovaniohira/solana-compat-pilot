// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Connection: Connection can often become createSolanaRpc, but method coverage must be checked.

const solanaWeb3 = await import("@solana/web3-compat");

const connection = new solanaWeb3.Connection("https://api.devnet.solana.com");

console.log(connection);
