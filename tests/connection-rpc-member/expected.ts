// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Connection: Connection can often become createSolanaRpc, but method coverage must be checked.

import { Connection } from "@solana/web3-compat";

const connection = new Connection("https://api.devnet.solana.com");

void connection.getLatestBlockhash();
