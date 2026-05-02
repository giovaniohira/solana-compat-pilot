// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
// - sendAndConfirmTransaction: Submission flow may need Kit signing and send pipeline changes.

import { sendAndConfirmTransaction } from "@solana/web3-compat";

void sendAndConfirmTransaction();
