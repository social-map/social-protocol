import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import * as bitcoin from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import * as bip39 from 'bip39';
import BIP32Factory, { BIP32Interface } from 'bip32';
import ECPairFactory from 'ecpair';
import { transaction } from 'wallet-sdk/src';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);
bitcoin.initEccLib(ecc);

describe('AppController (e2e)', () => {

  beforeEach(async () => {
    const network = bitcoin.networks.testnet;
    const seed = bip39.mnemonicToSeedSync("");
    const node = bip32.fromSeed(seed, network);

    const wallets = new Map<string, BIP32Interface>();
    const accounts = [];
    for (var i = 0; i < 300; i++) {
      const child0 = node.derivePath(`m/84'/0'/0'/0/${i}`);
      const child1 = node.derivePath(`m/86'/0'/0'/0/${i}`);

      const nativeSegwit = bitcoin.payments.p2wpkh({ pubkey: child0.publicKey, network: network }).address;
      const taproot = bitcoin.payments.p2tr({ internalPubkey: child1.publicKey.slice(1), network: network }).address;

      if (i < 30) {
        console.log("nativeSegwit", nativeSegwit);
        console.log("taproot", taproot);
      }

      accounts.push(taproot);
      wallets.set(nativeSegwit, child0);
      wallets.set(taproot, child1);
    }
  });

  it('/ (GET)', () => {
    
    
  });
});
