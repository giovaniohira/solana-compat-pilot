// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - Transaction: Mutable transactions need a transaction-message pipeline review before Kit migration.

import { Transaction } from "@solana/web3-compat";

const tx = new Transaction();

export { tx };
