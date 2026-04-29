/**
 * Storage Migration Utility
 * Handles data versioning and migration for localStorage
 */

export interface MigrationFn {
  (data: any): any;
}

export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: MigrationFn;
}

// Registry of all available migrations
const migrations: Map<string, Migration> = new Map();

/**
 * Register a migration strategy
 * @param fromVersion Current version
 * @param toVersion Target version
 * @param migrateFn Migration function
 */
export function registerMigration(
  fromVersion: number,
  toVersion: number,
  migrateFn: MigrationFn
): void {
  const key = `${fromVersion}->${toVersion}`;
  migrations.set(key, {
    fromVersion,
    toVersion,
    migrate: migrateFn,
  });
}

/**
 * Get migration path from one version to another
 * @param fromVersion Starting version
 * @param toVersion Target version
 * @returns Array of migration functions to apply in order
 */
export function getMigrationPath(
  fromVersion: number,
  toVersion: number
): MigrationFn[] {
  if (fromVersion === toVersion) {
    return [];
  }

  const path: MigrationFn[] = [];
  let currentVersion = fromVersion;

  while (currentVersion < toVersion) {
    const key = `${currentVersion}->${currentVersion + 1}`;
    const migration = migrations.get(key);

    if (!migration) {
      console.warn(
        `No migration found from version ${currentVersion} to ${currentVersion + 1}`
      );
      break;
    }

    path.push(migration.migrate);
    currentVersion++;
  }

  return path;
}

/**
 * Apply migrations to data
 * @param data Data to migrate
 * @param fromVersion Current version of data
 * @param toVersion Target version
 * @returns Migrated data
 */
export function applyMigrations(
  data: any,
  fromVersion: number,
  toVersion: number
): any {
  if (fromVersion === toVersion) {
    return data;
  }

  const migrationFns = getMigrationPath(fromVersion, toVersion);
  let migratedData = data;

  for (const migrateFn of migrationFns) {
    try {
      migratedData = migrateFn(migratedData);
    } catch (error) {
      console.error('Migration failed:', error);
      return data; // Return original data if migration fails
    }
  }

  return migratedData;
}

/**
 * Example: Register a migration for v1 -> v2
 * Uncomment and modify as needed when upgrading data format
 */
/*
registerMigration(1, 2, (data) => {
  // Example: Add a new field to job objects
  return {
    ...data,
    newField: 'defaultValue',
  };
});
*/

/**
 * Helper to safely get migration path with validation
 */
export function getValidMigrationPath(
  fromVersion: number,
  toVersion: number
): { valid: boolean; path: MigrationFn[]; error?: string } {
  if (fromVersion > toVersion) {
    return {
      valid: false,
      path: [],
      error: 'Cannot migrate backwards (fromVersion > toVersion)',
    };
  }

  if (fromVersion === toVersion) {
    return {
      valid: true,
      path: [],
    };
  }

  const path = getMigrationPath(fromVersion, toVersion);

  // Check if we can complete the migration
  if (path.length !== toVersion - fromVersion) {
    return {
      valid: false,
      path: [],
      error: `Cannot complete migration path from v${fromVersion} to v${toVersion}`,
    };
  }

  return {
    valid: true,
    path,
  };
}
