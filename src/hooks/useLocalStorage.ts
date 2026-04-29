import { useState, useEffect, useCallback } from 'react';

const STORAGE_VERSION = 1;

interface StorageData<T> {
  version: number;
  data: T;
}

interface MigrationStrategy {
  fromVersion: number;
  toVersion: number;
  migrate: (data: any) => any;
}

const migrationStrategies: MigrationStrategy[] = [
  // Example: Add migrations here for future versions
  // { fromVersion: 1, toVersion: 2, migrate: (data) => ({ ...data, newField: 'default' }) }
];

function migrate<T>(data: any, fromVersion: number, toVersion: number): T {
  let migratedData = data;
  
  for (let v = fromVersion; v < toVersion; v++) {
    const strategy = migrationStrategies.find(s => s.fromVersion === v);
    if (strategy) {
      migratedData = strategy.migrate(migratedData);
    }
  }
  
  return migratedData;
}

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

export function useLocalStorage<T>(key: string, initialValue: T, options?: { sync?: boolean }): [T, SetValue<T>] {
  const { sync = true } = options || {};
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      
      if (!item) {
        return initialValue;
      }
      
      // Try to parse as versioned data first
      const parsed = JSON.parse(item);
      
      if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
        const storageData = parsed as StorageData<T>;
        
        // Apply migrations if needed
        if (storageData.version < STORAGE_VERSION) {
          return migrate<T>(storageData.data, storageData.version, STORAGE_VERSION);
        }
        
        return storageData.data;
      }
      
      // Fallback: treat as non-versioned data
      return parsed;
    } catch (error) {
      console.warn(`Failed to read from localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: SetValue<T> = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Resolve the value if it's an updater function
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        const storageData: StorageData<T> = {
          version: STORAGE_VERSION,
          data: valueToStore,
        };
        window.localStorage.setItem(key, JSON.stringify(storageData));
        
        // Dispatch custom event for cross-tab sync
        if (sync) {
          window.dispatchEvent(
            new CustomEvent('local-storage-change', {
              detail: { key, value: valueToStore, source: 'localStorage' },
            })
          );
        }
      }
    } catch (error) {
      console.warn(`Failed to write to localStorage key "${key}":`, error);
    }
  }, [key, storedValue, sync]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (!sync) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          
          if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
            const storageData = parsed as StorageData<T>;
            
            if (storageData.version < STORAGE_VERSION) {
              setStoredValue(migrate<T>(storageData.data, storageData.version, STORAGE_VERSION));
            } else {
              setStoredValue(storageData.data);
            }
          } else {
            setStoredValue(parsed);
          }
        } catch (error) {
          console.warn(`Failed to parse storage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, sync]);

  return [storedValue, setValue];
}
