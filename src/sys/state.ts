import {
  Nametable,
  SCRATCH_ID,
  type LibraryData,
  type NametableTag,
  type ProfileData,
  type ProfileTag,
} from './library/types'
import { createSvimmerStore, type Transactor } from 'svimmer-store'
import { nametableCategoryFromFunctionType, type WriteQuery } from './modbus'
import { transactor } from 'svimmer-store/helpers/transactors'
import { accessor } from 'svimmer-store/helpers/accessors'
import type { Draft } from 'immer'
import { locatorFor } from 'svimmer-store/locator'

export function createLibraryStore(initialData: LibraryData) {
  const store = createSvimmerStore<LibraryData>(initialData)
  return store
}

// -------------------------------------------------------------
// Lib transactors
// -------------------------------------------------------------
export const setActiveProfile = (id: ProfileTag) =>
  transactor((draft: LibraryData) => {
    draft.activeProfileTag = id
  })
export const setProfile = (id: ProfileTag, data: ProfileData) =>
  transactor((draft: LibraryData) => {
    draft.profiles[id] = data
  })

export const deleteProfile = (id: ProfileTag) =>
  transactor((draft: LibraryData) => {
    if (draft.profiles[id] === undefined) return false

    delete draft.profiles[id]
    return true
  })
// -------------------------------------------------------------
// Accesssors
// -------------------------------------------------------------
export const profileKeys = accessor<LibraryData['profiles'], ProfileTag[]>(
  (x) => Object.keys(x) as ProfileTag[],
)
export const nametableKeys = accessor<LibraryData['nametables'], NametableTag[]>(
  (x) => Object.keys(x) as NametableTag[],
)

export const resolveAddressName = (query: WriteQuery) => accessor<Nametable | undefined, string | null>((nt) => {
  if(!nt) return null;
  const category = nametableCategoryFromFunctionType[query.type]
  const name = nt[category].get(query.address)
  return name ?? null
})

// -------------------------------------------------------------
// Profile transactors
// -------------------------------------------------------------
export const setKey =
  <T extends object, K extends keyof Draft<T>>(key: K, value: Draft<T>[K]): Transactor<T, void> =>
  (draft) => {
    draft[key] = value
  }

export const deleteKey =
  <T extends object, K extends keyof Draft<T>>(key: K): Transactor<T, boolean> =>
  (draft) => {
    if (!(key in draft)) return false
    delete draft[key]
    return true
  }

// -------------------------------------------------------------
// Locators
// -------------------------------------------------------------
const createLibLocator = locatorFor<LibraryData>()
export const activeProfileLoc = createLibLocator(
  [(x) => x.activeProfileTag],
  (activeProfileTag) => {
    const id = activeProfileTag.value() ?? SCRATCH_ID

    return (lib) => lib.profiles[id]
  },
)
export const activeNametableLoc = createLibLocator([activeProfileLoc], (activeProfileRef) => {
  const id = activeProfileRef.read((x) => x.activeNametable)
  if (id === null) return null
  return (lib) => lib.nametables[id]
})
