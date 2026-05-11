// This layer can be used to integrate storage buckets or something in the future

import { resErr, ok, type Result } from '@/types/generic'
import { versionedSchema, type Versioned } from './versioning'
import type { JSONValue } from 'node_modules/superjson/dist/types'
import { safeJSONParse } from './helpers'
import type { VersionKey } from '../library/versions'

export interface Persistence {
  fetchLibrary: (key: string) => Result<Versioned<number, JSONValue> | null>
  fetchLegacyLibrary: () => Result<Versioned<1, JSONValue> | null>,
  writeLibrary: (key: string, data: Versioned<VersionKey, JSONValue>) => void
}
export const LEGACY_KEY = 'modbus:library:v1'

export function parseEnvelope(value: unknown): Result<Versioned<number, JSONValue>> {
  const { val, err } = safeJSONParse(value)
  if (err) return resErr(err)

  const { success, data, error } = versionedSchema.safeParse(val)
  if (!success) return resErr(error)

  return ok(data)
}
export function createPersistence(storage: Storage): Persistence {
  return {
    fetchLibrary(key) {
      const raw = storage.getItem(key)
      if (raw === null) return ok(null)
      return parseEnvelope(raw)
    },

    fetchLegacyLibrary() {
      const raw = storage.getItem(LEGACY_KEY)
      if (raw === null) return ok(null)

      const { val, err } = safeJSONParse(raw)
      if (err) return resErr(err)

      return ok({
        version: 1,
        data: val,
      })
    },
    writeLibrary(key, data) {
      return storage.setItem(key, JSON.stringify(data))
    }
  }
}