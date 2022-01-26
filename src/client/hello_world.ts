/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  Account
  
} from '@solana/web3.js';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';
import anchor from "@project-serum/anchor"
import {getPayer, getRpcUrl, createKeypairFromFile} from './utils';
import BN from 'bn.js';
/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair;

/**
 * Hello world's program id
 */
let programId: PublicKey;

/**
 * The public key of the account we are saying hello to
 */
let greetedPubkey: PublicKey;

/**
 * Path to program files
 */
const PROGRAM_PATH = path.resolve(__dirname, '../../dist/program');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'helloworld.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy dist/program/helloworld.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'helloworld-keypair.json');

/**
 * The state of a greeting account managed by the hello world program
 */
class GreetingAccount {
  counter = 0;
  constructor(fields: {counter: number} | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

/**
 * Borsh schema definition for greeting accounts
 */
const GreetingSchema = new Map([
  [GreetingAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
]);

/**
 * The expected size of each greeting account.
 */
const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
  let fees = 0;
  if (!payer) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    // Calculate the cost to fund the greeter account
    fees += await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);

    // Calculate the cost of sending transactions
    fees += feeCalculator.lamportsPerSignature * 100; // wag

    payer = await getPayer();
  }

  let lamports = await connection.getBalance(payer.publicKey);
  if (lamports < fees) {
    // If current balance is not enough to pay for fees, request an airdrop
    const sig = await connection.requestAirdrop(
      payer.publicKey,
      fees - lamports,
    );
    await connection.confirmTransaction(sig);
    lamports = await connection.getBalance(payer.publicKey);
  }

  console.log(
    'Using account',
    payer.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the hello world BPF program has been deployed
 */
export async function checkProgram(): Promise<void> {
  // Read program id from keypair file
  try {
    const programKeypair = await createKeypairFromFile(PROGRAM_KEYPAIR_PATH);
    programId = programKeypair.publicKey;
  } catch (err) {
    const errMsg = (err as Error).message;
    throw new Error(
      `Failed to read program keypair at '${PROGRAM_KEYPAIR_PATH}' due to error: ${errMsg}. Program may need to be deployed with \`solana program deploy dist/program/helloworld.so\``,
    );
  }

  // Check if the program has been deployed
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
    if (fs.existsSync(PROGRAM_SO_PATH)) {
      throw new Error(
        'Program needs to be deployed with `solana program deploy dist/program/helloworld.so`',
      );
    } else {
      throw new Error('Program needs to be built and deployed');
    }
  } else if (!programInfo.executable) {
    throw new Error(`Program is not executable`);
  }
  console.log(`Using program ${programId.toBase58()}`);

  // Derive the address (public key) of a greeting account from the program so that it's easy to find later.
  const GREETING_SEED = 'hello';
  greetedPubkey = await PublicKey.createWithSeed(
    payer.publicKey,
    GREETING_SEED,
    programId,
  );

  // Check if the greeting account has already been created
  const greetedAccount = await connection.getAccountInfo(greetedPubkey);
  if (greetedAccount === null) {
    console.log(
      'Creating account',
      greetedPubkey.toBase58(),
      'to say hello to',
    );
    const lamports = await connection.getMinimumBalanceForRentExemption(
      GREETING_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        basePubkey: payer.publicKey,
        seed: GREETING_SEED,
        newAccountPubkey: greetedPubkey,
        lamports,
        space: GREETING_SIZE,
        programId,
      }),
    );
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }
}

/**
 * Say hello
 */
