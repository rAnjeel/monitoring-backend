import { WorkerData } from './worker.interface';

export interface SshService {
    executeCommand(data: WorkerData): Promise<string>;
}