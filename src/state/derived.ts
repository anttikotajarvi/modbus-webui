import { type LibraryData, SCRATCH_ID } from '@/sys/library/types'
import { assumeHandle, deriveHandle, gatekeepHandle } from 'svimmer-store'
import { key } from 'svimmer-store/helpers/selectors'

const { handle: lib, prime } = assumeHandle<LibraryData>()
export { prime }

const profiles_ = lib.focus(key('profiles'))
const nametables_ = lib.focus(key('nametables'))
const activeProfileTag_ = lib.focus((x) => x.activeProfileTag)

const activeProfile_ = deriveHandle([activeProfileTag_], () => {
  const id = activeProfileTag_.value()
  return profiles_.focus(key(id === null ? SCRATCH_ID : id))
})
export const getActiveProfile = gatekeepHandle(activeProfile_, activeProfileTag_)

const activeNametableTag_ = activeProfile_.focus(key('activeNametable'))
const activeNametable_ = deriveHandle([activeNametableTag_], () => {
  const id = activeNametableTag_.value()
  if (id == null) return null
  return nametables_.focus(key(id))
})
export const getActiveNametable = gatekeepHandle(activeNametable_, activeNametableTag_)
