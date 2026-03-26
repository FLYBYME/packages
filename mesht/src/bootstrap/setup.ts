// FILE: src/bootstrap/setup.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';
import { migrateLegacyData } from './migrateData';
import { seedCatalog } from './seedCatalog';
import { seedConstitution } from './seedConstitution';
import { seedTools } from './seedTools';
import { seedPersonas } from './seedPersonas';
import { seedProtocols } from './seedProtocols';

/**
 * Orchestrates the full bootstrap sequence for MeshT Phase 2.
 */
export async function runFullBootstrap(broker: IServiceBroker): Promise<void> {
  const logger = broker.logger;
  
  logger.info('[Bootstrap] Starting genesis seeding...');

  // 0. Data Migration (Uniform ID)
  await migrateLegacyData(broker);
  
  await seedCatalog(broker);
  logger.info('[Bootstrap] ✓ LLM Catalog seeded.');
  
  await seedConstitution(broker);
  logger.info('[Bootstrap] ✓ Constitution rules seeded.');
  
  await seedTools(broker);
  logger.info('[Bootstrap] ✓ System tools registered.');
  
  await seedPersonas(broker);
  logger.info('[Bootstrap] ✓ Persona matrix initialized.');
  
  await seedProtocols(broker);
  logger.info('[Bootstrap] ✓ FSM Protocols registered.');
  
  logger.info('[Bootstrap] Genesis seeding complete. Node is ready for autonomous operations.');
}
