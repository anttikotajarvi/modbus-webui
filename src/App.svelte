<script lang="ts">
  /* eslint-disable @typescript-eslint/no-unused-vars */
  import './app.css'
  import ConnectForm from '@/ui/ConnectForm.svelte'
  import { ModbusRTU } from 'modbus-webserial'
  import type { ConnectStatus } from '@/types/comp'
  import ReadPanel from '@/ui/panels/ReadPanel.svelte'
  import type { ReadResponse, ReadQuery, WriteQuery, WriteResponse } from '@/sys/modbus'
  import { onMount, setContext } from 'svelte'
  import WritePanel from '@/ui/panels/WritePanel.svelte'
  import TopMenu from '@/ui/TopMenu.svelte'

  // ------------------------
  // Modbus client setup
  // ------------------------
  const client = makeRef<ModbusRTU | null>(null)
  const conn: ConnectStatus = $state<ConnectStatus>({
    status: 'idle',
    msg: '',
    error: false,
  })

  import { debounce } from '@/sys/generic/helpers'

  let modals = $state<Modals>(modalsInitial)

  // -------------------------
  // Profile management
  // -------------------------
  const P = createPersistence(localStorage)

  /* Library */
  const lib = createLibraryStore(
    (() => {
      const { val, err } = loadLibrary(P)
      if (!val) {
        console.error(err)
        return createEmptyLibrary()
      }
      return val.data as LibraryData
    })(),
  )
  let libStatus = $state<LibraryStatus>({
    dirty: false,
    lastSavedAt: null,
  })
  {
    let _ignoreDirty = true
    // Autosaving
    lib.subscribe(() => {
      if (_ignoreDirty) return

      libStatus.dirty = true
      autosaveDebounced()
    })

    // ignore the first reactive pass (initial load)
    queueMicrotask(() =>
      requestAnimationFrame(() => {
        _ignoreDirty = false
      }),
    )

    // Autosave - debounced
    const AUTOSAVE_DELAY = 1000
    const autosaveDebounced = debounce(persistLibrary, AUTOSAVE_DELAY)
  }

  onMount(() => {
    // Autosave on unload or visibility change
    const flush = () => {
      if (!libStatus.dirty) return
      const { err } = persistLibrary()
      if (err) console.error('Autosave failed:', err)
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush as any)
    }
  })

  /* Derived references */
  const activeProfileTagRef = lib.focus((x) => x.activeProfileTag)

  const profileRef = lib.follow(activeProfileLoc)
  const activeNametableTagRef = profileRef.focus(key('activeNametable'))

  const nametableRef = lib.follow(activeNametableLoc)

  const shortcutsRef = profileRef.focus(key('writeShortcuts'))

  const connectionSettingsRef = profileRef.focus(key('connectionSettings'))

  /* Domain Operation */
  function createProfile(id: ProfileTag, template: 'default' | 'current') {
    const data = template === 'current' ? structuredClone(profileRef.value()) : createEmptyProfile()

    lib.transact(begin(setProfile(id, data), setActiveProfile(id)))
  }

  // save impl used by both manual + autosave
  function persistLibrary(): Result<true> {
    const { err } = saveLibrary(P)($lib.value())
    if (err) {
      console.warn('Failed to save library.')
      return resErr(err)
    }
    libStatus = {
      dirty: false,
      lastSavedAt: Date.now(),
    }
    return ok(true)
  }
  /* UI procedure */
  const persistenceActions: PersistenceActions = (() => {
    const setLibrary = (data: LibraryData) => {
      lib.set(data)
      persistLibrary()
      alert.success('Library imported successfully.')
    }
    return {
      saveLibrary: () => {
        if (persistLibrary().val) alert.success('Library saved to localStorage.')
      },
      exportLibrary: () => {
        const data = JSON.stringify(serializeLibrary(lib.value()))
        exportFile(exportFilename, new Blob([data], { type: 'application/json' }))
        alert.success('Library exported successfully.')
      },
      setLibrary,

      importLibrary: (str: string) => {
        try {
          console.log('Importing library JSON:', str)
          const { val: parsed, err } = parseEnvelope(str)
          if (err) throw err

          const { val: norm, err: err2 } = normalizeLibrary(parsed)
          if (err2) throw err2

          setLibrary(norm.data)
        } catch (err) {
          console.error('Import failed:', err)
          const msg = err instanceof Error ? err.message : String(err)
          alert.error(`Import failed: ${msg}`)
        }
      },
    }
  })()

  const clientProcedures = createModbusClientProcedures({ clientRef: client })

  /* Prime console commands */
  primeConsoleCommands(persistenceActions, lib, persistLibrary)

  /* Handlers */
  function handleOnConnect() {
    performConnect(client, conn, connectionSettingsRef)
  }
  function handleOnDisconnect() {
    performDisconnect(client, conn)
  }

  import {
    activeProfileLoc,
    createLibraryStore,
    activeNametableLoc,
    setActiveProfile,
    setProfile,
  } from './sys/state'
  import { useAlert } from '@/ui/alert/context'
  import QuickWritePanel from '@/ui/panels/QuickWritePanel.svelte'
  import ManageStorageModal from './ui/modals/ManageStorageModal.svelte'
  import CreateProfileModal from '@/ui/modals/CreateProfileModal.svelte'
  import NametableSetModal from '@/ui/modals/NametableModal.svelte'
  import SystemAlert from '@/ui/alert/SystemAlert.svelte'
  import { loadLibrary, normalizeLibrary, saveLibrary, serializeLibrary } from './sys/library'
  import { createEmptyLibrary, createEmptyProfile } from './sys/library/defaults'
  import { createPersistence, parseEnvelope } from './sys/generic/persistence'
  import { SCRATCH_ID, type LibraryData, type ProfileTag } from './sys/library/types'
  import { STORAGE_VERSION } from './sys/library/versions/current'
  import { resErr, ok, type Result } from './types/generic'

  import type { LibraryStatus } from './sys/types'
  import { modalsInitial, type Modals } from './ui/modals'
  import { begin, setKey } from 'svimmer-store/helpers/transactors'
  import { key } from 'svimmer-store/helpers/selectors'
  import { performConnect, performDisconnect } from './actions/connection'
  import type { PersistenceActions } from './actions/persistence'
  import { makeRef } from './util/ref'
  import { createModbusClientProcedures } from './sys/modbus/gateway'
  import NametableModal from '@/ui/modals/NametableModal.svelte'
  import { exportFile } from './util/dom'
  import { exportFilename } from './sys/storage'
  import { primeConsoleCommands } from './actions/console-commands'

  const alert = useAlert()
