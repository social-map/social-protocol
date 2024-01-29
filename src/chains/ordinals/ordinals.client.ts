import axios from "axios";
import * as https from "https";

const agent = new https.Agent({
    rejectUnauthorized: false
});

export class OrdinalsClient {
    private base: string;

    constructor(base: string) {
        this.base = base;
    }

    async axiosGet(path: string, configs?: any) {
        return axios.get(`${this.base}/${path}`,
            {
                headers: {
                    "Accept": "application/json"
                },
                httpsAgent: agent,
            }).then((resp) => {
                return resp.data;
            }, (err) => {
                throw err;
            });
    }

    async getInscriptions(blockNum?: number): Promise<any> {
        if (!blockNum) {
            return await this.axiosGet(`inscriptions`);
        }

        let inscriptions = [];
        let pageIndex = 0;
        while (true) {
            const rets = await this.axiosGet(`inscriptions/block/${blockNum}/${pageIndex}`);
            inscriptions.push(...rets.inscriptions);
            if (!rets.more) {
                break
            }
            pageIndex += 1;
        }
        return inscriptions;
    }

    getInscription(id: string) {
        return this.axiosGet(`inscription/${id}`);
        // return Promise.all([
        //     this.axiosGet(`inscription/${id}`),
        //     this.axiosGet(`content/${id}`)
        // ]).then((vals) => {
        //     vals[0]['content_body'] = vals[1];
        //     return vals[0];
        // });
    }

    getContent(id: string) {
        return this.axiosGet(`content/${id}`);
    }

    async getOutput(id: string) {
        return await this.axiosGet(`output/${id}`);
    }

    async getEventsByBlock(blockHash: string) {
        return await this.axiosGet(`api/v1/brc20/block/${blockHash}/events`);
    }

}