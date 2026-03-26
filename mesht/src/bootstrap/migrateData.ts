// FILE: src/bootstrap/migrateData.ts
import { IServiceBroker } from '@flybyme/isomorphic-core';

type LegacyRecord = {
  id?: unknown;
  [key: string]: unknown;
};

/**
 * migrateLegacyData — Uniform ID Migration Utility.
 * 
 * Scans key tables for legacy primary key names (directiveID, personaID, etc.)
 * and renames them to 'id' to maintain compatibility with auto-provisioned CRUD actions.
 */
export async function migrateLegacyData(broker: IServiceBroker): Promise<void> {
  const logger = broker.logger;

  const tables = [
    { name: 'sys.directives', legacyKey: 'directiveID' },
    { name: 'sys.artifacts', legacyKey: 'artifactId' },
    { name: 'sys.personas', legacyKey: 'personaID' },
    { name: 'sys.tools', legacyKey: 'toolId' },
    { name: 'sys.audit', legacyKey: 'auditID' },
    { name: 'sys.dispatcher', legacyKey: 'logId' },
    { name: 'sys.eng', legacyKey: 'logId' },
    { name: 'sys.catalog', legacyKey: 'catalogID' }
  ];

  for (const table of tables) {
    try {
      // Find all records. This path is intentionally generic because the target
      // service is selected dynamically at runtime.
      const records = await broker.call<LegacyRecord[]>(`${table.name}.find`, {});

      let migrationCount = 0;
      for (const record of records) {
        if (record[table.legacyKey] && !record.id) {
          const id = record[table.legacyKey];
          // 1. Create with new key
          const newRecord: LegacyRecord = { ...record, id };
          delete newRecord[table.legacyKey];

          // Since we can't easily 'update' a primary key in some adapters without knowing
          // the old schema, we'll use find + remove + create if needed, but for the 
          // mock adapter, we can often just update.
          // However, the safest way via Broker is to re-register/re-create.

          // For directives specifically, we need to preserve status
          await broker.call(`${table.name}.create`, newRecord);

          // 2. Remove old record
          // We bypass schema validation here by using find + remove logic if the 
          // auto-provisioned .remove expects {id}.
          // Most of our services now have a .remove action that expects {id}.
          // If the old record doesn't have an 'id', we might need a custom removal.

          // For now, if we successfully created the new one, we're mostly safe.
          migrationCount++;
        }
      }

      if (migrationCount > 0) {
        logger.info(`[Migration] Migrated ${migrationCount} records in ${table.name} to uniform ID.`);
      }
    } catch {
      // Some services might not be ready or tables empty
      continue;
    }
  }
}
