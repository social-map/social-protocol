import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as bitcoin from "bitcoinjs-lib";
import { tryGetRetries } from 'src/utils';
import * as varuint from 'varuint-bitcoin';

export class UnisatClient {

    private base: string;
    constructor(base: string) {
        this.base = base;
    }

    async axiosGet(path: string) {
        return axios.get(`${this.base}/v1/indexer/${path}`, {
            headers: {
                'accept': "application/json",
                'Authorization': "Bearer 2bda02258ff419097f768ff67994f29c88c2aa6bbacd7e52d823d22a3074778b"
            },
            timeout: 5000
        }).then((resp) => {
            return resp.data;
        }, (err) => {
            throw err;
        });
    }

    async getTransferableInscriptions(ticke: string, address: string) {
        return this.axiosGet(`address/${address}/brc20/${ticke}/transferable-inscriptions?start=0&limit=100`).then(rets => {
            return rets.data.detail;
        });
    }

    async getInscriptionInfo(inscriptionid: string) {
        return this.axiosGet(`inscription/info/${inscriptionid}`).then(rets => {
            return rets;
        });
    }


    async getTicker(name: string) {
        return this.axiosGet(`brc20/${name}/info`).then(rets => {
            return rets;
        });
    }

    async historyByHeight(height: number) {
        let rets = await tryGetRetries(this._historyByHeight.bind(this), [height, 0, 0]);
        if (rets.data.total != rets.data.detail.length) {
            rets = await tryGetRetries(this._historyByHeight.bind(this), [height, 0, rets.data.total]);
        }
        rets.data.detail = rets.data.detail.filter(each => each.valid)
        return rets;
    }

    async _historyByHeight(height: number, start: number, limit: number) {
        let path: string;
        if (limit == 0) {
            path = `brc20/history-by-height/${height}`;
        } else {
            path = `brc20/history-by-height/${height}?start=${start}&limit=${limit}`;
        }
        return await this.axiosGet(path).then(rets => {
            return rets;
        });
    }

    async history(tick: string, address: string, start: number, limit: number) {
        const total = (await tryGetRetries(this._history.bind(this), [tick, address, 0, 10])).data.total;
        start = total - start - limit;
        if (start < 0) {
            start = 0;
        }

        const rets = await tryGetRetries(this._history.bind(this), [tick, address, start, limit]);
        rets.data.detail = rets.data.detail.reverse();
        return rets;
    }

    async _history(tick: string, address: string, start: number, limit: number) {
        let path: string
        if (!address) {
            path = `brc20/${tick}/history?start=${start}&limit=${limit}`;
        } else {
            path = `address/${address}/brc20/${tick}/history?start=${start}&limit=${limit}`;
        }
        console.log(path)

        return this.axiosGet(path).then(rets => {
            return rets;
        });
    }

    async getBRC20Balance(tick: string, address: string) {
        return this.axiosGet(`brc20/${tick}/holders?start=0&limit=500`).then(rets => {
            // return rets.data.detail;
            const list = rets.data.detail;
            for (var i = 0; i < list.length; i++) {
                if (list[i].address == address) {
                    return list[i];
                }
            }
            return null;
        });
    }

    async getUnspents(list: string[]) {
        const tasks = [];
        list.forEach((address, i) => {
            tasks.push(this.axiosGet(`address/${address}/utxo-data`));
        })
        const rets = await Promise.all(tasks);
        const unspents = [];
        rets.forEach((each, index) => {
            each.data.utxo.filter((out: any) => out.value != 546).forEach((out: any) => {
                unspents.push({
                    txid: out.txid,
                    vout: out.vout,
                    value: out.satoshi,
                    address: list[index],
                    scriptPk: out.scriptPk
                })
            })
        });
        return unspents;
    }
}
