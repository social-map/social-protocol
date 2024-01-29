import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionIsNotSetError, DataSource, IsNull, LessThan, MaxKey, MoreThan } from 'typeorm';
import { OrdinalsClient } from '../chains/ordinals/ordinals.client';
import { Inscription } from './entities/Inscription.entity';
import { History, HistoryType } from './entities/history.entity';
import { executePool, reduceGroup, reduceMap, max } from '../utils';
import { BitClient } from '../chains/bitcoin.client';
import { OrdinalsService } from '../ordinals/ordinals.service';
import BigNumber from 'bignumber.js';
import { UnisatClient } from 'src/chains/unisat.client';

interface Transfer {
    inscription: Inscription;
    out: any;
}

interface TxInscriptions {
    tx: any;//bitcoin.Transaction;
    inscriptions: Inscription[];
    transfers: Transfer[]
}

@Injectable()
export class TaskInscriptionsService {
    private logger = new Logger('TaskInscriptionsService');

    private ordiClient: OrdinalsClient
    bitClient: any;
    unisatClient: UnisatClient;

    constructor(
        private ordinalsService: OrdinalsService,
        private dataSource: DataSource,
        private configService: ConfigService
    ) {
        let self = this;
        this.unisatClient = new UnisatClient(this.configService.get("unisat.url"));
        self.ordiClient = new OrdinalsClient(configService.get('ordinals.url'));
        self.bitClient = new BitClient(self.configService.get("btc.url"),
            self.configService.get("btc.username"), self.configService.get("btc.password"));


        Promise.all([
            self.dataSource.getRepository(History).find(),
            self.dataSource.getRepository(Inscription).find()
        ]).then((values: any[]) => {
            const map = reduceMap(values[1], (item: Inscription) => `${item.txid}i${item.vout}`);
            values[0].forEach((history: History) => {
                if (history.opType == HistoryType.SEND) {
                    self.ordinalsService.send(history.tick, history.from, history.to, history.amount);
                } else {
                    self.ordinalsService.inscribe(map[history.inscriptionId].content, history.to);
                }
            });

            // self.fetchBlock(height);

            self.fetchByBlock(max(values[0][values[0].length - 1].height + 1,
                    values[1][values[1].length - 1].height + 1));

        });
    }

    fetchByBlock(height: number) {
        let self = this;
        self.fetchBlock(height).then(() => {
            self.fetchByBlock(height + 1);
        });
    }

