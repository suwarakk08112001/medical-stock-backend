import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // แปลง query string เป็น type ตาม @Type() ใน DTO
      whitelist: true, // ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
