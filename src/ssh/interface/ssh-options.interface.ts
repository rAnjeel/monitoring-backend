export interface SshOptions {
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey?: string;
    readyTimeout?: number;
    tryKeyboard?: boolean;
    algorithms?: {
        kex?: string[];
        cipher?: string[];
        serverHostKey?: string[]
    };
}
