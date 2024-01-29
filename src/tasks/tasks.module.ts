import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TaskInscriptionsService } from './tasks.inscriptions.service';
import { OrdinalsModule } from '../ordinals/ordinals.module';


@Module({
  imports: [OrdinalsModule],
  controllers: [TasksController],
  providers: [TaskInscriptionsService]
})
export class TasksModule { }
