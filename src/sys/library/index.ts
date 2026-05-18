import { ok, resErr, type Result } from '@/types/generic'
import { type Persistence } from '../generic/persistence'
import { getVersion, isVersionKey, migrateToLatest } from './versions'
import { STORAGE_VERSION, type CurrentLibrary, type CurrentVersion } from './versions/current'
import { type Versioned } from '../generic/versioning'
import type { JSONValue } from 'node_modules/superjson/dist/types'

export const STORAGE_KEY = 'modbus-webui:local-library'

export function loadLibrary(P: Persistence): Result<null | CurrentVersion> {
  // Try fetching with default storage key
  const { val, err } = P.fetchLibrary(STORAGE_KEY)
  if (err) {
    return resErr(new Error('Corrupted current library', { cause: err }))
  }

  // Got library blob
  if (val !== null) {
    return normalizeLibrary(val)
  }

  // No library under default key -> try legacy key
  const legacy = P.fetchLegacyLibrary()
  if (legacy.err) {
    return resErr(new Error('Corrupted legacy library', { cause: legacy.err }))
  }

  // No legacy library either
  if (legacy.val === null) {
    return ok(null)
  }

  // handle (parse, validate, migrate) legacy blob
  return normalizeLibrary(legacy.val)
}

export function normalizeLibrary(value: Versioned<number, JSONValue>) {
  const { version, data: libSerialized } = value
  // Validate version num
  if (!isVersionKey(version)) {
    return resErr(new Error(`Bad envelope: bad version (${version})`))
  }

  // Get version definition
  const versionDef = getVersion(version)
  if (!versionDef) {
    return resErr(new Error(`Bad envelope: bad version (${version})`))
  }

  // Parse/validate with own parser
  const { val: parseVal, err: parseErr } = versionDef.parse(libSerialized)
  if (parseErr) {
    return resErr(parseErr)
  }

  // Ensure latest
  const current = migrateToLatest(parseVal)
  return ok(current)
}

export const serializeLibrary = (
  lib: CurrentLibrary,
): Result<Versioned<typeof STORAGE_VERSION, JSONValue>> => {
  const { serialize } = getVersion(STORAGE_VERSION)
  const { val, err } = serialize(lib as any)
  if (err) return resErr(err)
  return ok({
    version: STORAGE_VERSION,
    data: val,
  })
}
export const saveLibrary =
  (P: Persistence) =>
  (lib: CurrentLibrary): Result<true> => {
    const { val, err } = serializeLibrary(lib)
    if (err) return resErr(err)
    P.writeLibrary(STORAGE_KEY, {
      version: STORAGE_VERSION,
      data: val,
    })
    return ok(true)
  }
