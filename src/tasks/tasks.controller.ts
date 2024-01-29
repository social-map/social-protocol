import { Body, Controller, Get, Logger, Param, Post, Req } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { OrdinalsClient } from '../chains/ordinals/ordinals.client';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UnisatClient } from '../chains/unisat.client';
import { History, HistoryType } from './entities/history.entity';

@Controller()
export class TasksController {

    private ordiClient: OrdinalsClient
    private unisatClient: UnisatClient;

    constructor(
        private dataSource: DataSource,
        private configService: ConfigService) {
        this.ordiClient = new OrdinalsClient(configService.get('ordinals.url'));
        this.unisatClient = new UnisatClient(this.configService.get("unisat.url"));
    }

    @Get(['inscriptions', 'inscriptions/:block'])
    inscriptions(@Param("block") block: number) {
        return this.ordiClient.getInscriptions(block);
    }

    @Get('inscription/:id')
    inscription(@Param("id") id: string) {
        return this.ordiClient.getInscription(id);
    }

    @Get('content/:id')
    async content(@Param("id") id: string) {
        try {
            return await this.ordiClient.getContent(id);
        } catch (error) {
            console.log(error)
        }
    }

    @Get(['check/', 'check/:tick'])
    async check(@Param('tick') tick: string) {
        if (!tick) {
            const ticks = await this.dataSource.getRepository(History).createQueryBuilder('history')
                .select('DISTINCT history.tick', 'tick')
                .getRawMany();

            console.log()
            for (var j = 0; j < ticks.length; j++) {
                const ret = await this._check(encodeURIComponent(ticks[j].tick));
                if (ret == 'FAILE') {
                    return "FAILE"
                }
            }
            return "SUCCESS";
        } else {
            return await this._check(encodeURIComponent(tick))
        }
    }

    async _check(tick: string) {
        // const tick = encodeURIComponent(ticks[j].tick);
        const list = await this.dataSource.getRepository(History).findBy({ tick: tick });
        const rets = await this.unisatClient.history(tick, null, 0, list.length + 200);
        const history = rets.data.detail.filter(detail => detail.valid);
        for (var i = 0; i < list.length; i++) {
            const item = history[i];
            if (
                item.ticker.toLowerCase() == list[i].tick.toLowerCase()
                // && item.type == list[i].opType
                && item.txid == list[i].txid
                && item.vout == list[i].vout
                && (item.from == list[i].from || (item.from == "" && !list[i].from))
                && item.to == list[i].to
                && item.amount == list[i].amount
            ) {

            } else {
                console.log(list[i].id, item, list[i]);
                return "FAILE";
                // break
            }
        }
        return "SUCCESS";
    }

}