// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Connection: Connection can often become createSolanaRpc, but method coverage must be checked.
// - Transaction: Mutable transactions need a transaction-message pipeline review before Kit migration.

import * as web3 from "@solana/web3-compat";

const connection = new web3.Connection("https://api.devnet.solana.com");
const tx = new web3.Transaction();

console.log(connection, tx);
