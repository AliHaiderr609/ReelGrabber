import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Module({
  controllers: [MetricsController],
  providers: [HttpMetricsInterceptor],
  exports: [HttpMetricsInterceptor],
})
export class MetricsModule {}
