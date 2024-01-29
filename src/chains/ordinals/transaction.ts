// import * as bitcoin from "bitcoinjs-lib";
// import ecc from "@bitcoinerlab/secp256k1";
// import { toXOnly } from "bitcoinjs-lib/src/psbt/bip371";
// import { Base58CheckResult, Bech32Result, fromBase58Check, fromBech32 } from "bitcoinjs-lib/src/address";
// import { DummySigner } from "./singer";
// import { isP2TR } from "bitcoinjs-lib/src/psbt/psbtutils";
// bitcoin.initEccLib(ecc);

// const defaultMinChangeValue = 546;

// export interface Unspent {
//     txid: string;
//     vout: number;
//     satoshis: number;
//     address: string;
//     publicKey: Buffer;
//     tx?: string
// }

// export type AddressType = "legacy" | "segwit_native" | "segwit_nested" | "segwit_taproot"

// export interface TxInput {
//     data: {
//         hash: string;
//         index: number;
//         witnessUtxo: { value: number; script: Buffer };
//         tapInternalKey?: Buffer;
//     };
//     utxo: Unspent;
// }

// export interface TxOutput {
//     address: string;
//     value: number;
// }


// export function getAddressType(address: string, network: bitcoin.Network): AddressType {
//     let decodeBase58: Base58CheckResult | undefined;
//     let decodeBech32: Bech32Result | undefined;
//     try {
//         decodeBase58 = fromBase58Check(address);
//     } catch (e) { }

//     if (decodeBase58) {
//         if (decodeBase58.version === network.pubKeyHash)
//             return "legacy"
//         if (decodeBase58.version === network.scriptHash)
//             return "segwit_nested"
//     } else {
//         try {
//             decodeBech32 = fromBech32(address);
//         } catch (e) { }

//         if (decodeBech32) {
//             if (decodeBech32.prefix !== network.bech32)
//                 throw new Error(address + ' has an invalid prefix');
//             if (decodeBech32.version === 0) {
//                 return 'segwit_native'
//             } else if (decodeBech32.version === 1) {
//                 return 'segwit_taproot'
//             }
//         }
//     }
//     return "legacy"
// }

// export class Transaction {
//     private inputs: TxInput[] = [];
//     public outputs: TxOutput[] = [];
//     public changedAddress: string;
//     private feeRate: number;
//     private network: bitcoin.Network = bitcoin.networks.bitcoin;
//     private enableRBF = true;
//     private hasChanged = false;


//     constructor(changedAddress: string, feeRate: number, network: bitcoin.Network = bitcoin.networks.bitcoin, enableRBF = true) {
//         this.changedAddress = changedAddress;
//         this.feeRate = feeRate;
//         this.network = network;
//         this.enableRBF = enableRBF;
//     }

//     addInputs(utxos: Unspent[]) {
//         utxos.forEach(utxo => {
//             this.inputs.push(this.utxoToInput(utxo));
//         });
//     }

//     addInput(utxo: Unspent) {
//         this.inputs.push(this.utxoToInput(utxo));
//     }

//     addOutputs(outputs: any[]) {
//         outputs.forEach(each => { this.outputs.push(each); });
//     }

//     addOutput(address: string, value: number) {
//         this.outputs.push({ address, value });
//     }

//     getTotalInput() {
//         return this.inputs.reduce((pre, cur) => pre + cur.data.witnessUtxo.value, 0);
//     }

//     getTotalOutput() {
//         return this.outputs.reduce((pre, cur) => pre + cur.value, 0);
//     }

//     calFee(psbt: bitcoin.Psbt, feeRate: number) {
//         if (this.changedAddress) {
//             psbt.addOutput({
//                 address: this.changedAddress,
//                 value: 0
//             });
//         }

//         for (var i = 0; i < this.inputs.length; i++) {
//             psbt.signInput(i, new DummySigner(this.inputs[i].utxo.publicKey));
//         }
//         psbt.finalizeAllInputs();
//         const tx = psbt.extractTransaction(true);
//         return tx.virtualSize() * feeRate;
//     }

//     createPsbt(autoFinalized: Boolean = false) {
//         const psbt = new bitcoin.Psbt({ network: this.network });
//         let totalAmountIn = 0;
//         this.inputs.forEach((each, index) => {
//             if (getAddressType(each.utxo.address, this.network) == "legacy") {
//                 //@ts-ignore
//                 psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
//             }
//             psbt.addInput(each.data);
//             if (this.enableRBF) {
//                 psbt.setInputSequence(index, 0xfffffffd); // support RBF
//             }
//             totalAmountIn += each.utxo.satoshis;
//         });

//         let totalAmountOut = 0;
//         this.outputs.forEach((data) => {
//             psbt.addOutput(data);
//             totalAmountOut += data.value;
//         });

//         if (!this.hasChanged) {
//             const feeAmount = this.calFee(psbt.clone(), this.feeRate);
//             if (totalAmountIn - totalAmountOut < feeAmount) {
//                 throw new Error("insufficient");
//             } else {
//                 this.hasChanged = true;
//                 const changeAmount = totalAmountIn - totalAmountOut - feeAmount
//                 if (changeAmount > defaultMinChangeValue) {
//                     const data = { address: this.changedAddress, value: changeAmount };
//                     this.outputs.push(data);
//                     psbt.addOutput(data);
//                 }
//             }
//         }