export async function sayHello(): Promise<void> {
  console.log('Saying hello to', greetedPubkey.toBase58());
  const owner = new Account();
  let createAccountProgram = new Account([112, 152, 22, 24, 214, 173, 250, 98, 192, 214, 50, 104, 196, 104, 105, 184, 87, 99, 220, 223, 116, 66, 3, 19, 167, 5, 102, 11, 232, 199, 11, 166, 87, 188, 108, 80, 242, 45, 37, 163, 74, 88, 103, 23, 49, 219, 164, 70, 19, 227, 104, 61, 89, 136, 150, 158, 145, 111, 179, 89, 53, 73, 6, 20]);
  let [programAddress, nonce] = await PublicKey.findProgramAddress(
    [createAccountProgram.publicKey.toBuffer()],
    programId,
  );
  let programIdSwap=new PublicKey("Cz2NJCKXvZMwDrSuaL9Wu4gi8r5AQGko8fW6gpUTxGAu")
  let tokenProgramId=new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")//false
  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: owner.publicKey, isSigner: false, isWritable: true},
      {pubkey: tokenProgramId, isSigner: false, isWritable: false},
      {pubkey: programAddress, isSigner: false, isWritable: false},
      {pubkey: createAccountProgram.publicKey, isSigner: false, isWritable: false},
      {pubkey: programIdSwap, isSigner: false, isWritable: false}],
    programId,
    data: Buffer.from([nonce]), // All instructions are hellos
  });
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
  );
}
/**
 * swap with serum  B TO A
 */
 export async function swapBtoAWithSeurm():Promise<void>{
  let createAccountProgram = new Account([112, 152, 22, 24, 214, 173, 250, 98, 192, 214, 50, 104, 196, 104, 105, 184, 87, 99, 220, 223, 116, 66, 3, 19, 167, 5, 102, 11, 232, 199, 11, 166, 87, 188, 108, 80, 242, 45, 37, 163, 74, 88, 103, 23, 49, 219, 164, 70, 19, 227, 104, 61, 89, 136, 150, 158, 145, 111, 179, 89, 53, 73, 6, 20]);
  let [programAddress, nonce] = await PublicKey.findProgramAddress(
    [createAccountProgram.publicKey.toBuffer()],
    programId,
  );
  let market=new PublicKey("EfUPyWAAWYjoFMM1yefwsYXigE6kWxaAeLsVmj1YumZ9")//Writable: true
 let requestQueue=new PublicKey("Cg2TKByx9nMkAV53XNH956hXoLB7Wt8AD8LNcLw8Sk9j")//true
 let eventQueue=new PublicKey("4zCmNTAYipqH1H3D3LEkNYgKuSxm1HXHaKh3Q73AUUDJ")//true
 let bids=new PublicKey("ryicnKPhBAvoXW9ouQhfRWd2yw2kQLgsBcr6iAw2N4A")//true
 let asks=new PublicKey("3h3n3HLe5Du2cofg9AA4PZkjteqeHqbXQtJgSTWVnRx6")//true
 let coinVault=new PublicKey("DXXKpGJ8bE8d5yVPiZiXFS1XdVHCCy7JJYRvMVU6MxFD")//true
 let pcVault=new PublicKey("5HQjsSHFkXMNdidCCbUXc414fi49CMMGTM41xHuXap7f")//true
 let vaultSigner=new PublicKey("5eLiGqMzQbZ6YmAYX9EttR6azxuMS587eC9WYJnUuq15")//false
 let openOrders=new PublicKey("FSuajWQ1MhsUJF7XAfXGkTkbVF1XJdfrGP578BRnuUM")//true
 let orderPayerTokenAccount=new PublicKey("FkSdR4hAZMTnHCAp3dT9GhiTXL4knzgaKgN3cCT6AxHE")//true
 let coinWallet=new PublicKey("42Y4pE4GHoWM8Je4knbPKrTf3bsyS6Z197eRXPxn2jey")//true
 let pcWallet=new PublicKey("FkSdR4hAZMTnHCAp3dT9GhiTXL4knzgaKgN3cCT6AxHE")//true
 let dexProgram=new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")//false
 let tokenProgramId=new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")//false
let swapProgramId=new PublicKey("Dg1MkkyWNVMhpR2angpSEBeE8ZgLtUzjxQbQV4fgXiYG");
let authority=new Account([92,214,28,156,59,19,5,96,187,84,201,183,47,79,228,182,53,200,87,175,118,103,172,100,17,143,32,47,203,125,132,78,204,193,93,5,199,108,171,91,214,51,110,202,161,21,93,119,0,76,78,118,41,98,33,79,138,6,196,205,188,29,102,142])
 let rent=SYSVAR_RENT_PUBKEY;
const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};
//let authority=new Account([148,198,132,12,200,247,88,166,64,128,133,187,69,127,77,12,43,5,248,120,13,15,199,71,152,168,161,234,28,119,249,96,228,125,19,4,240,25,224,35,243,24,231,28,124,44,172,139,55,53,224,154,199,32,139,68,101,128,20,10,80,89,165,170])
//const swapAmount = new BN(2000000);
 const instruction = new TransactionInstruction({
  keys: [//17
    {pubkey: market, isSigner: false, isWritable: true},
    {pubkey: requestQueue, isSigner: false, isWritable: true},
    {pubkey: eventQueue, isSigner: false, isWritable: true},
    {pubkey: bids, isSigner: false, isWritable: true},
    {pubkey: asks, isSigner: false, isWritable: true},
    {pubkey: coinVault, isSigner: false, isWritable: true},
    {pubkey: pcVault, isSigner: false, isWritable: true},
    {pubkey: vaultSigner, isSigner: false, isWritable: true},
    {pubkey: openOrders, isSigner: false, isWritable: true},
    {pubkey: orderPayerTokenAccount, isSigner: false, isWritable: false},
    {pubkey: coinWallet, isSigner: false, isWritable: true},
    {pubkey: pcWallet, isSigner: false, isWritable: true},
    {pubkey: authority.publicKey, isSigner: true, isWritable: true},
    {pubkey: dexProgram, isSigner: false, isWritable: false},
    {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    {pubkey: swapProgramId, isSigner: false, isWritable: false},
    {pubkey: rent, isSigner: false, isWritable: false},
    {pubkey: programAddress, isSigner: false, isWritable: false},
    {pubkey: createAccountProgram.publicKey, isSigner: false, isWritable: false},
  ],
  programId,
  data: Buffer.from([nonce]), // All instructions are hellos
});
 let tx=await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer,authority],
  );
  console.log("tx = ",tx);

  }
