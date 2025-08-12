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
import { LoginGateway } from './login/login.gateway';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3307,
      username: process.env.MYSQL_USER || 'monitoring_user',
      password: process.env.MYSQL_PASSWORD || 'monitoring_password',
      database: process.env.MYSQL_DATABASE || 'monitoring_4g',
      autoLoadEntities: true,
      synchronize: true,
      extra: {
        timezone: '+03:00' 
      },
    }),
    TypeOrmModule.forFeature([Credentials]),
    TypeOrmModule.forFeature([HistoricCredentials])
  ],
  controllers: [AppController, CsvImportController, CredentialsController, HistoricCredentialsController],
  providers: [AppService, CsvImportService, CredentialsService, HistoricCredentialsService, IpMiddleware, LoginGateway],
})
export class AppModule {}
