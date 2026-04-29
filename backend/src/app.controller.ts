import { Controller, Get } from '@nestjs/common';

/**
 * Root endpoint — health check used by integration/smoke tests.
 */
@Controller()
export class AppController {
  @Get()
  root(): string {
    return 'Hello World!';
  }
}
