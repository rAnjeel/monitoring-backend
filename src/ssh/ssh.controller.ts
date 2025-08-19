/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { SshService, SshCredentials } from './ssh.service';

@Controller('ssh')
export class SshController {
    constructor(private readonly sshService: SshService) { }

    @Post('test')
    async test(@Body() credentials: SshCredentials) {
        try {
            return await this.sshService.testConnection(credentials);
        } catch (err) {
            return { message: err instanceof Error ? err.message : 'Unknown error' }; 
        }
    }
}
