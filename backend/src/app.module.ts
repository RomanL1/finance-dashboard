import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [DbModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
