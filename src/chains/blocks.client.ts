import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as bitcoin from "bitcoinjs-lib";
import * as varuint from 'varuint-bitcoin';

export class BlocksClient {

    private base: string;

    constructor(base: string) {
        // if (configService.get("bitcoin.network") == 'livenet') {
        //     this.base = 'https://blockstream.info';
        // } else {
        //     this.base = 'https://blockstream.info/testnet';
        // }
        this.base = base;
    }

    async axiosGet(path: string, configs?: any) {
        return axios.get(`${this.base}/api/${path}`, configs).then((resp) => {
            return resp.data;
        }, (err) => {
            console.log(path, err)
            throw err;
        });
    }

    async getTx(txid: string) {
        return await this.axiosGet(`/tx/${txid}/hex`);
    }

    async getTxout(txid: string, vout:number) {
        return await this.axiosGet(`/tx/${txid}/outspend/${vout}`);
    }

    async getUnspents(address: string) {
        const list: any[] = await this.axiosGet(`/address/${address}/utxo`);
        return list.filter(each => each.value >= 1000);
    }

    async estimates() {
        return this.axiosGet("fee-estimates")
    }

    async getTxStatus(tdid: string) {
        return this.axiosGet(`/tx/${tdid}/status`);
    }

    async sendTx(txHex: string, times: number = 0) {
        const self = this;
        axios.post(`${this.base}/api/tx`, txHex)
            .then(response => {
                console.log('Transaction broadcasted:', response.data);
            })
            .catch(error => {
                console.error('Error broadcasting transaction:', error);
                if (times < 5) {
                    setTimeout(() => {
                        self.sendTx(txHex, times + 1)
                    }, 1000)
                }
            });
    }
}
