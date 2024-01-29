// import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
// import { witnessStackToScriptWitness } from "bitcoinjs-lib/src/psbt/psbtutils";
// import { DummySigner } from "./singer";
import { core, transaction, address, wallet, utils, NetworkType, types, toPsbtNetwork, UTXO_DUST } from 'wallet-sdk/src/index'
// const bitcoin = core.bitcoin;

// export interface Inscription {
//     contentType: string;
//     content: string;
//     revealAddr: string;
// }

// export interface CommitTxData {
//     scriptTaproot: core.bitcoin.payments.Payment;
//     tapLeafScript: {
//         leafVersion: number,
//         script: Buffer,
//         controlBlock: any,
//     }
//     outputAmount?: number;
// }

// function chunkContent(data: Buffer) {
//     const body = [];
//     let start = 0;
//     while (start < data.length) {
//         body.push(data.subarray(start, start + exports.MAX_CHUNK_SIZE));
//         start += exports.MAX_CHUNK_SIZE;
//     }
//     return body;
// }

// function createInscriptionScript(xOnlyPublicKey: Buffer, inscription: Inscription) {
//     const protocolId = Buffer.from('ord');
//     return [
//         xOnlyPublicKey,
//         bitcoin.opcodes.OP_CHECKSIG,
//         bitcoin.opcodes.OP_0,
//         bitcoin.opcodes.OP_IF,
//         protocolId,
//         1,
//         1,
//         Buffer.from(inscription.contentType),
//         bitcoin.opcodes.OP_0,
//         ...chunkContent(Buffer.from(inscription.content)),
//         bitcoin.opcodes.OP_ENDIF,
//     ];
// }

// export function createCommitTxData(networkType: NetworkType, publicKey: Buffer, inscription: Inscription) {
//     const network = toPsbtNetwork(networkType);
//     const xOnlyPublicKey = toXOnly(publicKey);
//     const script = createInscriptionScript(xOnlyPublicKey, inscription);
//     const outputScript = bitcoin.script.compile(script);
//     const scriptTree = {
//         output: outputScript,
//         redeemVersion: 192,
//     };
//     const scriptTaproot = bitcoin.payments.p2tr({
//         internalPubkey: xOnlyPublicKey,
//         scriptTree,
//         redeem: scriptTree,
//         network
//     });

//     var _a: any;
//     const cblock = (_a = scriptTaproot.witness) === null || _a === void 0 ? void 0 : _a[scriptTaproot.witness.length - 1];
//     const tapLeafScript = {
//         leafVersion: scriptTaproot.redeemVersion,
//         script: outputScript,
//         controlBlock: cblock,
//     };
//     return {
//         scriptTaproot,
//         tapLeafScript,
//     };
// }

// export function estimateRevealTxSize(networkType: NetworkType, publicKey: Buffer, commitTxData: CommitTxData, toAddress: string, amount: number) {
//     const network = toPsbtNetwork(networkType);
//     const psbt = new bitcoin.Psbt({ network });
//     const { scriptTaproot, tapLeafScript } = commitTxData;
//     psbt.addInput({
//         hash: Buffer.alloc(32, 0),
//         index: 0,
//         witnessUtxo: {
//             value: amount,
//             script: scriptTaproot.output,
//         },
//         tapLeafScript: [tapLeafScript],
//     });
//     psbt.addOutput({
//         value: amount,
//         address: toAddress,
//     });
//     psbt.signInput(0, new DummySigner(publicKey));
//     psbt.finalizeInput(0, customFinalizer(commitTxData));
//     const tx = psbt.extractTransaction();
//     return tx.virtualSize();
// }

// export function buildCommitTx(networkType: NetworkType,
//     publicKey: Buffer,
//     commitTxDatas: CommitTxData[],
//     inscriptions: Inscription[],
//     unspents: types.UnspentOutput[],
//     changeAddress: string,
//     feeRate: number) {

//     const tx = new transaction.Transaction(networkType, feeRate, changeAddress);

//     // const network = toPsbtNetwork(networkType);

