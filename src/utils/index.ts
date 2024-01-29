export const executePool = async (poolLimit: number, array: any[], executeFn: Function) => {
    const resultList = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => {
            if (Array.isArray(item)) {
                return executeFn(...item);
            } else {
                return executeFn(item);
            }
        });
        resultList.push(p);
        if (poolLimit <= array.length) {
            const e = p.then(() => {
                return executing.splice(executing.indexOf(e), 1);
            });
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(resultList);
};

export function reduceGroup(list: any[], keyFun: Function) {
    return list.reduce((grouped: any, item: string) => {
        const key = keyFun(item);
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
        return grouped;
    }, {});
}

export function reduceMap(list: any[], keyFun: Function) {
    return list.reduce((grouped: any, item: string) => {
        const key = keyFun(item);
        grouped[key] = item;
        return grouped;
    }, {});
}

export function max(a: number, b: number) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}


export function tryGetRetries(executeFn: Function, args: any[], handleError?: Function, retries: number = 0): Promise<any> {
    return new Promise((resolve) => {
        executeFn(...args).then((ret: any) => {
            resolve(ret);
        }, (error: any) => {
            if (handleError && handleError(error)) {
                resolve(null);
            } else {
                if (retries < 10) {
                    setTimeout(function () {
                        // self.logger.warn(`${executeFn.name.replace(/^bound /, '')}: ${args}, retries: ${retries + 1}`);
                        tryGetRetries(executeFn, args, handleError, retries + 1).then((ret: any) => {
                            resolve(ret);
                        });
                    }, 100);
                } else {
                    // self.logger.error(`${executeFn.name.replace(/^bound /, '')}: ${args}, error: ${error.code}`);
                    resolve(null);
                }
            }
        });
    });
}

export function isNumber(value: unknown): boolean {
    if (typeof value === 'number') {
      return value - value === 0;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return Number.isFinite ? Number.isFinite(+value) : isFinite(+value);
    }
    return false;
  }