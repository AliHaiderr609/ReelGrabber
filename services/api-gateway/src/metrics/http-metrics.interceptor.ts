import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { parseGatewayEnv } from '@reelgrabber/config';
import { recordHttpRequest } from '@reelgrabber/monitoring';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const env = parseGatewayEnv();
    if (!env.METRICS_ENABLED) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const route = req.route?.path ?? req.path ?? 'unknown';
        const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
        recordHttpRequest(req.method, route, res.statusCode, durationSeconds);
      })
    );
  }
}
