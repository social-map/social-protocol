import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { executePool } from './utils';

describe('AppController (e2e)', () => {

  beforeEach(async () => {
   
  });


  it('/ (GET)', async () => {

    const tasks = Array(50).fill(0).map((_, index) => index + 1);
    console.log(tasks);
    const rets = await executePool(5, tasks, function(value:number) {
        return new Promise((resolve)=>{
            setTimeout(()=>{
              console.log(value);
                resolve(value + 1);
            }, 1000)
        })
    });
    console.log(rets);
  });
});
