import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as figlet from 'figlet';
import { AppModule } from './app.module';

const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function printBanner(): Promise<void> {
  const art = figlet.textSync('EcoGuide', {
    font: 'Standard',
    horizontalLayout: 'default',
  });

  for (const line of art.split('\n')) {
    console.log(`${GREEN}${BOLD}${line}${RESET}`);
    await sleep(35);
  }

  console.log('');
}

async function bootstrap() {
  const logger = new Logger('EcoGuide');

  await printBanner();

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EcoGuide Training API')
    .setDescription('API para la plataforma educativa de ecoturismo EcoGuide.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`EcoGuide Training API corriendo en el puerto ${port}`);
}
void bootstrap();
