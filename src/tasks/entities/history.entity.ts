import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum HistoryType {
    DEPLOY = "inscribe-deploy",
    MINT = "inscribe-mint",
    TRAMSFER = "inscribe-transfer",
    SEND = "send"
}

@Entity()
@Index('history_index', ['txid', 'vout', 'inscriptionId'], { unique: true })
export class History {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    @Index()
    tick: string;

    @Column()
    opType: HistoryType;

    @Column()
    txid: string;

    @Column()
    vout: number;

    @Column()
    satoshi: number;

    @Column({ nullable: true })
    inscriptionId: string;

    @Column({ nullable: true })
    @Index()
    from: string;

    @Column()
    @Index()
    to: string;

    @Column()
    amount: string;

    @Column()
    height: number;

    @Column()
    timestamp: number;
}


// {
//     "ticker": "patx",
//     "type": "inscribe-mint",
//     "valid": true,
//     "txid": "356f282eff48972ab53fcb71fe259bd67d410d243a1afad75435e657ca4daacc",
//     "idx": 0,
//     "vout": 0,
//     "offset": 0,
//     "inscriptionNumber": 698384,
//     "inscriptionId": "356f282eff48972ab53fcb71fe259bd67d410d243a1afad75435e657ca4daacci0",
//     "from": "",
//     "to": "tb1qafe5tu7fefrwv6nd5urxftlpysyl0sn5cytaw5",
//     "satoshi": 546,
//     "fee": 139,
//     "amount": "100000",
//     "overallBalance": "1200000",
//     "transferBalance": "200000",
//     "availableBalance": "1000000",
//     "height": 2568839,
//     "txidx": 102,
//     "blockhash": "00000000000000340c699eba964d7603b8b2a591be11a71cd5e15b6df4893dec",
//     "blocktime": 1703861412
//   }