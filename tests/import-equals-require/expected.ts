// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Keypair: Keypair to Kit signer migration may require async control-flow changes.

import solanaWeb3 = require("@solana/web3-compat");

const keypair = solanaWeb3.Keypair.generate();

console.log(keypair);
