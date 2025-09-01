import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EncryptionService {
  private readonly baseUrl = 'http://localhost:4000';

  constructor(private readonly http: HttpService) {}

  async encrypt(text: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post(`${this.baseUrl}/encrypt`, { text }),
    );
    return res.data.encrypted;
  }

  async decrypt(text: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post(`${this.baseUrl}/decrypt`, { text }),
    );
    return res.data.decrypted;
  }
}
