/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsvImportService } from './csv-import/csv-import.service';
import { CsvImportController } from './csv-import/csv-import.controller';
import { Credentials } from './credentials/credentials.entity';
import { CredentialsController } from './credentials/credentials.controller';
import { CredentialsService } from './credentials/credentials.service';
import { HistoricCredentials } from './historic-credentials/historic-credentials.entity';
import { HistoricCredentialsController } from './historic-credentials/historic-credentials.controller';
import { HistoricCredentialsService } from './historic-credentials/historic-credentials.service'
import { IpMiddleware } from './middleware/IpMiddleware';
import { ApiGateway } from './api/api.gateway';
import { ApiController } from './api/api.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SshModule } from './ssh/ssh.module';
import { SshController } from './ssh/ssh.controller';
import { HealthController } from './utils/health/health.controller';
import { EncryptionService } from './utils/sha/encryption.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('MYSQL_HOST'),
        port: configService.get<number>('MYSQL_PORT'),
        username: configService.get<string>('MYSQL_USER'),
        password: configService.get<string>('MYSQL_PASSWORD'),
        database: configService.get<string>('MYSQL_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
        extra: {
          timezone: configService.get<string>('TIMEZONE'),
        },
      }),
    }),
    TypeOrmModule.forFeature([Credentials]),
    TypeOrmModule.forFeature([HistoricCredentials]),
    SshModule,
  ],
  controllers: [
    AppController,
    CsvImportController,
    CredentialsController,
    HistoricCredentialsController,
    ApiController,
    SshController,
    HealthController,
  ],
  providers: [
    AppService,
    CsvImportService,
    CredentialsService,
    HistoricCredentialsService,
    IpMiddleware,
    ApiGateway,
    EncryptionService,
  ],
})
export class AppModule {}
