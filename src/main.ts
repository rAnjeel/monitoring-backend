/* eslint-disable prettier/prettier */
import * as nodeCrypto from 'crypto';

process.on('warning', (warning) => {
  if (
    (warning.name === 'DeprecationWarning' && warning.message.includes('crypto.createCipher')) ||
    warning.message.includes('Use Cipheriv for counter mode of aes-256-ctr')
  ) {
    return;
  }
  console.warn(warning.name, warning.message);
});

if (!globalThis.crypto) {
  (globalThis as any).crypto = {
    randomUUID: () => nodeCrypto.randomUUID()
  };
}


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SeedPassCredentialsService } from './utils/pass-credentials/seed-pass-credentials.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Lire CORS depuis .env
  const corsEnv = configService.get<string>('CORS_ORIGINS')?.split(',').map(origin => origin.trim()) || [];
  app.enableCors({
    origin: corsEnv,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('API Credentials')
    .setDescription('Documentation de l’API de gestion des credentials')
    .setVersion('1.0')
    .addTag('Credentials')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useWebSocketAdapter(new IoAdapter(app));

  // Seed PassCredentials
  const seedService = app.get(SeedPassCredentialsService);
  await seedService.run();

  // Lire PORT depuis .env
  const port = Number(configService.get<string>('PORT'));
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`HTTP server ready at http://localhost:${port}`);
  logger.log(`WebSocket (Socket.IO) ready at ws://localhost:${port}`);
}
bootstrap();
