// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Keypair.: Keypair to Kit signer migration may require async control-flow changes.
// - Transaction: Mutable transactions need a transaction-message pipeline review before Kit migration.

const solanaWeb3 = require("@solana/web3-compat");

const keypair = solanaWeb3.Keypair.generate();
const transaction = new solanaWeb3.Transaction();

console.log(keypair.publicKey, transaction);