//         if (autoFinalized) {
//             this.inputs.forEach((each, index) => {
//                 psbt.signInput(index, new DummySigner(each.utxo.publicKey));
//             });
//             psbt.finalizeAllInputs();
//         }

//         return psbt;
//     }

//     utxoToInput(utxo: Unspent): any {
//         const addressType = getAddressType(utxo.address, this.network);
//         if (addressType == "segwit_taproot") {
//             const data = {
//                 hash: utxo.txid,
//                 index: utxo.vout,
//                 nonWitnessUtxo: Buffer.from(utxo.tx, 'hex'),
//                 // witnessUtxo: {
//                 //     value: utxo.satoshis,
//                 //     script: bitcoin.address.toOutputScript(utxo.address, this.network)//publicKeyToScriptPk(utxo.publicKey, addressType, this.network),
//                 // },
//                 // // finalScriptWitness: 
//                 // tapInternalKey: toXOnly(utxo.publicKey),
//             };
//             // console.log("utxoToInput segwit_taproot",isP2TR(data.witnessUtxo.script));
//             // console.log("utxoToInput segwit_taproot",data.witnessUtxo.script.length
//             // , data.witnessUtxo.script.toString('hex') );
//             // console.log("utxoToInput segwit_taproot",utxo.publicKey.toString('hex') );
//             console.log("utxoToInput segwit_taproot",data );
//             return { utxo, data }
//         } else if (
//             addressType == "segwit_native") {
//             const data = {
//                 hash: utxo.txid,
//                 index: utxo.vout,
//                 witnessUtxo: {
//                     value: utxo.satoshis,
//                     script: publicKeyToScriptPk(utxo.publicKey, addressType, this.network),
//                 },
//             };
//             console.log("utxoToInput segwit_native", data);
//             return { utxo, data }
//         } else if (addressType == "legacy") {
//             const data = {
//                 hash: utxo.txid,
//                 index: utxo.vout,
//                 witnessUtxo: {
//                     value: utxo.satoshis,
//                     script: publicKeyToScriptPk(utxo.publicKey, addressType, this.network),
//                 },
//             };
//             return { utxo, data }
//         } else if (addressType == "segwit_nested") {
//             const redeemData = bitcoin.payments.p2wpkh({ pubkey: utxo.publicKey });
//             const data = {
//                 hash: utxo.txid,
//                 index: utxo.vout,
//                 witnessUtxo: {
//                     value: utxo.satoshis,
//                     script: publicKeyToScriptPk(utxo.publicKey, addressType, this.network),
//                 },
//                 redeemScript: redeemData.output,
//             };
//             console.log("utxoToInput segwit_nested", data);
//             return { utxo, data }
//         }
//     }

//     dumpTx() {
//         const psbt = this.createPsbt(true)
//         const tx = psbt.extractTransaction();
//         const size = tx.toBuffer().length;
//         const feePaid = psbt.getFee();
//         const feeRate = psbt.getFeeRate();

//         console.log(`
//             =============================================================================================
//             Summary
//             txid:     ${tx.getId()}
//             Size:     ${tx.byteLength()}
//             virtualSize:     ${tx.virtualSize()}
//             Fee Paid: ${psbt.getFee()}
//             Fee Rate: ${feeRate} sat/vB
//             Detail:   ${psbt.txInputs.length} Inputs, ${psbt.txOutputs.length} Outputs
//             ----------------------------------------------------------------------------------------------
//             Inputs
//             ${this.inputs
//                 .map((input, index) => {
//                     const str = `
//             =>${index} ${input.data.witnessUtxo.value} Sats
//                     lock-size: ${input.data.witnessUtxo.script.length}
//                     via ${input.data.hash} [${input.data.index}]
//             `;
//                     return str;
//                 })
//                 .join("")}
//             total: ${this.getTotalInput()} Sats
//             ----------------------------------------------------------------------------------------------
//             Outputs
//             ${this.outputs
//                 .map((output, index) => {
//                     const str = `
//             =>${index} ${output.address} ${output.value} Sats`;
//                     return str;
//                 })
//                 .join("")}
            
//             total: ${this.getTotalOutput()} Sats
//             =============================================================================================
//         `);
//     }
// }

// export function publicKeyToPayment(
//     pubkey: Buffer,
//     addressType: AddressType,
//     network: bitcoin.Network) {
//     if (addressType == "legacy") {
//         return bitcoin.payments.p2pkh({
//             pubkey,
//             network,
//         });
//     } else if (addressType == "segwit_native") {
//         return bitcoin.payments.p2wpkh({
//             pubkey,
//             network,
//         });
//     } else if (addressType == "segwit_taproot") {
//         return bitcoin.payments.p2tr({
//             internalPubkey: toXOnly(pubkey),
//             network,
//         });
//     } else if (addressType == "segwit_nested") {
//         const data = bitcoin.payments.p2wpkh({
//             pubkey,
//             network,
//         });
//         return bitcoin.payments.p2sh({
//             pubkey,
//             network,
//             redeem: data,
//         });
//     }
// }

// export function publicKeyToScriptPk(
//     publicKey: Buffer,
//     addressType: AddressType,
//     network: bitcoin.Network) {
//     const payment = publicKeyToPayment(publicKey, addressType, network);
//     return payment.output;
// }