//     let totalOutAmount = 0;
//     for (var i = 0; i < commitTxDatas.length; i++) {
//         const outputAmount = estimateRevealTxSize(networkType, publicKey, commitTxDatas[i], inscriptions[i].revealAddr, UTXO_DUST) * feeRate + UTXO_DUST;
//         commitTxDatas[i].outputAmount = outputAmount;
//         tx.addOutput(commitTxDatas[i].scriptTaproot.address, outputAmount);
//         totalOutAmount += outputAmount;
//     }

//     // tx.addSufficientUtxosForFee()


//     let totalInAmount = 0;
//     for (var i = 0; i < unspents.length; i++) {
//         tx.addInput(unspents[i]);
//         totalInAmount += unspents[i].satoshis;

//         // const fee = await tx.calNetworkFee();
//         // const unspent = tx.getTotalInput() - fee;

//         if (totalInAmount > totalOutAmount) {
//             try {

//             } catch (error) {
//             }
//         }
//     }
//     throw new Error("insufficient");
// }

// export function buildRevealTx(networkType: NetworkType, commitTxData: CommitTxData,
//     inscription: Inscription, commitTx: core.bitcoin.Transaction, index: number = 0) {
//     const network = toPsbtNetwork(networkType);
//     const { scriptTaproot, tapLeafScript } = commitTxData;
//     const psbt = new bitcoin.Psbt({ network });
//     psbt.addInput({
//         hash: commitTx.getId(),
//         index: index,
//         witnessUtxo: {
//             value: commitTxData.outputAmount,
//             script: scriptTaproot.output,
//         },
//         nonWitnessUtxo: commitTx.toBuffer(),
//         tapLeafScript: [tapLeafScript],
//     });
//     psbt.addOutput({
//         value: UTXO_DUST,
//         address: inscription.revealAddr,
//     });
//     return psbt;
// }

// const customFinalizer = (commitTxData: CommitTxData) => {
//     const { tapLeafScript } = commitTxData;
//     return (inputIndex, input) => {
//         const witness = [input.tapScriptSig[inputIndex].signature]
//             .concat(tapLeafScript.script)
//             .concat(tapLeafScript.controlBlock);
//         return {
//             finalScriptWitness: witnessStackToScriptWitness(witness),
//         };
//     };
// };

// export function signRevealTx(signer: core.bitcoin.Signer, commitTxData: CommitTxData, psbt: core.bitcoin.Psbt) {
//     psbt.signInput(0, signer);
//     psbt.finalizeInput(0, customFinalizer(commitTxData));
//     return psbt.extractTransaction();
// }

// export function buildWithdrawTx(
//     networkType: NetworkType,
//     fromAddress: string,
//     tick: string,
//     amount: number,
//     pubkey: Buffer,
//     feeRate: number) {

//     const network = toPsbtNetwork(networkType);
//     const payment = bitcoin.payments.p2wpkh({ pubkey, network });
//     const commitTxData = createCommitTxData(networkType, pubkey, {
//         contentType: "text/plain;charset=utf-8",
//         content: `{"p":"brc-20","op":"transfer","tick":"${tick}","amt":"${amount}"}`,
//         revealAddr: payment.address
//     });
//     const revealAmount = estimateRevealTxSize(networkType, pubkey, commitTxData, payment.address, UTXO_DUST) * feeRate + UTXO_DUST;

//     // const tranferTx = new transaction.Transaction();
//     // tranferTx.addInput({
//     //     txid: Buffer.alloc(32).toString('hex'),
//     //     vout: 0,
//     //     satoshis: UTXO_DUST,
//     //     address: payment.address,
//     //     publicKey: pubkey,
//     // });

//     // tranferTx.addInput({
//     //     txid: Buffer.alloc(32).toString('hex'),
//     //     vout: 1,
//     //     satoshis: 200000,
//     //     address: payment.address,
//     //     publicKey: pubkey,
//     // });
//     // tranferTx.addOutput(fromAddress, defaultRevealOutValue);

//     // const tranferTxAmount = tranferTx.calFee(tranferTx.createPsbt(), feeRate);

//     // const tx = new Transaction(fromAddress, feeRate, network);
//     // tx.addOutput(commitTxData.scriptTaproot.address, revealAmount);
//     // tx.addOutput(payment.address, tranferTxAmount);
//     // return tranferTx;
// }