// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - PublicKey: PublicKey can sometimes become address(), but object-method call sites may still need compat.

import { PublicKey } from "@solana/web3-compat";
import type { Connection } from "@solana/web3-compat";

export const addr = new PublicKey("11111111111111111111111111111111");
export type C = Connection;
