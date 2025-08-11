/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'credentials_sites' }) // Le nom de la table dans la base reste 'credentials_sites'
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

  @Column({ length: 50 })
  siteUsernameEntered: string;

  @Column({ length: 50 })
  sitePasswordEntered: string;

  @Column('int')
  sitePortEntered: number;
}
