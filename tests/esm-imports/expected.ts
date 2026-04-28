// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - new Connection: Connection can often become createSolanaRpc, but method coverage must be checked.
// - new PublicKey: PublicKey can sometimes become address(), but object-method call sites may still need compat.

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3-compat";

const connection = new Connection("https://api.devnet.solana.com");
const owner = new PublicKey("11111111111111111111111111111111");

console.log(connection, owner, LAMPORTS_PER_SOL);
