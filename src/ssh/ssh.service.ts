/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ssh2';

export interface SshCredentials {
    host: string;
    port?: number;
    username: string;
    password: string;
}

@Injectable()
export class SshService {
    private readonly logger = new Logger(SshService.name);
    private connectionStartTime: number;

    async testConnection(credentials: SshCredentials): Promise<{ status: string, output: string }> {
        return new Promise((resolve, reject) => {
            this.connectionStartTime = Date.now();
            this.logger.debug(`Starting SSH connection to ${credentials.host}:${credentials.port || 22}`);
            this.logger.debug(`Connection started at: ${new Date(this.connectionStartTime).toISOString()}`);

            credentials["tryKeyboard"] = true;

            credentials["algorithms"] = {
                kex: [
                    "diffie-hellman-group1-sha1",
                    "ecdh-sha2-nistp256",
                    "ecdh-sha2-nistp384",
                    "ecdh-sha2-nistp521",
                    "diffie-hellman-group-exchange-sha256",
                    "diffie-hellman-group14-sha1",
                ],

                cipher: [
                    "aes128-cbc",
                    "3des-cbc",
                    "blowfish-cbc",
                    "aes128-ctr",
                    "aes192-ctr",
                    "aes256-ctr",
                    "aes128-gcm",
                    "aes128-gcm@openssh.com",
                    "aes256-gcm",
                    "aes256-gcm@openssh.com",
                ],

                serverHostKey: [
                    "ssh-rsa",
                    "ssh-dss",
                    "ssh-ed25519",
                    "ecdsa-sha2-nistp256",
                    "ecdsa-sha2-nistp384",
                    "ecdsa-sha2-nistp521",
                ]
            };

            const conn = new Client();

            // Log de débogage détaillé avec timing
            (conn as any).on('debug', (message: string) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] SSH Debug: ${message}`);
                console.log(`[+${elapsedTime}ms] SSH Debug: ${message}`);
            });

            conn.on('handshake', (negotiated) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] Handshake initiated`);
                console.log(`[+${elapsedTime}ms] Handshake initiated`);
            });

