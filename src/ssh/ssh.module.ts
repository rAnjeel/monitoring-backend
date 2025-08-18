import { Module } from '@nestjs/common';
import { SshService } from './ssh.service';

@Module({
  providers: [SshService]
})
export class SshModule {}
