import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { parseGatewayEnv } from '@reelgrabber/config';
import { getMetricsText } from '@reelgrabber/monitoring';

@Controller()
export class MetricsController {
  @Get('metrics')
  @SkipThrottle()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    const env = parseGatewayEnv();
    if (!env.METRICS_ENABLED) {
      throw new NotFoundException();
    }

    const text = await getMetricsText();
    return text || '# metrics disabled\n';
  }
}
