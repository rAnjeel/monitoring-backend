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
import { LoginController } from './login/login.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes it available everywhere without importing again
      envFilePath: '.env', // you can also set a specific path
   }),
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
  controllers: [AppController, CsvImportController, CredentialsController, HistoricCredentialsController, LoginController],
  providers: [AppService, CsvImportService, CredentialsService, HistoricCredentialsService, IpMiddleware, LoginGateway],
})
export class AppModule {}
