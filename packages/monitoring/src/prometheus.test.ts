import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import {
  getMetricsText,
  initPrometheusMetrics,
  recordExtractJob,
  recordHttpRequest,
  resetPrometheusMetricsForTests,
} from './prometheus';

describe('prometheus metrics', () => {
  afterEach(() => {
    resetPrometheusMetricsForTests();
  });

  it('initializes default and custom metrics', async () => {
    initPrometheusMetrics('test-service');
    recordHttpRequest('POST', '/v1/extract', 202, 0.05);
    recordExtractJob('instagram', 'completed', 1.2);

    const text = await getMetricsText();
    assert.match(text, /http_request_duration_seconds/);
    assert.match(text, /extract_jobs_total/);
    assert.match(text, /extract_job_duration_seconds/);
    assert.match(text, /nodejs_/);
  });
});