</script>

<div class="flex min-h-dvh flex-col">
  <SystemAlert />
  <CreateProfileModal bind:open={modals.addProfileOpen} {lib} />

  <TopMenu {lib} bind:modals {persistenceActions} {libStatus} />

  <ConnectForm
    settingsRef={connectionSettingsRef}
    status={conn}
    onsubmit={handleOnConnect}
    ondisconnect={handleOnDisconnect}
  />
  <!-- App shell: make page fill the viewport -->
  <!-- App.svelte layout snippet -->
  <main class="flex-1 p-4 min-w-0">
    <!-- Stack by default; only split into C1 (reads) + C2 (writes) when there's room for both -->
    <div class="grid gap-6 min-w-0 min-[1480px]:grid-cols-[minmax(0,1fr)_clamp(700px,28vw,900px)]">
      <!-- C1: READS (NO min-width here!) -->
      <section class="reads min-w-0">
        <div class="reads-grid">
          <div class="col">
            <div class="wrap grid gap-4 w-full max-w-[900px] mx-auto">
              <ReadPanel
                id="rp-hr"
                description="FC03"
                type="read_holding_registers"
                namesRef={nametableRef.focus(key('hregs'))}
                readFromClient={clientProcedures.readFromClient}
              />
              <ReadPanel
                id="rp-ir"
                description="FC04"
                type="read_input_registers"
                namesRef={nametableRef.focus(key('iregs'))}
                readFromClient={clientProcedures.readFromClient}
              />
            </div>
          </div>

          <div class="col">
            <div class="wrap grid gap-4 w-full max-w-[900px] mx-auto">
              <ReadPanel
                id="rp-c"
                description="FC01"
                type="read_coils"
                namesRef={nametableRef.focus(key('coils'))}
                readFromClient={clientProcedures.readFromClient}
              />
              <ReadPanel
                id="rp-di"
                description="FC02"
                type="read_discrete_inputs"
                namesRef={nametableRef.focus(key('dinputs'))}
                readFromClient={clientProcedures.readFromClient}
              />
            </div>
          </div>
        </div>
      </section>

      <!-- C2: WRITES (right rail only when the parent hits 1480px; stacked otherwise) -->
      <aside class="min-w-0 w-full space-y-4 self-start min-[1480px]:sticky min-[1480px]:top-4">
        <div class="mx-auto w-full max-w-[900px] grid gap-4">
          <QuickWritePanel
            {profileRef}
            nametable={nametableRef}
            writeToClient={clientProcedures.writeToClient}
          />
          <WritePanel
            id="wp-hr"
            description="FC06 / FC16"
            type="write_registers"
            writeToClient={clientProcedures.writeToClient}
            namesRef={nametableRef.focus(key('hregs'))}
            settingsRef={connectionSettingsRef}
            {shortcutsRef}
          />
          <WritePanel
            id="wp-c"
            description="FC05 / FC15"
            type="write_coils"
            writeToClient={clientProcedures.writeToClient}
            namesRef={nametableRef.focus(key('coils'))}
            settingsRef={connectionSettingsRef}
            {shortcutsRef}
          />
        </div>
      </aside>
    </div>
  </main>

  <!-- Modal to edit name tables -->
  <NametableModal
    bind:open={modals.nametableOpen}
    activeTagRef={activeNametableTagRef}
    nametablesRef={lib.focus(key('nametables'))}
  />
  <!-- Modal to manage storage (import/export) -->
  <ManageStorageModal
    bind:open={modals.manageStorageOpen}
    libRef={lib}
    onExport={persistenceActions.exportLibrary}
    onImport={persistenceActions.setLibrary}
  />
</div>

<style>
  /* Make the READS area respond to its own width */
  .reads {
    container-type: inline-size;
  }

  /* Base: single centered column */
  .reads-grid {
    --gap: 1rem;
    display: grid;
    gap: var(--gap);
    justify-content: center;
    grid-template-columns: 1fr;
  }

  .col {
    min-width: 0;
  }

  /* Each read column uses up to 900px and centers itself */
  .wrap {
    width: 100%;
    max-width: 900px;
    margin-inline: auto;
  }

  /* When the READS container itself can fit 2×700px + gap, go 2-up.
     1420 = 700 + 700 + ~20px gap (adjust if your gap is different). */
  @container (min-width: 1420px) {
    .reads-grid {
      grid-template-columns: repeat(2, minmax(700px, 900px));
    }
  }
</style>
