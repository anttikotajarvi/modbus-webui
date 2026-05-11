import type { Versioned } from '@/sys/generic/versioning'
import type { LibraryData } from '../types'
import type { StorageVersionDefinition } from './types'
import { migrate1to2 } from './migrations/1to2'

import { V1Parser, V1Serializer, type V1Library } from './snapshots/v1'
// Purposefully included from 'snapshots' instead of current
import { V2Parser, V2Serializer, type V2Library } from './snapshots/v2'
import { STORAGE_VERSION, type CurrentLibrary } from './current'
export const versions = {
  1: {
    version: 1,
    parse: V1Parser,
    serialize: V1Serializer,
    migration: migrate1to2,
  } satisfies StorageVersionDefinition<1, V1Library, Versioned<2, LibraryData>>,
  2: {
    version: 2,
    parse: V2Parser,
    serialize: V2Serializer,
  } satisfies StorageVersionDefinition<2, V2Library, null>,
} as const

/**
 * Safe getter
 */
export const getVersion = (v: number) => {
  return versions[v as keyof typeof versions]
}
export const isVersionKey = (v: number): v is VersionKey => {
  return Object.hasOwn(versions, v)
}
export type VersionKey = keyof typeof versions
export const versionKeys = Object.keys(versions).map((x) => Number(x)) as VersionKey[]

/**
 * Will throw only on bad version definition.
 */
export const migrateToLatest = (
  value: Versioned<VersionKey, unknown>,
): Versioned<typeof STORAGE_VERSION, CurrentLibrary> => {
  let current = value

  while (true) {
    const def = getVersion(current.version)
    if (!def) {
      throw new Error(`Unsupported library version: ${current.version}`)
    }

    if (def.version == STORAGE_VERSION) {
      return current as Versioned<typeof STORAGE_VERSION, CurrentLibrary>
    }

    if (!def.migration) throw new Error('Incoherent version definition')

    current = def.migration.migrate(current as never)
  }
}
