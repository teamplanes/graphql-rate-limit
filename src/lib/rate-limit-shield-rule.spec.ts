import test from 'ava';
import { createRateLimitRule } from './rate-limit-shield-rule';

test('createRateLimitRule', (t) => {
  const rule = createRateLimitRule({
    identifyContext: (ctx) => ctx.id,
  });
  t.true(typeof rule === 'function');
  const fieldRule = rule({ max: 1, window: '1s' });
  t.true((fieldRule as any).cache === 'no_cache');
});
