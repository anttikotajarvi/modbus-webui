import { SCRATCH_ID, type LibraryData } from "./types"

export function getActiveProfileData(lib: LibraryData) {
  const tag = lib.activeProfileTag
  return tag ? lib.profiles[tag] : lib.profiles[SCRATCH_ID]
}
