import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root health/greeting endpoint' })
  @ApiResponse({ status: 200, description: 'Service is running.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
