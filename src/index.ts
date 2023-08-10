import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { NightmarketClient } from "@motleylabs/mtly-nightmarket";

const RPC = "https://api.devnet.solana.com";

async function main() {
  const connection = new Connection(RPC, "confirmed");

  const myWalletKeypair = Keypair.generate();
  const myPublicKey = myWalletKeypair.publicKey;
  console.log(`Wallet Public Key: ${myPublicKey.toString()}`);

  const airdropSignature = await connection.requestAirdrop(
    myPublicKey,
    1000000000,
  ); // 1 SOL
  await connection.confirmTransaction(airdropSignature);
  console.log("Airdrop received!");

  const nmClient = new NightmarketClient(RPC);

  const mint = new PublicKey("HxTSyfj37Vq2e1jdHcXa9b6rTFrRh3R9BTngnwhUciMp");
  const price = 0.005;
  const seller = new PublicKey("LbGvKVMtxQfeQstRXn1YKftLnSoo9esKthJFGU64ViY");
  const buyer = myPublicKey;

  const buyListingAction = await nmClient.BuyListing(
    mint,
    price,
    seller,
    buyer,
  );
  if (!!buyListingAction.err) {
    throw buyListingAction.err;
  }

  const lookupTableAccount = await connection
    .getAddressLookupTable(
      new PublicKey("Ei4UgvDQYLtvWKoQHKD3ENQ9NpsumtWEPR9k9XEoXyMv"),
    )
    .then((res) => res.value);

  if (!!lookupTableAccount) {
    console.log({ lookupTableAccount });
  } else {
    throw "No lookup table account";
  }

  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: blockhash,
    instructions: buyListingAction.instructions,
  }).compileToV0Message([lookupTableAccount]);

  const transactionV0 = new VersionedTransaction(messageV0);
  transactionV0.sign([myWalletKeypair]);

  const transactionId = await connection.sendRawTransaction(
    transactionV0.serialize(),
  );
  console.log("Transaction ID:", transactionId);

  await connection.confirmTransaction(transactionId, "confirmed");
  console.log("Transaction confirmed:", transactionId);
}

main().catch((err) => {
  console.error(err);
});
