/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'credentials_sites' })
export class Credentials {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  Ip: string;

  @Column({ length: 50 })
  CodeSite: string;

  @Column({ length: 50 })
  siteUsername: string;

  @Column({ length: 50 })
  sitePassword: string;

  @Column('int')
  isSitePasswordVerified: number;

  @Column('int')
  sitePort: number;

  @Column({ length: 50 })
  siteSShVersion: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastDateChange: Date;

  @Column('bool')
  toVerify: boolean;
}
