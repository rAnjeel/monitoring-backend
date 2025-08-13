/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { LoginGateway } from './login.gateway';

describe('LoginGateway', () => {
  let gateway: LoginGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginGateway],
    }).compile();

    gateway = module.get<LoginGateway>(LoginGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
