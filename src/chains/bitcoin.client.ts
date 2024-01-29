import axios from 'axios';
import got from 'got';

const needle = require('needle');
const http = require('http');
const { Agent } = require('http');
const agent = new Agent({ keepAlive: true });

function getRandomId() {
    return String(Math.random() * 100000)
}

export class AxiosClient {

    baseURL: string;
    auth: string;

    constructor(url: string, user: string, password: string) {
        this.baseURL = url;
        var userInfo = user + ':' + password;
        this.auth = Buffer.from(userInfo).toString('base64');
    }

    rpc(method: string, args: any[]): Promise<any> {
        let self = this;
        return new Promise(async (resolve, reject) => {
            // console.log(new Date());
            // var stream = needle.post(this.baseURL, {
            //     "jsonrpc": "1.0",
            //     "id": getRandomId(),
            //     "method": method,
            //     "params": args
            // }, {
            //     compressed: true,
            //     stream: true,
            //     parse: false,
            //     response_timeout: 0,
            //     read_timeout: 0,
            //     open_timeout: 0,
            //     // stream_length: 0,
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Basic ${self.auth}`,
            //     }
            // });

            // const list: Buffer[] = []
            // stream.on('readable', function (err) {
            //     var chunk: any;
            //     if(err) {
            //         console.log(err);
            //     }
            //     while (chunk = this.read()) {
            //         list.push(chunk);
            //         console.log(new Date(), 'got data: ', chunk.length);
            //     }
            // })

            // stream.on('done', function (err) {
            //     if (!err) {
            //         console.log('Great success!')
            //         resolve(Buffer.concat(list).toString());
            //     } else {
            //         reject(err)
            //     }
            // })

            // stream.on('close', function (err) {
            //     if (!err) {
            //         console.log('close!')
            //         resolve(Buffer.concat(list).toString());
            //     } else {
            //         reject(err)
            //     }
            // })

            // stream.on('err', function (err) {
            //     if (!err) {
            //         console.log('Great success!')
            //         resolve(JSON.parse(
            //             Buffer.concat(list).toString()
            //         ));
            //     } else {
            //         reject(err)
            //     }
            // })

            axios.post(this.baseURL,
                {
                    "jsonrpc": "1.0",
                    "id": getRandomId(),
                    "method": method,
                    "params": args
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${self.auth}`,
                    },
                    responseType: 'stream',
                    maxContentLength: Infinity,
                    // maxBodyLength: Infinity,
                    // maxRedirects: 0
                }
            ).then((response) => {
                const list: Buffer[] = []
                response.data.on('data', data => {
                    list.push(data);
                });
                response.data.on('end', () => {
                    resolve(JSON.parse(
                        Buffer.concat(list).toString()
                    ).result);
                });

                response.data.on('close', () => {
                    resolve(null);
                });

            }, (err) => {
                reject(err)
            });
        });
    }
}

function generateRPCMethods(constructor: any, apiCalls: any, rpc: any) {
    function createRPCMethod(methodName: string, argMap: any[]) {
        return function () {
            const args = [];
            for (var i = 0; i < arguments.length; i++) {
                if (argMap[i]) {
                    arguments[i] = argMap[i](arguments[i]);
                    args.push(argMap[i](arguments[i]));
                } else {
                    args.push(arguments[i]);
                }
            }
            return rpc.call(this, methodName, args);
        };
    };

    var types = {
        str: function (arg: any) {
            return arg.toString();
        },
        int: function (arg: any) {
            return parseFloat(arg);
        },
        float: function (arg: any) {
            return parseFloat(arg);
        },
        bool: function (arg: any) {
            return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
        },
        obj: function (arg: any) {
            if (typeof arg === 'string') {
                return JSON.parse(arg);
            }
            return arg;
        }
    };

    for (var k in apiCalls) {
        var spec = [];
        if (apiCalls[k].length) {
            spec = apiCalls[k].split(' ');
            for (var i = 0; i < spec.length; i++) {
                if (types[spec[i]]) {
                    spec[i] = types[spec[i]];
                } else {
                    spec[i] = types.str;
                }
            }
        }
        var methodName = k.toLowerCase();
        constructor.prototype[k] = createRPCMethod(methodName, spec);
        constructor.prototype[methodName] = constructor.prototype[k];
    }
    return constructor;
}


export const BitClient = generateRPCMethods(AxiosClient, {
    getBlockCount: '',
    getblockhash: 'int',
    getblock: 'str',
    gettxout: 'str int',
    gettxoutdata: 'str int',
    getrawtransaction: 'str bool',
    sendrawtransaction: 'str',
}, AxiosClient.prototype.rpc);