// SOLANA_COMPAT_PILOT: existing marker should not be duplicated.
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

console.log(connection);