/**
 * swap with serum  A TO B
 */
 export async function swapAtoBWithSeurm():Promise<void>{
  let createAccountProgram = new Account([112, 152, 22, 24, 214, 173, 250, 98, 192, 214, 50, 104, 196, 104, 105, 184, 87, 99, 220, 223, 116, 66, 3, 19, 167, 5, 102, 11, 232, 199, 11, 166, 87, 188, 108, 80, 242, 45, 37, 163, 74, 88, 103, 23, 49, 219, 164, 70, 19, 227, 104, 61, 89, 136, 150, 158, 145, 111, 179, 89, 53, 73, 6, 20]);
  let [programAddress, nonce] = await PublicKey.findProgramAddress(
    [createAccountProgram.publicKey.toBuffer()],
    programId,
  );
  let market=new PublicKey("EfUPyWAAWYjoFMM1yefwsYXigE6kWxaAeLsVmj1YumZ9")//Writable: true
  let requestQueue=new PublicKey("Cg2TKByx9nMkAV53XNH956hXoLB7Wt8AD8LNcLw8Sk9j")//true
  let eventQueue=new PublicKey("4zCmNTAYipqH1H3D3LEkNYgKuSxm1HXHaKh3Q73AUUDJ")//true
  let bids=new PublicKey("ryicnKPhBAvoXW9ouQhfRWd2yw2kQLgsBcr6iAw2N4A")//true
  let asks=new PublicKey("3h3n3HLe5Du2cofg9AA4PZkjteqeHqbXQtJgSTWVnRx6")//true
  let coinVault=new PublicKey("DXXKpGJ8bE8d5yVPiZiXFS1XdVHCCy7JJYRvMVU6MxFD")//true
  let pcVault=new PublicKey("5HQjsSHFkXMNdidCCbUXc414fi49CMMGTM41xHuXap7f")//true
  let vaultSigner=new PublicKey("5eLiGqMzQbZ6YmAYX9EttR6azxuMS587eC9WYJnUuq15")//false
  let openOrders=new PublicKey("FSuajWQ1MhsUJF7XAfXGkTkbVF1XJdfrGP578BRnuUM")//true
  let orderPayerTokenAccount=new PublicKey("42Y4pE4GHoWM8Je4knbPKrTf3bsyS6Z197eRXPxn2jey")//true
  let coinWallet=new PublicKey("42Y4pE4GHoWM8Je4knbPKrTf3bsyS6Z197eRXPxn2jey")//true
  let pcWallet=new PublicKey("FkSdR4hAZMTnHCAp3dT9GhiTXL4knzgaKgN3cCT6AxHE")//true
  let dexProgram=new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")//false
  let tokenProgramId=new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")//false
 let swapProgramId=new PublicKey("Dg1MkkyWNVMhpR2angpSEBeE8ZgLtUzjxQbQV4fgXiYG");
 let authority=new Account([92,214,28,156,59,19,5,96,187,84,201,183,47,79,228,182,53,200,87,175,118,103,172,100,17,143,32,47,203,125,132,78,204,193,93,5,199,108,171,91,214,51,110,202,161,21,93,119,0,76,78,118,41,98,33,79,138,6,196,205,188,29,102,142])
 let rent=SYSVAR_RENT_PUBKEY;
const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};
//let authority=new Account([148,198,132,12,200,247,88,166,64,128,133,187,69,127,77,12,43,5,248,120,13,15,199,71,152,168,161,234,28,119,249,96,228,125,19,4,240,25,224,35,243,24,231,28,124,44,172,139,55,53,224,154,199,32,139,68,101,128,20,10,80,89,165,170])
const swapAmount = new BN((8100000));
 const instruction = new TransactionInstruction({
  keys: [//17
    {pubkey: market, isSigner: false, isWritable: true},
    {pubkey: requestQueue, isSigner: false, isWritable: true},
    {pubkey: eventQueue, isSigner: false, isWritable: true},
    {pubkey: bids, isSigner: false, isWritable: true},
    {pubkey: asks, isSigner: false, isWritable: true},
    {pubkey: coinVault, isSigner: false, isWritable: true},
    {pubkey: pcVault, isSigner: false, isWritable: true},
    {pubkey: vaultSigner, isSigner: false, isWritable: true},
    {pubkey: openOrders, isSigner: false, isWritable: true},
    {pubkey: orderPayerTokenAccount, isSigner: false, isWritable: false},
    {pubkey: coinWallet, isSigner: false, isWritable: true},
    {pubkey: pcWallet, isSigner: false, isWritable: true},
    {pubkey: authority.publicKey, isSigner: true, isWritable: true},
    {pubkey: dexProgram, isSigner: false, isWritable: false},
    {pubkey: tokenProgramId, isSigner: false, isWritable: false},
    {pubkey: swapProgramId, isSigner: false, isWritable: false},
    {pubkey: rent, isSigner: false, isWritable: false},
    {pubkey: programAddress, isSigner: false, isWritable: false},
    {pubkey: createAccountProgram.publicKey, isSigner: false, isWritable: false},
  ],
  programId,
  data: Buffer.from([nonce]), // All instructions are hellos
});
 let tx=await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer,authority],
  );
  console.log("tx = ",tx);

  }
/**
 * Report the number of times the greeted account has been said hello to
 */
export async function reportGreetings(): Promise<void> {
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (accountInfo === null) {
    throw 'Error: cannot find the greeted account';
  }
  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data,
  );
  console.log(
    greetedPubkey.toBase58(),
    'has been greeted',
    greeting.counter,
    'time(s)',
  );
}
