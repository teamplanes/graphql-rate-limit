import test from 'ava';
import { RateLimitError } from './rate-limit-error';

test('RateLimitError is an Error', t => {
  t.true(new RateLimitError('Some message') instanceof Error);
});

test('RateLimitError.isRateLimitError is true', t => {
  t.true(new RateLimitError('Some message').isRateLimitError);
});