    async fetchBlock(height: number) {
        this.logger.log(`fetchBlock: ${height}`);

        let self = this;
        const uniatHistorys = await self.unisatClient.historyByHeight(height);
        if (uniatHistorys.data.total == 0) {
            this.logger.log(`fetchBlock: ${height} 0 0`);
            return;
        }


        const rets = await Promise.all([this.tryGetBlock(height), this.ordiClient.getInscriptions(height)]);
        const txids = rets[0]['tx'];

        const groups = reduceGroup(rets[1], (item: string) => item.slice(0, 64));
        const tasks = txids.map((each: any) => [each, groups[each]]);

        let txs: TxInscriptions[] = await executePool(100, tasks, this.fetchByTx.bind(this));
        txs = txs.filter((each) => each.inscriptions.length > 0 || each.transfers.length > 0);

        const historys = [];
        const inscriptions = [];
        txs.forEach(each => {
            if (each.tx != null) {
                console.log(each.tx.txid, each.inscriptions.length, each.transfers.filter((each) => each.inscription != null).length);

                each.inscriptions.forEach((inscription) => {
                    inscription.address = each.tx.vout[inscription.vout].scriptPubKey.address;
                    inscriptions.push(inscription);
                    if (self.ordinalsService.inscribe(inscription.content, inscription.address)) {
                        if (inscription.content.op == "deploy") {
                            historys.push({
                                tick: inscription.content.tick.toLowerCase(),
                                opType: `inscribe-${inscription.content.op.toLowerCase()}`,
                                txid: inscription.txid,
                                vout: inscription.vout,
                                satoshi: inscription.value,
                                inscriptionId: `${inscription.txid}i${inscription.vout}`,
                                from: null,
                                to: inscription.address,
                                amount: "0",
                                height: height,
                                timestamp: inscription.timestamp
                            });
                        } else {
                            historys.push({
                                tick: inscription.content.tick.toLowerCase(),
                                opType: `inscribe-${inscription.content.op.toLowerCase()}`,
                                txid: inscription.txid,
                                vout: inscription.vout,
                                satoshi: inscription.value,
                                inscriptionId: `${inscription.txid}i${inscription.vout}`,
                                from: null,
                                to: inscription.address,
                                amount: inscription.content.amt,
                                height: height,
                                timestamp: inscription.timestamp
                            });
                        }
                    }
                });

                let inOffset = 0;
                let outOffset = 0;
                let index = 0;
                each.tx.vout.forEach((out, vout) => {
                    const satoshi = new BigNumber(out.value).multipliedBy(1e8).toNumber();
                    outOffset += satoshi;
                    // console.log(index, inOffset, outOffset);
                    while (index < each.transfers.length) {
                        const transfer = each.transfers[index];
                        if (inOffset < outOffset) {
                            if (transfer.inscription) {
                                const item = {
                                    tick: transfer.inscription.content.tick.toLowerCase(),
                                    opType: 'send',
                                    txid: each.tx.txid,
                                    vout: vout,
                                    satoshi: satoshi,
                                    inscriptionId: `${transfer.inscription.txid}i${transfer.inscription.vout}`,
                                    from: transfer.out.scriptPubKey.address,
                                    to: out.scriptPubKey.address,
                                    amount: transfer.inscription.content.amt,
                                    height: height,
                                    timestamp: each.tx.blocktime
                                };
                                if (self.ordinalsService.send(item.tick, item.from, item.to, item.amount)) {
                                    historys.push(item);
                                }
                            }
                        } else {
                            break;
                        }

                        index += 1;
                        inOffset += new BigNumber(transfer.out.value).multipliedBy(1e8).toNumber();
                    }
                });

                while (index < each.transfers.length) {
                    // if (inOffset > outOffset) {
                    const transfer = each.transfers[index - 1];
                    if (transfer.inscription != null) {
                        const item = {
                            tick: transfer.inscription.content.tick.toLowerCase(),
                            opType: 'send',
                            txid: each.tx.txid,
                            vout: each.tx.vout.length,
                            satoshi: 0,
                            inscriptionId: `${transfer.inscription.txid}i${transfer.inscription.vout}`,
                            from: transfer.out.scriptPubKey.address,
                            to: transfer.out.scriptPubKey.address,
                            amount: transfer.inscription.content.amt,
                            height: height,
                            timestamp: each.tx.blocktime
                        };
                        if (self.ordinalsService.send(item.tick, item.from, item.to, item.amount)) {
                            historys.push(item);
                        }
                    }
                    index += 1;
                    // }
                }
            }
        });

        console.log(historys);
        // if(uniatHistorys.data.detail.length != historys.length) {
        //     console.log(uniatHistorys.data.detail.length, historys.length);
        //     throw Error(`${height}`)
        // }
        // uniatHistorys.data.detail.forEach((item: any, i: number) => {
        //     if (
        //         item.ticker.toLowerCase() == historys[i].tick.toLowerCase()
        //         // && item.type == list[i].opType
        //         && item.txid == historys[i].txid
        //         && item.vout == historys[i].vout
        //         && (item.from == historys[i].from || (item.from == "" && !historys[i].from))
        //         && item.to == historys[i].to
        //         && BigNumber(item.amount).isEqualTo(historys[i].amount)
        //     ) {

        //     } else {
        //         console.log(item, historys[i]);
        //         throw Error(`${height} ${historys[i].txid}`)
        //     }
        // });

        // this.logger.log(`fetchBlock: ${height} ${inscriptions.length} ${historys.length}`);
        // if (inscriptions.length > 0) {
        //     await this.dataSource.getRepository(Inscription).save(inscriptions);
        // }
        // if (historys.length > 0) {
        //     await this.dataSource.getRepository(History).save(historys);
        // }
    }

