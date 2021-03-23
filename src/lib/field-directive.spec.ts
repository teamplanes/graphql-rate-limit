// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { createRateLimitDirective } from './field-directive';

test('createRateLimitDirective', t => {
  const RateLimiter = createRateLimitDirective();
  t.true(new RateLimiter({}) instanceof SchemaDirectiveVisitor);
});
