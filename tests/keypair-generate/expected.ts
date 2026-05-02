// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Keypair: Keypair to Kit signer migration may require async control-flow changes.

import { Keypair } from "@solana/web3-compat";

const payer = Keypair.generate();

console.log(payer.publicKey.toBase58());
