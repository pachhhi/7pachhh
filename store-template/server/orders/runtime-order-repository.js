import { InMemoryOrderRepository } from './order-repository.js';
import { PostgresOrderRepository } from './postgres-order-repository.js';

export function createRuntimeOrderRepository({ databaseUrl, nodeEnvironment = 'development' } = {}) {
  if (databaseUrl) return { repository: PostgresOrderRepository.fromConnectionString(databaseUrl), persistent: true };
  if (nodeEnvironment === 'production') throw new Error('DATABASE_URL is required in production.');
  return { repository: new InMemoryOrderRepository(), persistent: false };
}
