import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Utils') // 📌 Regroupe dans Swagger sous l’onglet "Utils"
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Vérifie la santé du service' })
  @ApiResponse({ status: 200, description: 'Le service est en ligne.' })
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend',
    };
  }
}
