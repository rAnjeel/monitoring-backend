export interface WorkerData {
    credentials: {
        host: string;
        port?: number;
        username: string;
        password: string;
    };
    cmd: string;
    prompt?: string;
    exitCmd?: string;
    codeSite?: string;
    forTest?: boolean;
}

export interface WorkerResponse {
    error: boolean;
    errorType?: string;
    output: string;
    message: string;
}