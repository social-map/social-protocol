// import * as bitcoin from "bitcoinjs-lib";

// export class DummySigner implements bitcoin.Signer {

//     publicKey: Buffer;
//     network?: bitcoin.networks.Network;

//     constructor(publicKey: Buffer) {
//         this.publicKey = publicKey;
//     }

//     sign(hash: Buffer, lowR?: boolean): Buffer {
//         return Buffer.alloc(64, 0);
//     }
//     signSchnorr(hash: Buffer) {
//         return Buffer.alloc(64, 0);
//     }

//     getPublicKey(): Buffer {
//         return this.publicKey;
//     }
// }