            conn.on('banner', (message) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] Banner received: ${message}`);
                console.log(`[+${elapsedTime}ms] Banner received: ${message}`);
            });

            conn.on('ready', () => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.log(`[+${elapsedTime}ms] Connected to ${credentials.host}`);
                console.log(`[+${elapsedTime}ms] Connected to ${credentials.host}`);

                const output: string = '';

                conn.shell((err, stream) => {
                    if (err) {
                        const elapsedTime = Date.now() - this.connectionStartTime;
                        this.logger.error(`[+${elapsedTime}ms] Shell error: ${err.message}`);
                        console.error(`[+${elapsedTime}ms] ERROR ON EXECUTING SCRIPT =>`, err);
                        conn.end();
                        reject(new Error(`Shell error: ${err.message}`));
                        return;
                    }

                    stream
                        .on("close", () => {
                            const elapsedTime = Date.now() - this.connectionStartTime;
                            this.logger.debug(`[+${elapsedTime}ms] Shell stream closed`);
                            conn.end();
                        })
                        .on("data", (data: any) => {
                            const elapsedTime = Date.now() - this.connectionStartTime;
                            this.logger.debug(`[+${elapsedTime}ms] Shell data: ${data.toString().trim()}`);
                            console.log(`[+${elapsedTime}ms]`, data.toString());
                        })
                        .stderr.on("data", (data) => {
                            const elapsedTime = Date.now() - this.connectionStartTime;
                            this.logger.error(`[+${elapsedTime}ms] STDERR: ${data}`);
                            console.error(`[+${elapsedTime}ms] STDERR =>`, data);
                        });
                });

                resolve({ status: 'connected', output });
            });

            conn.on("keyboard-interactive", (name, descr, lang, prompts, finish) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] Keyboard-interactive authentication`);
                console.log(`[+${elapsedTime}ms] Keyboard-interactive authentication`);
                return finish([credentials.password]);
            });

            conn.on('error', (err) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.error(`[+${elapsedTime}ms] SSH error: ${err.message}`);
                this.logger.error(`[+${elapsedTime}ms] Error stack: ${err.stack}`);
                console.error(`[+${elapsedTime}ms] SSH error: ${err.message}`);
                conn.end();
                reject(new Error(`SSH error: ${err.message}`));
            });

            conn.on('end', () => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.debug(`[+${elapsedTime}ms] SSH connection ended`);
                console.log(`[+${elapsedTime}ms] SSH connection ended`);
            });

            (conn as any).on('close', (hadError: boolean) => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.log(`[+${elapsedTime}ms] Connection closed ${hadError ? 'with error' : 'cleanly'}`);
                console.log(`[+${elapsedTime}ms] Connection closed ${hadError ? 'with error' : 'cleanly'}`);
            });

            // Gestion spécifique du timeout
            conn.on('timeout', () => {
                const elapsedTime = Date.now() - this.connectionStartTime;
                this.logger.error(`[+${elapsedTime}ms] SSH connection timeout after ${elapsedTime}ms`);
                console.error(`[+${elapsedTime}ms] SSH connection timeout after ${elapsedTime}ms`);
                
                // Log des informations de connexion pour le débogage
                this.logger.debug(`[+${elapsedTime}ms] Connection details:`, {
                    host: credentials.host,
                    port: credentials.port,
                    username: credentials.username,
                    timeout: 1000 * 60
                });
                
                reject(new Error(`SSH connection timeout after ${elapsedTime}ms`));
            });

            // Configuration de connexion
            const connectionConfig = {
                host: credentials.host,
                port: credentials.port,
                username: credentials.username,
                password: credentials.password,
                readyTimeout: 1000 * 10,
                tryKeyboard: true,
                debug: (msg: string) => {
                    const elapsedTime = Date.now() - this.connectionStartTime;
                    console.log(`[+${elapsedTime}ms] SSH Internal: ${msg}`);
                },
            };

            this.logger.debug('Attempting connection with config:', {
                ...connectionConfig,
                password: '***' // Masquer le mot de passe dans les logs
            });

            console.log('Connection config:', {
                ...connectionConfig,
                password: '***'
            });

            conn.connect(connectionConfig);

            // // Timer pour suivre l'état de la connexion
            // const checkInterval = setInterval(() => {
            //     const elapsedTime = Date.now() - this.connectionStartTime;
            //     this.logger.debug(`[+${elapsedTime}ms] Connection still in progress...`);
            //     console.log(`[+${elapsedTime}ms] Connection still in progress...`);
            // }, 1000);

            // // Nettoyer le timer quand la connexion se termine
            // const cleanup = () => clearInterval(checkInterval);
            // conn.once('ready', cleanup);
            // conn.once('error', cleanup);
            // (conn as any).once('close', cleanup);
            // conn.once('timeout', cleanup);
        });
    }

    // Méthode utilitaire pour tester la connectivité réseau
    async testNetworkConnectivity(host: string, port: number = 22): Promise<void> {
        this.logger.debug(`Testing network connectivity to ${host}:${port}`);
        
        const dns = require('dns');
        const net = require('net');
        
        // Test de résolution DNS
        try {
            const startTime = Date.now();
            const addresses = await dns.promises.resolve4(host);
            const elapsedTime = Date.now() - startTime;
            this.logger.debug(`[+${elapsedTime}ms] DNS resolution successful: ${addresses.join(', ')}`);
            console.log(`[+${elapsedTime}ms] DNS resolution successful: ${addresses.join(', ')}`);
        } catch (dnsError) {
            this.logger.error(`DNS resolution failed: ${dnsError.message}`);
            console.error(`DNS resolution failed: ${dnsError.message}`);
            throw dnsError;
        }
        
        // Test de connexion TCP
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const startTime = Date.now();
            
            socket.setTimeout(5000);
            
            socket.on('connect', () => {
                const elapsedTime = Date.now() - startTime;
                this.logger.debug(`[+${elapsedTime}ms] TCP connection to ${host}:${port} successful`);
                console.log(`[+${elapsedTime}ms] TCP connection to ${host}:${port} successful`);
                socket.destroy();
                resolve();
            });
            
            socket.on('timeout', () => {
                const elapsedTime = Date.now() - startTime;
                this.logger.error(`[+${elapsedTime}ms] TCP connection to ${host}:${port} timed out`);
                console.error(`[+${elapsedTime}ms] TCP connection to ${host}:${port} timed out`);
                socket.destroy();
                reject(new Error('TCP connection timeout'));
            });
            
            socket.on('error', (error) => {
                const elapsedTime = Date.now() - startTime;
                this.logger.error(`[+${elapsedTime}ms] TCP connection error: ${error.message}`);
                console.error(`[+${elapsedTime}ms] TCP connection error: ${error.message}`);
                reject(error);
            });
            
            this.logger.debug(`Attempting TCP connection to ${host}:${port}`);
            socket.connect(port, host);
        });
    }
}