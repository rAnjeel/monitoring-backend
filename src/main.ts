/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active CORS pour toutes les origines (développement)
  app.enableCors({
    origin: 'http://localhost:5173', // ou true pour tout autoriser
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
