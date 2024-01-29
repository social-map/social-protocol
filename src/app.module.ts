import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { OrdinalsModule } from './ordinals/ordinals.module';
import { AssetsModule } from './assets/assets.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        if (configService.get("mysql")) {
          return {
            type: 'mysql',
            host: configService.get('database.host') || '127.0.0.1',
            port: configService.get('database.port') || 3306,
            username: configService.get('database.username'),
            password: configService.get('database.password'),
            database: configService.get('database.name'),
            entities: [__dirname + '/**/entities/*.entity.{js,ts}'],
            synchronize: true,
            // logging: true,
            extra: {
              timezone: configService.get('database.timezone'),
            }
          }
        } else {
          return {
            type: 'sqlite',
            database: `${configService.get('database.name')}.db`,
            entities: [__dirname + '/**/entities/*.entity.{js,ts}'],
            synchronize: true,
            // logging: true,
          }
        }
      }
    }),
    // ScheduleModule.forRoot(),
    OrdinalsModule,
    AssetsModule,
    TasksModule
  ],
})
export class AppModule {}
