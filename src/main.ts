/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active CORS pour toutes les origines (développement)
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : 'http://localhost:5173';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

   
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 HTTP server ready at http://localhost:${port}`);
  logger.log(`🔌 WebSocket (Socket.IO) ready at ws://localhost:${port}`);
}
bootstrap();
