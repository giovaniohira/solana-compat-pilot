export function* loadWeb3() {
  yield import("@solana/web3.js");
}
