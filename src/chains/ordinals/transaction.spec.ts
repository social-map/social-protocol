import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import * as bip39 from 'bip39';
import BIP32Factory, { BIP32Interface } from 'bip32';
// import { Transaction } from './transaction';
import { BlocksClient } from '../blocks.client';
import { core, transaction, address, wallet, utils, types, NetworkType } from 'wallet-sdk/src/index'
const bip32 = BIP32Factory(core.ecc);

describe('Transaction', () => {

  let network: core.bitcoin.Network;
  let wallets: Map<string, BIP32Interface>;
  let accounts: string[];

  let blocksClient: BlocksClient;

  beforeEach(async () => {
    network = core.bitcoin.networks.testnet;
    const seed = bip39.mnemonicToSeedSync("");
    const node = bip32.fromSeed(seed, network);
    blocksClient = new BlocksClient('https://blockstream.info/testnet');

    wallets = new Map<string, BIP32Interface>();
    accounts = [];
    for (var i = 0; i < 10; i++) {
      const child0 = node.derivePath(`m/84'/0'/0'/0/${i}`);
      const child1 = node.derivePath(`m/86'/0'/0'/0/${i}`);

      const nativeSegwit = core.bitcoin.payments.p2wpkh({ pubkey: child0.publicKey, network: network }).address;
      const taproot = core.bitcoin.payments.p2tr({ internalPubkey: child1.publicKey.slice(1), network: network }).address;

      if (i < 5) {
        console.log("nativeSegwit", nativeSegwit);
        console.log("taproot", taproot);
      }

      accounts.push(nativeSegwit);
      wallets.set(nativeSegwit, child0);
      wallets.set(taproot, child1);
    }
  });

  it('transfer', async () => {
    const fromAddress = "tb1ql7hndlu2jm0v99w2wman79y30eh2cycpu4j7mj";
    // const tx = new Transaction(fromAddress, 2, network);
    // const list0 = await blocksClient.getUnspents(fromAddress);
    const list1 = await blocksClient.getUnspents('tb1p63jav8tkzdlpha5rvn5vufxvgcvu58f0ul2ajr2zfuctfcgfwahse4jwa3');
    console.log("Unspents", list1);

    // const hex = '70736274ff0100a602000000023fda512ed682f4c515d9a06361961cf2e18cc486b844b07c3ac815f3eeade1640400000000ffffffff59d80607c41006013e4c334616ce123c5e6f0b3824c1c663c2d67468fdef34a60600000000ffffffff02e803000000000000160014ffaf36ff8a96dec295ca76fb3f14917e6eac13012003000000000000225120d465d61d76137e1bf68364e8ce24cc4619ca1d2fe7d5d90d424f30b4e109776f000000000001012be803000000000000225120d465d61d76137e1bf68364e8ce24cc4619ca1d2fe7d5d90d424f30b4e109776f0108420140a447f05e13ab16b8ce3cbd49d570c458e59ade7d477ef07c45a610085a6e955203c723189ffc207a18850e7c860e2d66d914cb9e950fd6665a7ae0a9f6b9ca7d0001012be803000000000000225120d465d61d76137e1bf68364e8ce24cc4619ca1d2fe7d5d90d424f30b4e109776f0108420140ec9a4a309c686a41f655a9b7c6813c62bcc478a27bf80fecdce65c41ee66a7b173b190be5de5e7f7eb2d5539fef11881fc5908b4679a7c20a6c1d29f176eb1ac000000';
    // const psbt = bitcoin.Psbt.fromHex(hex);
    // console.log(psbt.);

    const btcUtxos = [];
    for (var i = 0; i < list1.length; i++) {
      btcUtxos.push(
        {
          txid: list1[i].txid,
          vout: list1[i].vout,
          satoshis: list1[i].value,
          addressType: types.AddressType.P2TR,
          scriptPk: address.addressToScriptPk("tb1p63jav8tkzdlpha5rvn5vufxvgcvu58f0ul2ajr2zfuctfcgfwahse4jwa3", NetworkType.TESTNET).toString('hex'),
          pubkey: wallets.get('tb1p63jav8tkzdlpha5rvn5vufxvgcvu58f0ul2ajr2zfuctfcgfwahse4jwa3').publicKey.toString('hex'),
          inscriptions: [],
          atomicals: [],
        }
      );
    }


    // sendInscriptions();

    // const { psbt, } = await sendBTC({
    //   btcUtxos: btcUtxos,
    //   tos: [{ address: accounts[0], satoshis: 10000 }],
    //   networkType: NetworkType.TESTNET,
    //   changeAddress: fromAddress,
    //   feeRate: 1
    // });

    const tx = new transaction.Transaction(NetworkType.TESTNET, 1, fromAddress);
    [{ address: accounts[0], satoshis: 10000 }].forEach((v) => {
      tx.addOutput(v.address, v.satoshis);
    });

    const wif = wallets.get('tb1p63jav8tkzdlpha5rvn5vufxvgcvu58f0ul2ajr2zfuctfcgfwahse4jwa3').toWIF();
    const toSignInputs = await tx.addSufficientUtxosForFee(btcUtxos);
    const psbt = tx.toPsbt();
    const localWallet = new wallet.LocalWallet(wif, types.AddressType.P2TR, NetworkType.TESTNET);
    await localWallet.signPsbt(psbt, { autoFinalized: true });
    tx.dumpTx(psbt);

    // await blocksClient.sendTx(psbt.extractTransaction().toHex());

  });
});
