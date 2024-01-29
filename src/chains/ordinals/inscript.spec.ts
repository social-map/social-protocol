import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { BlocksClient } from '../blocks.client';
import { core, transaction, address, wallet, utils, types, NetworkType, UTXO_DUST } from 'wallet-sdk/lib/index'
import * as bip39 from 'bip39';
import BIP32Factory, { BIP32Interface } from 'bip32';
// import { Inscription, buildCommitTx, buildRevealTx, createCommitTxData, estimateRevealTxSize, signRevealTx } from './inscript';
const bip32 = BIP32Factory(core.ecc);
// const ECPair = core.ECPair;
const { ECPair, bitcoin, ecc } = core;
// bitcoin.


describe('Transaction', () => {


  let network: core.bitcoin.Network;
  let wallets: Map<string, BIP32Interface>;
  let accounts: string[];

  let blocksClient: BlocksClient;

  beforeEach(async () => {
    network = bitcoin.networks.testnet;
    const seed = bip39.mnemonicToSeedSync("");
    const node = bip32.fromSeed(seed, network);
    blocksClient = new BlocksClient('https://blockstream.info/testnet');

    wallets = new Map<string, BIP32Interface>();
    accounts = [];
    for (var i = 0; i < 10; i++) {
      const child0 = node.derivePath(`m/84'/0'/0'/0/${i}`);
      const child1 = node.derivePath(`m/86'/0'/0'/0/${i}`);

      const nativeSegwit = bitcoin.payments.p2wpkh({ pubkey: child0.publicKey, network: network }).address;
      const taproot = bitcoin.payments.p2tr({ internalPubkey: child1.publicKey.slice(1), network: network }).address;

      if (i < 5) {
        console.log("nativeSegwit", nativeSegwit);
        console.log("taproot", taproot);
      }

      accounts.push(nativeSegwit);
      wallets.set(nativeSegwit, child0);
      wallets.set(taproot, child1);
    }
  });

  it('withdraw', async () => {

    const userAddress = "tb1ql7hndlu2jm0v99w2wman79y30eh2cycpu4j7mj";//用户
    const mainAddress = "tb1p63jav8tkzdlpha5rvn5vufxvgcvu58f0ul2ajr2zfuctfcgfwahse4jwa3"; //平台 
    const feeRate = 1;
    const networkType = NetworkType.TESTNET;
    
    const inscription = {
      contentType: "text/plain;charset=utf-8",
      content: `{"p":"brc-20","op":"transfer","tick":"patx","amt":"100"}`,
      revealAddr: mainAddress
    }

    // 计算写铭文需要的utxo大小
    const commitTxData = transaction.createCommitTxData(networkType, wallets.get(mainAddress).publicKey, inscription);
    const revealAmount = transaction.estimateRevealTxSize(networkType, wallets.get(mainAddress).publicKey, commitTxData, mainAddress, UTXO_DUST) * feeRate + UTXO_DUST;
    console.log("revealAmount", revealAmount);
    commitTxData["outputAmount"] = revealAmount;

    // const commitTx = transaction.buildCommitTx();
    // const revealTx = transaction.buildRevealTx();
    // transaction.signRevealTx(revealTx)

    // 计算转铭文需交易费
    const sendInscription = new transaction.Transaction(networkType, 1, mainAddress);
    sendInscription.addInputs([
      {
        txid: Buffer.alloc(32).toString('hex'),
        vout: 0,
        satoshis: UTXO_DUST,
        addressType: types.AddressType.P2WPKH,
        scriptPk: address.addressToScriptPk(mainAddress, NetworkType.TESTNET).toString('hex'),
        pubkey: wallets.get(mainAddress).publicKey.toString('hex'),
        inscriptions: [],
        atomicals: [],
      },
      {
        txid: Buffer.alloc(32).toString('hex'),
        vout: 0,
        satoshis: UTXO_DUST,
        addressType: types.AddressType.P2WPKH,
        scriptPk: address.addressToScriptPk(mainAddress, NetworkType.TESTNET).toString('hex'),
        pubkey: wallets.get(mainAddress).publicKey.toString('hex'),
        inscriptions: [],
        atomicals: [],
      }]);
    sendInscription.addOutput(userAddress, UTXO_DUST);
    const feeAmount = sendInscription.calNetworkFee();
    console.log("feeAmount", feeAmount);


    const list = await blocksClient.getUnspents(userAddress);
    const unspents = list.map((each) => {
      return {
        txid: each.txid,
        vout: each.vout,
        satoshis: each.value,
        addressType: types.AddressType.P2WPKH, // 地址类型
        scriptPk: address.addressToScriptPk(userAddress, NetworkType.TESTNET).toString('hex'),
        pubkey: wallets.get(userAddress).publicKey.toString('hex'),
        inscriptions: [],
        atomicals: [],
      }
    });
    console.log("unspents", unspents);

    //准备写铭文的utox和转铭文的费用 
    const withdrawTx = new transaction.Transaction(networkType, feeRate, userAddress);
    withdrawTx.addOutput(commitTxData.scriptTaproot.address, revealAmount);
    withdrawTx.addOutput(mainAddress, feeAmount);
    withdrawTx.addSufficientUtxosForFee(unspents);
    // console.log(withdrawTx.inputs);
    let psbt = withdrawTx.toPsbt();
    let localWallet = new wallet.LocalWallet(wallets.get(userAddress).toWIF(), types.AddressType.P2WPKH, NetworkType.TESTNET);
    localWallet.signPsbt(psbt, { autoFinalized: true });
    withdrawTx.dumpTx(psbt);
    // printPsbt(psbt, network);
    const tx0 = psbt.extractTransaction(true);
    const tx = bitcoin.Transaction.fromHex('hex')
    console.log("withdrawTx", tx0.getId());

    //平台文写铭文
    const revealTx = transaction.buildRevealTx(networkType, commitTxData, inscription, tx0);
    transaction.signRevealTx(ECPair.fromPrivateKey(wallets.get(mainAddress).privateKey), commitTxData, revealTx);
    printPsbt(revealTx, network);
    const tx1 = revealTx.extractTransaction(true);
    console.log("revealTx", tx1.getId());


    //写好铭文utxo转给用户
    const sendInscriptionTx = new transaction.Transaction(networkType, 1, mainAddress);
    sendInscriptionTx.addInputs([
      {
        txid: tx1.getId(),
        vout: 0,
        satoshis: UTXO_DUST,
        addressType: types.AddressType.P2TR,
        scriptPk: address.addressToScriptPk(mainAddress, NetworkType.TESTNET).toString('hex'),
        pubkey: wallets.get(mainAddress).publicKey.toString('hex'),
        inscriptions: [],
        atomicals: [],
      },
      {
        txid: tx0.getId(),
        vout: 1,
        satoshis: feeAmount,
        addressType: types.AddressType.P2TR,
        scriptPk: address.addressToScriptPk(mainAddress, NetworkType.TESTNET).toString('hex'),
        pubkey: wallets.get(mainAddress).publicKey.toString('hex'),
        inscriptions: [],
        atomicals: [],
      }]);
      sendInscriptionTx.addOutput(userAddress, UTXO_DUST);
      const transferTx =  sendInscriptionTx.toPsbt();
      localWallet = new wallet.LocalWallet(wallets.get(mainAddress).toWIF(), types.AddressType.P2TR, NetworkType.TESTNET);
      localWallet.signPsbt(transferTx);
      sendInscriptionTx.dumpTx(transferTx);
      const tx2 = transferTx.extractTransaction(true);
      console.log("sendInscriptionTx", tx2.getId());

    // console.log("revealTx", JSON.stringify(revealTx));

    // buildCommitTx(networkType, wallets.get(mainAddress).publicKey, [commitTxData], [inscription], )

  });


  function scriptPkToAddress(scriptPk: string | Buffer, network: core.bitcoin.Network) {
    core.bitcoin.address.fromOutputScript(typeof scriptPk === "string" ? Buffer.from(scriptPk, "hex") : scriptPk, network)
  }

  function printTx(rawtx: string, network: core.bitcoin.Network) {
    const tx = core.bitcoin.Transaction.fromHex(rawtx);
    const txId = tx.getId();
    let ins = [];
    tx.ins.forEach((v) => {
      const txid = v.hash.reverse().toString("hex");
      const vout = v.index;
      const address = scriptPkToAddress(v.script, network);
      ins.push({ txid, vout, address });
    });


    let outs = [];
    tx.outs.forEach((v) => {
      const address = scriptPkToAddress(v.script, network);
      const satoshis = v.value;
      outs.push({ address, satoshis });
    });
    let str = "\nPrint TX \n";
    str += `txid: ${txId}\n`;
    str += `\nInputs:(${ins.length})\n`;
    ins.forEach((v, index) => {
      str += `#${index} -- ${v.address}\n`;
      str += `   ${v.txid}  [${v.vout}]\n`;
    });

    str += `\nOutputs:(${outs.length})\n`;
    outs.forEach((v, index) => {
      str += `#${index} ${v.address} ${v.satoshis}\n`;
    });
    str += "\n";

    console.log(str);
  }

  function printPsbt(psbtData: string | core.bitcoin.Psbt, network: core.bitcoin.Network) {
    let psbt: core.bitcoin.Psbt;
    if (typeof psbtData == "string") {
      psbt = core.bitcoin.Psbt.fromHex(psbtData);
    } else {
      psbt = psbtData;
    }
    let totalInput = 0;
    let totalOutput = 0;
    let str = "\nPSBT:\n";
    str += `Inputs:(${psbt.txInputs.length})\n`;
    psbt.txInputs.forEach((input, index) => {
      const inputData = psbt.data.inputs[index];
      str += `#${index} ${scriptPkToAddress(
        inputData.witnessUtxo.script.toString("hex"), network
      )} ${inputData.witnessUtxo.value}\n`;
      str += `   ${Buffer.from(input.hash).reverse().toString("hex")} [${input.index
        }]\n`;
      totalInput += inputData.witnessUtxo.value;
    });

    str += `Outputs:(${psbt.txOutputs.length} )\n`;
    psbt.txOutputs.forEach((output, index) => {
      str += `#${index} ${output.address} ${output.value}\n`;
      totalOutput += output.value;
    });

    str += `Left: ${totalInput - totalOutput}\n`;
    try {
      const fee = psbt.getFee();
      const virtualSize = psbt.extractTransaction(true).virtualSize();
      const feeRate = fee / virtualSize;
      str += `Fee: ${fee}\n`;
      str += `FeeRate: ${feeRate}\n`;
      str += `VirtualSize: ${virtualSize}\n`;
    } catch (e) {
      // todo
    }

    str += "\n";
    console.log(str);
  }
});
