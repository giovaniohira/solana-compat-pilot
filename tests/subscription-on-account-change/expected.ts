// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Connection: Connection can often become createSolanaRpc, but method coverage must be checked.
// - PublicKey: PublicKey can sometimes become address(), but object-method call sites may still need compat.
// - Subscription: Subscriptions should be reviewed against createSolanaRpcSubscriptions.

import { Connection, PublicKey } from "@solana/web3-compat";

const connection = new Connection("https://api.devnet.solana.com");
const mint = new PublicKey("So11111111111111111111111111111111111111112");

connection.onAccountChange(mint, () => {}, "confirmed");
