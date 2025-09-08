/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pass_credentials')
export class PassCredentials {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  sitePort: string;

  @Column({ length: 255})
  password: string;

  @Column({ length: 100 })
  siteSSHVersion: string;
}
