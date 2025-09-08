/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ssh2';
import { EncryptionService } from '../utils/sha/encryption.service';

export interface SshCredentials {
    host: string;
    port?: number;
    username: string;
    password: string;
    siteSShVersion: string;
}

@Injectable()
export class SshService {
    private readonly logger = new Logger(SshService.name);
    private connectionStartTime: number;
    private readonly encryptionService: EncryptionService;

    async testConnection(credentials: SshCredentials): Promise<{ status: string, output: string }> {
        return new Promise((resolve, reject) => {
            this.connectionStartTime = Date.now();
            const conn = new Client();

            conn.on("ready", () => {
            this.logger.log(`Connexion SSH réussie (${credentials.host}:${credentials.port || 22})`);

            // Vérification du shell utilisateur
            conn.exec("echo $SHELL", (err, stream) => {
                if (err) {
                conn.end();
                return reject(new Error(`Impossible de déterminer le shell: ${err.message}`));
                }

                let shellOutput = "";
                stream.on("data", (data: Buffer) => {
                shellOutput += data.toString().trim();
                });

                stream.on("close", () => {
                this.logger.debug(`Shell détecté: ${shellOutput}`);

                if (credentials.siteSShVersion === "ose-shell") {
                    if (!shellOutput.includes("ose-shell")) {
                    conn.end();
                    return reject(new Error(`Erreur détectée: Shell attendu "ose-shell", mais trouvé "${shellOutput}"`));
                    }
                } else if (credentials.siteSShVersion === "usual-shell") {
                    // Ici on considère usual-shell = bash, sh, zsh etc.
                    if (shellOutput.includes("ose-shell")) {
                    conn.end();
                    return reject(new Error(`Erreur détectée: Shell attendu "usual-shell", mais trouvé "${shellOutput}"`));
                    }
                }

                conn.end();
                resolve({ status: "connected", output: `Connexion réussie avec shell ${shellOutput}` });
                });
            });
            });

            conn.on("keyboard-interactive", (name, descr, lang, prompts, finish) => {
            return finish([credentials.password]);
            });

            conn.on("error", (err) => {
            let friendlyMessage: string;
            if (err.message.includes("ECONNREFUSED")) {
                friendlyMessage = "Erreur détectée: Port invalide ou fermé";
            } else if (err.message.includes("ETIMEDOUT")) {
                friendlyMessage = "Erreur détectée: Hôte injoignable (timeout)";
            } else if (err.message.includes("All configured authentication methods failed")) {
                friendlyMessage = "Erreur détectée: Username / Password invalides";
            } else if (err.message.includes("ENOTFOUND")) {
                friendlyMessage = "Erreur détectée: Hôte introuvable (DNS ou IP invalide)";
            } else {
                friendlyMessage = `Erreur détectée: ${err.message}`;
            }
            this.logger.error(friendlyMessage);
            conn.end();
            reject(new Error(friendlyMessage));
            });

            // Configuration de connexion
            const connectionConfig = {
            host: credentials.host.trim(),
            port: credentials.port,
            username: credentials.username.trim(),
            password: credentials.password.trim(),
            readyTimeout: 1000 * 10,
            tryKeyboard: true,
            };

            conn.connect(connectionConfig);
        });
    }

    async discover(credentials: Omit<SshCredentials, 'port' | 'password' | 'siteSShVersion'>): Promise<SshCredentials | null> {
        const arrayPassword = [
            { port: 22, password: 'anltlm2bsc7-GLX@', shell: 'usual-shell' },
            { port: 22, password: 'anltlm2bsc7-GLX@', shell: 'ose-shell' },
            { port: 22, password: 'rbs', shell: 'usual-shell' },
            { port: 22, password: 'rbs', shell: 'ose-shell' },
            { port: 22, password: 'Ericssonrbs1@', shell: 'usual-shell' },
            { port: 22, password: 'Ericssonrbs1@', shell: 'ose-shell' },
            { port: 2023, password: 'anltlm2bsc7-GLX@', shell: 'usual-shell' },
            { port: 2023, password: 'anltlm2bsc7-GLX@', shell: 'ose-shell' },
            { port: 2023, password: 'rbs', shell: 'usual-shell' },
            { port: 2023, password: 'rbs', shell: 'ose-shell' },
            { port: 2023, password: 'Ericssonrbs1@', shell: 'usual-shell' },
            { port: 2023, password: 'Ericssonrbs1@', shell: 'ose-shell' },
        ];

        const attempts = arrayPassword.map((attempt) => {
            const candidate: SshCredentials = {
                ...credentials,
                port: attempt.port,
                password: attempt.password,
                siteSShVersion: attempt.shell,
            };

            return this.testConnection(candidate)
                .then(() => {
                    this.logger.log(`[Credentials valides trouvés]: ${JSON.stringify(candidate)}`);
                    return candidate;
                })
                .catch((err) => {
                    this.logger.debug(
                        `[Tentative échouée ${candidate.username}@${candidate.host}]:${candidate.port} [${candidate.siteSShVersion}] → ${err.message}`,
                    );
                    throw err;
                });
        });

        try {
            return await Promise.any(attempts);
        } catch (aggregateError) {
            this.logger.warn(`Aucun credentials valides trouvés pour ${credentials.username}@${credentials.host}`);
            return null;
        }
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