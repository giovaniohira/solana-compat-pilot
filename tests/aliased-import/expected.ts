// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - PublicKey: PublicKey can sometimes become address(), but object-method call sites may still need compat.

import { PublicKey as SolanaPublicKey } from "@solana/web3-compat";

const key = new SolanaPublicKey("11111111111111111111111111111111");

console.log(key);
