/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Credentials } from '../credentials/credentials.entity';

@Entity('credentials_sites_historic')
export class HistoricCredentials {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false })
  siteId: number;

  @ManyToOne(() => Credentials)
  @JoinColumn({ name: 'siteId', referencedColumnName: 'id' })
  site: Credentials;

  @Column({ type: 'timestamp', nullable: true })
  connectionErrorDate: Date;

  @Column({ type: 'text', nullable: true })
  errorDescription: string;

  @Column({ type: 'timestamp', nullable: true })
  errorResolutionDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorStatus: string;
}
