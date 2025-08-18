import { Controller, Get } from '@nestjs/common';
import { SshService } from './ssh.service';
import { WorkerData } from './interface/worker.interface';

@Controller('ssh')
export class SshController {
    constructor(private readonly sshService: SshService) { }

    @Get('execute')
    async executeCommand(): Promise<string> {
        const commandData: WorkerData = {
            credentials: {
                host: '10.14.158.26',
                port: 2023,
                username: 'rbs',
                password: 'anltlm2bsc7-GLX@',
            },
            cmd: 'show -r -m FmAlarm',
            prompt: '#',
            exitCmd: 'exit',
        };

        return this.sshService.executeCommand(commandData);
    }
}