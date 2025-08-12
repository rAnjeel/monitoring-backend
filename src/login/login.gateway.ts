/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CredentialsService } from '../credentials/credentials.service';
import { CredentialDTO } from '../credentials/credentialsDTO';

@WebSocketGateway({
  cors: { origin: '*' }, // Autorise toutes les origines
})
export class LoginGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly credentialService: CredentialsService) {}

  @WebSocketServer()
  server: Server;

  /**
   * Log à la connexion
   */
  handleConnection(client: Socket) {
    const ip = this.getClientIp(client);
    console.log(`🔌 [Socket Connected] Client connecté depuis ${ip}`);
  }

  /**
   * Log à la déconnexion
   */
  handleDisconnect(client: Socket) {
    const ip = this.getClientIp(client);
    console.log(`❌ [Socket Disconnected] Client déconnecté depuis ${ip}`);
  }

  /**
   * Réception d'une tentative de login depuis un client Socket.IO
   */
  @SubscribeMessage('login_attempt')
  async handleLogin(
    @MessageBody() dto: CredentialDTO,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const ip = this.getClientIp(client);

    console.log(`📩 [Login Attempt] IP: ${ip} Username: ${dto.siteUsername}`);

    // Vérification des credentials
    const verification = await this.credentialService.verifySiteCredentials(
      dto.Ip,
      dto.siteUsername,
      dto.sitePassword,
      dto.sitePort,
    );

    const result = {
      userIp: ip,
      siteIp: dto.Ip,
      status: verification.match ? 'success' : 'failed',
      siteUsername: dto.siteUsername,
      details: {
        usernameMatch: verification.details.usernameMatch,
        passwordMatch: verification.details.passwordMatch,
        portMatch: verification.details.portMatch,
      },
      error: verification.error || undefined,
    };

    // Envoie le résultat seulement au client qui a tenté
    client.emit('login_result', result);

    // Broadcast aux autres pour monitoring
    client.broadcast.emit('login_attempt_log', result);
  }

  /**
   * Récupère l'IP du client Socket.IO
   */
  private getClientIp(client: Socket): string {
    const xForwardedFor = client.handshake.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return client.handshake.address;
  }
}