    async fetchByTx(txid: string, inscriptionIds: string[]): Promise<TxInscriptions> {
        if (txid == "8f5a0497019e1e5f2a0142e958068b092a868f8035a6ed7a414253a73b85b49f" ||
            txid == "daa8e7aff1d97ee92cbd8449f48ffdc24f5933203fcb6d880889eb37bdca681b") {
            return { tx: null, inscriptions: [], transfers: [] }
        }
        const tx = await this.tryGetTx(txid);
        if (tx == null) {
            return { tx: null, inscriptions: [], transfers: [] }
            // throw new Error(`NOFIND_TX[${txid}]`);
        }
        // console.log(txid, inscriptionIds?.length)
        const ids = [];
        if (inscriptionIds && inscriptionIds.length > 0) {
            ids.push(...inscriptionIds);
        }

        tx.vin.forEach((each: any) => {
            ids.push(`${each.txid}i${each.vout}`);
        });

        let inscriptions = [];
        let transferInscriptions = []
        const list = await this.fetchInscriptions(ids);
        if (inscriptionIds && inscriptionIds.length > 0) {
            inscriptions = list.slice(0, inscriptionIds.length).filter(each => each != null);
            transferInscriptions = list.slice(inscriptionIds.length);
        } else {
            transferInscriptions = list;
        }

        const transfers: Transfer[] = [];
        if (transferInscriptions.some((each) => each != null)) {
            const txids = tx.vin.map((each: any) => each.txid);
            const intxs = await executePool(10, txids, this.tryGetTx.bind(this));
            tx.vin.forEach((each: any, index: number) => {
                if (transferInscriptions[index] != null && transferInscriptions[index].op == "transfer") {
                    transfers.push({
                        inscription: transferInscriptions[index],
                        out: intxs[index].vout[each.vout]
                    });
                } else {
                    transfers.push({
                        inscription: null,
                        out: intxs[index].vout[each.vout]
                    });
                }
            });
        }

        return { tx, inscriptions, transfers }
    }

    fetchInscriptions(ids: string[]) {
        return executePool(20, ids, this.tryFetchInscription.bind(this))
    }

    fetchTxs(ids: string[]) {
        return executePool(20, ids, this.tryGetTx.bind(this))
    }

    async fetchInscription(id: string): Promise<Inscription | null> {
        const content = await this.ordiClient.getContent(id);
        if (content.p == 'brc-20' && content.tick && Buffer.from(content?.tick).byteLength == 4) {
            const obj = await this.ordiClient.getInscription(id);
            if (obj.charms.length > 0 && obj.charms.includes("cursed")) {
                return null;
            }
            const inscription = new Inscription();
            inscription.height = obj.genesis_height;
            inscription.inscriptionNumber = obj.inscription_number;
            inscription.txid = obj.inscription_id.slice(0, 64);
            inscription.vout = Number(obj.inscription_id.slice(65));
            inscription.value = obj.output_value;
            inscription.address = obj.address;
            inscription.tick = content.tick.toLowerCase();
            inscription.op = content.op.toLowerCase();
            inscription.content = content;
            inscription.timestamp = obj.timestamp;
            return inscription;
        } else {
            return null;
        }
    }

    tryGetBlock(height: number) {
        let self = this;
        return new Promise((resolve) => {
            self.tryGetRetries(self.bitClient.getblockhash.bind(self.bitClient), [height]).then((blockHash: string) => {
                self.tryGetRetries(self.bitClient.getblock.bind(self.bitClient), [blockHash]).then((block: any) => {
                    resolve(block)
                })
            })
        })
    }

    tryGetTx(id: string, retries: number = 0): Promise<any> {
        return this.tryGetRetries(this.bitClient.getrawtransaction.bind(this.bitClient), [id, true]);
    }

    tryFetchInscription(id: string, retries: number = 0): Promise<Inscription | null> {
        return this.tryGetRetries(this.fetchInscription.bind(this), [id], (error: any) => {
            return error.code == "ERR_BAD_REQUEST"
        });
    }

    tryGetRetries(executeFn: Function, args: any[], handleError?: Function, retries: number = 0): Promise<any> {
        let self = this;
        return new Promise((resolve) => {
            executeFn(...args).then((ret: any) => {
                resolve(ret);
            }, (error: any) => {
                if (handleError && handleError(error)) {
                    resolve(null);
                } else {
                    if (retries < 10) {
                        setTimeout(function () {
                            self.logger.warn(`${executeFn.name.replace(/^bound /, '')}: ${args}, retries: ${retries + 1}`);
                            self.tryGetRetries(executeFn, args, handleError, retries + 1).then((ret: any) => {
                                resolve(ret);
                            });
                        }, 100);
                    } else {
                        self.logger.error(`${executeFn.name.replace(/^bound /, '')}: ${args}, error: ${error.code}`);
                        resolve(null);
                    }
                }
            });
        });
    }
}
