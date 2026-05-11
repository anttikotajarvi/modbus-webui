import { createEmptyProfile } from '@/sys/library/defaults'
import {
  SCRATCH_ID,
  type LibraryData,
  type ProfileData,
  type ProfileTag,
} from '@/sys/library/types'
import type { WriteQuery } from '@/sys/modbus'
import { deleteProfile, setActiveProfile, setProfile, setShortcut } from '@/sys/state'
import { useAlert } from '@/ui/alert/context'
import type { SvimmerWriter } from 'svimmer-store'
import { begin, setKey } from 'svimmer-store/helpers/transactors'

const alert = useAlert()

export function performDeleteProfile(lib: SvimmerWriter<LibraryData>, id: ProfileTag | null) {
  if (id === SCRATCH_ID || id === null) return
  lib.transact(
    begin(deleteProfile(id), (draft) => {
      if (draft.activeProfileTag === id) {
        draft.activeProfileTag = null
      }
    }),
  )
  alert.info(`Profile "${id}" deleted successfully.`)
}

export function performAddShortcut(
  shortcutsRef: SvimmerWriter<ProfileData["writeShortcuts"]>,
  name: string,
  query: WriteQuery,
) {
  shortcutsRef.transact(setKey(name, query))
  alert.success(`Added shortcut "${name}".`)
}

export function performCreateProfile(
  lib: SvimmerWriter<LibraryData>,
  tag: ProfileTag,
  initialData?: ProfileData,
) {
  const data = initialData ? structuredClone(initialData) : createEmptyProfile()
  lib.transact(begin(setProfile(tag, data), setActiveProfile(tag)))

  alert.success(`Created profile "${tag}"`)
}

