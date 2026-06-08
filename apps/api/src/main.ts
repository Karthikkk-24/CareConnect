import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);
  console.log(`CareConnect API running on http://localhost:${port}/graphql`);
}
bootstrap();
