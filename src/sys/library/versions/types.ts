import type { Migration, Versioned } from '@/sys/generic/versioning'
import type { Result } from '@/types/generic'
import type { JSONValue } from 'node_modules/superjson/dist/types'

export type VersionedParser<T, V extends number> = (
  blob: JSONValue
) => Result<Versioned<V, T>>

export type LibSerializer<T> = (value:T) => Result<JSONValue>
export type StorageVersionDefinition<
  V extends number,
  T,
  Next extends Versioned<number, unknown> | null,
> =
  Next extends Versioned<infer NextV, infer NextT>
    ? {
        version: V,
        parse: VersionedParser<T, V>,
        serialize: LibSerializer<T>,
        migration: Migration<V, T, NextV, NextT>
      }
    : {
        version: V,
        parse: VersionedParser<T, V>,
        serialize: LibSerializer<T>,
        migration?: undefined
      }
export type AnyStorageVersionDef =
  StorageVersionDefinition<number, unknown, Versioned<number, unknown> | null>
