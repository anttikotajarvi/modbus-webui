// tests/load-library.test.ts
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPersistence, LEGACY_KEY } from '../src/sys/generic/persistence'
import { loadLibrary, STORAGE_KEY } from '../src/sys/library'
import { STORAGE_VERSION } from '../src/sys/library/versions/current'
import { getVersion, versionKeys, versions } from '../src/sys/library/versions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, 'data')

function fixtureNameForVersion(version: number): string {
  return `v${version}-library.json`
}

const V1_STORAGE_FILE = fixtureNameForVersion(1)
const CURRENT_STORAGE_FILE = fixtureNameForVersion(STORAGE_VERSION)

function readFixture(name: string): string {
  return readFileSync(resolve(dataDir, name), 'utf8')
}

function serializedPayloadForVersion(version: number, data: unknown): unknown {
  if (version === 2 && data && typeof data === 'object' && 'data' in data) {
    return data.data
  }

  return data
}

function makeStorage(entries: Record<string, string | null>) {
  const getItem = vi.fn((key: string): string | null => {
    return key in entries ? entries[key] : null
  })

  const storage: Storage = {
    getItem,
    clear: () => void null,
    key: () => null,
    removeItem: (_key) => void null,
    setItem: (_key, _value) => void null,
    length: Object.entries(entries).length,
  }

  return { storage, getItem }
}

describe('loadLibrary', () => {
  it('returns ok(null) when neither current nor legacy library exists', () => {
    const { storage } = makeStorage({})
    const persistence = createPersistence(storage)

    const result = loadLibrary(persistence)

    expect(result.err).toBeNull()
    expect(result.val).toBeNull()
  })

  it('loads current library from the main storage key', () => {
    const currentRaw = readFixture(CURRENT_STORAGE_FILE)

    const { storage } = makeStorage({
      [STORAGE_KEY]: currentRaw,
    })
    const persistence = createPersistence(storage)

    const result = loadLibrary(persistence)

    expect(result.err).toBeNull()
    expect(result.val).not.toBeNull()
  })
  /**
   * This tests that the following things work:
   * - Load library logic
   * - v1-to-current migrators work
   * - v1 and current parsers work
   * This does not yet test if every parser in between works;
   *   this should be added when implementing v3.
   */
  it('loads legacy v1 when current key is missing and migrates it to latest', () => {
    const v1Raw = readFixture(V1_STORAGE_FILE)
    const currentRaw = readFixture(CURRENT_STORAGE_FILE)

    const legacyStorage = makeStorage({
      [LEGACY_KEY]: v1Raw,
    })
    const currentStorage = makeStorage({
      [STORAGE_KEY]: currentRaw,
    })

    const legacyPersistence = createPersistence(legacyStorage.storage)
    const currentPersistence = createPersistence(currentStorage.storage)

    const migrated = loadLibrary(legacyPersistence)
    const current = loadLibrary(currentPersistence)

    expect(migrated.err).toBeNull()
    expect(current.err).toBeNull()

    expect(migrated.val).not.toBeNull()
    expect(current.val).not.toBeNull()

    expect(migrated.val).toEqual(current.val)
  })

  it('does not fall back to legacy when the current library is corrupted', () => {
    const { storage, getItem } = makeStorage({
      [STORAGE_KEY]: '{ this is bad json',
      [LEGACY_KEY]: readFixture(V1_STORAGE_FILE),
    })
    const persistence = createPersistence(storage)

    const result = loadLibrary(persistence)

    expect(result.err).not.toBeNull()
    expect(result.val).toBeNull()

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(getItem).not.toHaveBeenCalledWith(LEGACY_KEY)
  })

  it('returns an error when current is missing but legacy is corrupted', () => {
    const { storage, getItem } = makeStorage({
      [LEGACY_KEY]: '{ this is bad json',
    })
    const persistence = createPersistence(storage)

    const result = loadLibrary(persistence)

    expect(result.err).not.toBeNull()
    expect(result.val).toBeNull()

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(getItem).toHaveBeenCalledWith(LEGACY_KEY)
  })

  it('returns an error when current envelope version is unsupported', () => {
    const { storage } = makeStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 999,
        data: {},
      }),
    })
    const persistence = createPersistence(storage)

    const result = loadLibrary(persistence)

    expect(result.err).not.toBeNull()
    expect(result.val).toBeNull()
  })
})

describe('storage version parser/serializer coherence', () => {
  const orderedVersions = [...versionKeys].sort((a, b) => a - b)

  for (const version of orderedVersions) {
    it(`roundtrips v${version}`, () => {
      const raw = readFixture(fixtureNameForVersion(version))

      const { storage } = makeStorage(
        version === 1 ? { [LEGACY_KEY]: raw } : { [STORAGE_KEY]: raw },
      )

      const P = createPersistence(storage)

      const fetched = version === 1 ? P.fetchLegacyLibrary() : P.fetchLibrary(STORAGE_KEY)

      expect(fetched.err).toBeNull()
      expect(fetched.val).not.toBeNull()

      if (fetched.err || fetched.val === null) return

      expect(fetched.val.version).toBe(version)

      const def = getVersion(version)
      expect(def).toBeTruthy()
      if (!def) return

      const { val: parsed, err: parseErr } = def.parse(fetched.val.data)
      expect(parseErr).toBeNull()
      expect(parsed).not.toBeNull()
      if (parseErr || !parsed) return

      const { val: serialized, err: serializeErr } = def.serialize(parsed.data as never)
      expect(serializeErr).toBeNull()
      if (serializeErr) return

      const expectedSerialized = serializedPayloadForVersion(version, fetched.val.data)
      expect(serialized).toEqual(expectedSerialized)

      const reparseBlob = version === 2 ? { data: serialized } : serialized
      const reparsed = def.parse(reparseBlob as never)
      expect(reparsed.err).toBeNull()
      expect(reparsed.val).toEqual(parsed)
    })
  }
})
