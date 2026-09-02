// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.setGlobalPrefix('api/v1');

//   // app.useGlobalPipes(
//   //   new ValidationPipe({
//   //     transform: true, // แปลง query string เป็น type ตาม @Type() ใน DTO
//   //     whitelist: true, // ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง
//   //   }),
//   // );

//   app.enableCors({
//     origin: process.env.FRONTEND,
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//     credentials: true,
//   });

//   await app.listen(process.env.PORT ?? 3000);
// }
// void bootstrap();
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.frontend,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.init(); // ← ใช้ init() แทน listen()
}

bootstrap().catch((err) => {
  console.error(err);
});

export default server; // ← Vercel จะเรียก server ตัวนี้
