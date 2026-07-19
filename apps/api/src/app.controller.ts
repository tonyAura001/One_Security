import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './auth/decorators';
import { AppService } from './app.service';

@ApiTags('Système')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Vérification de disponibilité' })
  health() {
    return this.appService.health();
  }
}
