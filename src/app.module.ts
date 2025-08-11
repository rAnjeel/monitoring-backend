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
    }),
    TypeOrmModule.forFeature([Credentials]),
  ],
  controllers: [AppController, CsvImportController, CredentialsController],
  providers: [AppService, CsvImportService, CredentialsService],
})
export class AppModule {}
