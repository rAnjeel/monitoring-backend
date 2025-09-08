/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { SshService } from './ssh.service';
import { PassCredentialsModule } from '../utils/pass-credentials/pass-credentials.module';

@Module({
  imports: [PassCredentialsModule],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule { }
