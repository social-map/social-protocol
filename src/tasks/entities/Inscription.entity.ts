import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';


@Entity()
@Index('inscription_index', ['txid', 'vout'], { unique: true })
export class Inscription {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    height: number

    @Column()
    inscriptionNumber: number;

    @Column()
    txid: string

    @Column()
    vout: number

    @Column()
    value: number

    @Column()
    @Index()
    address: string

    @Column({ type: 'varchar', length: 4 })
    @Index()
    tick: string

    @Column({ type: 'varchar', length: 10 })
    op: string

    @Column({
        type: 'text', transformer: {
            to: (value: any) => { return JSON.stringify(value) },
            from: (value: string) => { return JSON.parse(value); },
        }
    })
    content: any

    @Column()
    timestamp: number;
}
