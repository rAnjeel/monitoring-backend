import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { WorkerData, WorkerResponse } from './interface/worker.interface';


@Injectable()
export class SshService {
    async executeCommand(data: WorkerData): Promise<string> {
        return new Promise((resolve, reject) => {
            const workerPath = this.getWorkerPath(data);
            const worker = new Worker(workerPath, { workerData: data });
            
            worker.on('message', (response: WorkerResponse) => {
                if (response.error) {
                    reject(new Error(`${response.errorType}: ${response.message}`));
                } else {
                    resolve(response.output);
                }
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }

    private getWorkerPath(data: WorkerData): string {
        const workerDir = path.join(__dirname, 'workers');

        if (data.codeSite === 'ose-shell') {
            return path.join(workerDir, 'ssh_ose_thread.js');
        }
        return path.join(workerDir, 'ssh_thread.js');
    }
}
