import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeOrderRepository } from '../server/orders/runtime-order-repository.js';
import { InMemoryOrderRepository } from '../server/orders/order-repository.js';
import { PostgresOrderRepository } from '../server/orders/postgres-order-repository.js';

test('development starts in non-persistent preview mode without DATABASE_URL', () => {
  const result = createRuntimeOrderRepository({ nodeEnvironment: 'development' });
  assert.equal(result.persistent, false);
  assert.ok(result.repository instanceof InMemoryOrderRepository);
});

test('production refuses to start without DATABASE_URL', () => {
  assert.throws(() => createRuntimeOrderRepository({ nodeEnvironment: 'production' }), /DATABASE_URL is required in production/);
});

test('configured stores keep the PostgreSQL repository', async () => {
  const result = createRuntimeOrderRepository({ databaseUrl: 'postgresql://user:password@127.0.0.1:5432/store_test' });
  assert.equal(result.persistent, true);
  assert.ok(result.repository instanceof PostgresOrderRepository);
  await result.repository.close();
});
