// pass-credentials.module.ts
import { Module } from '@nestjs/common';
import { PassCredentialsService } from './pass-credentials.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassCredentials } from './pass-credentials.entity';
import { EncryptionModule } from '../sha/encryption.module';

@Module({
  imports: [TypeOrmModule.forFeature([PassCredentials]), EncryptionModule],
  providers: [PassCredentialsService],
  exports: [PassCredentialsService],
})
export class PassCredentialsModule {}
