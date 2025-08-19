<script lang="ts">
  import './app.css'
  import ConnectForm from './ui/ConnectForm.svelte'
  import { ModbusRTU, type WebSerialOptions, type WriteRegisterResult } from 'modbus-webserial'
  import type { ConnectStatus } from './lib/types/comp'
  import WordTable from './lib/WordTable.svelte'
  import ReadPanel from './panels/ReadPanel.svelte'
  import type {
    ReadResponse,
    ReadFunction,
    ReadQuery,
    WriteQuery,
    WriteResponse,
  } from './sys/panels'
  import { onMount, setContext, tick } from 'svelte'
  import * as Card from '$lib/components/ui/card'
  import WritePanel from './panels/WritePanel.svelte'
  import TopMenu from './ui/TopMenu.svelte'
  import TagInput from './custom-input/TagInput.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'

  // console commands
  const consoleCommands = {
    resetStorage: () => {
      lib = createEmptyLibrary()
      saveLibrary(lib)
      alert.success('Storage reset to default state.')
    },
  }
  ;(globalThis as any).MB_APP = (globalThis as any).MB_APP || {}
  Object.assign((globalThis as any).MB_APP, consoleCommands)

  let client: ModbusRTU | null = null
  const conn: ConnectStatus = $state<ConnectStatus>({
    status: 'idle',
    msg: '',
    error: false,
  })

  const readFromClient = async (query: ReadQuery) => {
    if (!client) {
      throw new Error('Modbus client is not connected')
    }

    const methodMap = {
      read_input_registers: (c: ModbusRTU, a: number, q: number) => c.readInputRegisters(a, q),
      read_holding_registers: (c: ModbusRTU, a: number, q: number) => c.readHoldingRegisters(a, q),
      read_coils: (c: ModbusRTU, a: number, q: number) => c.readCoils(a, q),
      read_discrete_inputs: (c: ModbusRTU, a: number, q: number) => c.readDiscreteInputs(a, q),
    }

    const method = methodMap[query.type]

    const res = await method(client, query.address, query.quantity).catch((err: any) => {
      throw new Error(`Failed to read from client: ${err.message}`)
    })

    return {
      fromFunction: query.type,
      startAddress: query.address,
      data: res.data,
    } as ReadResponse
  }
  const writeToClient = async (query: WriteQuery): Promise<WriteResponse> => {
    if (!client) {
      throw new Error('Modbus client is not connected')
    }

    const quantity = query.values.length
    const methodMap = {
      write_registers: (c: ModbusRTU, a: number, v: number[]) => {
        if (quantity == 1) {
          return c.writeRegister(a, v[0])
        } else {
          return c.writeRegisters(a, v)
        }
      },
      write_coils: (c: ModbusRTU, a: number, v: boolean[]) => {
        if (quantity == 1) {
          return c.writeCoil(a, v[0])
        } else {
          return c.writeCoils(a, v)
        }
      },
    } as const

    const method = methodMap[query.type] as (
      c: ModbusRTU,
      a: number,
      v: number[] | boolean[],
    ) => Promise<unknown>

    if (!method) {
      throw new Error(`Unsupported write type: ${query.type}`)
    }

    await method(client, query.address, query.values).catch((err: any) => {
      throw new Error(`Failed to write to client: ${err.message}`)
    })

    return {
      fromFunction: query.type,
      address: query.address,
      quantity,
    } as WriteResponse
  }

  setContext('readFromClient', readFromClient)
  setContext('writeToClient', writeToClient)

  function Connect() {
    conn.status = 'connecting'
    conn.msg = 'Connecting...'
    const { deviceId, options } = lib.profiles[activeProfileId ?? SCRATCH_ID].connectionSettings

    ModbusRTU.openWebSerial(options)
      .then((_client) => {
        client = _client
        client.setID(deviceId)
        conn.status = 'connected'
        conn.msg = 'Connected successfully'
        const { usbVendorId, usbProductId } = client.getPort().getInfo()
        conn.msg += ` (USB Vendor ID: ${usbVendorId}, Product ID: ${usbProductId})`
      })
      .catch((err) => {
        conn.status = 'disconnected'
        conn.error = true
        conn.msg = `Connection failed: ${err.message}`
      })
  }

  function Disconnect() {
    if (client) {
      client
        .close()
        .then(() => {
          client = null
          conn.status = 'disconnected'
          conn.msg = ''
        })
        .catch((err) => {
          conn.error = true
          conn.msg = `Disconnection failed: ${err.message}`
        })
    }
  }
  import {
    createEmptyLibrary,
    defaultConfiguration,
    deleteProfile as _deleteProfile,
    upsertProfile,
    type Library,
    type TAG,
    SCRATCH_ID,
    upsertNameTableSet,
    createEmptyNameTableSet,
    type NameTableSet,
    deleteNameTableSet,
    type NameBucketMap,
    type Configuration,
    toSerializableNameBucketMap,
    loadLibrary,
    saveLibrary,
  } from './sys/system'
  import CreateProfileModal from './ui/CreateProfileModal.svelte'
  import { debounce } from './sys/generic'
  import NameTableSetModal from './ui/NameTableSetModal.svelte'
  import SystemAlert from '$lib/alert/SystemAlert.svelte'

  let modals = $state({ addProfileOpen: false, nameTableOpen: false })

  // ----------------------------------
  // Profile management
  // - Chanegs are directly to library
  // -> library is saved to localStorage for persistent changes
  // ----------------------------------
  /* Library */
  let lib = $state<Library>(
    (() => {
      const lib = loadLibrary()
      if (!lib.profiles[SCRATCH_ID]) {
        lib.profiles[SCRATCH_ID] = structuredClone(defaultConfiguration)
      }
      return lib
    })(),
  )

  // dirty flag (for UI)
  let libraryDirty = $state(false)

  // ignore the first reactive pass (initial load)
  let _ignoreDirty = true
  queueMicrotask(() =>
    requestAnimationFrame(() => {
      _ignoreDirty = false
    }),
  )

  // save impl used by both manual + autosave
  function _save(snapshot: Library) {
    saveLibrary(snapshot)
    libraryDirty = false
    lastSavedAt = Date.now()
    autosaveError = null
  }
  // Autosave - debounced
  const AUTOSAVE_DELAY = 1000
  let lastSavedAt = $state<number | null>(null)
  let autosaveError = $state<string | null>(null)

  const autosaveDebounced = debounce((snap: Library) => {
    try {
      _save(snap)
    } catch (e) {
      autosaveError = (e as Error).message ?? String(e)
    }
  }, AUTOSAVE_DELAY)

  // mark dirty + autosave whenever lib changes (deep)
  $effect(() => {
    const snap = $state.snapshot(lib) // deep subscribe and capture snapshot
    if (_ignoreDirty) return

    libraryDirty = true
    autosaveDebounced(snap)
  })

  // manual save (e.g., from a “Save” button)
  function PersistLibrary() {
    const snap = $state.snapshot(lib)
    _save(snap)
    alert.success('Library saved to localStorage.')
  }

  onMount(() => {
    // Autosave on unload or visibility change
    const flush = () => {
      if (!libraryDirty) return
      try {
        _save($state.snapshot(lib))
      } catch {}
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

  /* Profile management */
  // All bindings and writings need to be done directly to 'lib'
  // These are just readonly shothands
  let activeProfileId: Readonly<TAG> = $derived(lib.activeProfileTag ?? SCRATCH_ID)
  let currentProfile: Readonly<Configuration> = $derived(
    lib.profiles[activeProfileId] ?? defaultConfiguration,
  )
  let currentNTS: Readonly<NameTableSet> = $derived.by(() =>
    currentProfile.nameTableSetId
      ? (lib.nameTables[currentProfile.nameTableSetId] ?? createEmptyNameTableSet())
      : createEmptyNameTableSet(),
  )
  // Now these work with a real object:
  function handleCreateProfile(id: TAG, template: 'default' | 'current') {
    const newConfig =
      template === 'current'
        ? structuredClone($state.snapshot(currentProfile))
        : structuredClone(defaultConfiguration)
    lib = upsertProfile(lib, id, newConfig)
    lib.activeProfileTag = id
  }

  function handleDeleteProfile(id: TAG | null) {
    if (id === SCRATCH_ID || id === null) return
    lib = _deleteProfile(lib, id)
    if (lib.activeProfileTag === id) lib.activeProfileTag = null
    alert.info(`Profile "${id}" deleted successfully.`)
  }

  // Shortcuts

  function AddShortcut(name: string, query: WriteQuery) {
    if (!name || !query) return
    // reassign to trigger binding
    lib.profiles[activeProfileId].writeShortcuts = {
      ...lib.profiles[activeProfileId].writeShortcuts,
      [name]: query,
    }
  }

  import { useAlert } from '$lib/alert/context'
  import QuickWritePanel from './panels/QuickWritePanel.svelte'
  const alert = useAlert()
</script>

<SystemAlert />
<CreateProfileModal
  bind:open={modals.addProfileOpen}
  existingIds={Object.keys(lib.profiles)}
  onCreate={handleCreateProfile}
/>
<TopMenu
  ntsTags={Object.keys(lib.nameTables)}
  bind:activeNtsTag={lib.profiles[activeProfileId].nameTableSetId}
  onEditNts={() => (modals.nameTableOpen = true)}
  profileTags={Object.keys(lib.profiles)}
  bind:activeProfileId={lib.activeProfileTag}
  onProfileSelect={(id) => (lib.activeProfileTag = id)}
  onProfileAdd={() => (modals.addProfileOpen = true)}
  onProfileDelete={() => handleDeleteProfile(lib.activeProfileTag)}
  {libraryDirty}
  onLibrarySave={PersistLibrary}
  {lastSavedAt}
/>

<ConnectForm
  bind:settings={lib.profiles[activeProfileId].connectionSettings}
  status={conn}
  onsubmit={Connect}
  ondisconnect={Disconnect}
/>
<!-- App shell: make page fill the viewport -->

<main class="flex-1 p-4">
  <div class="mx-auto max-w-screen-3xl grid gap-6 lg:grid-cols-[1fr_auto]">
    <!-- READS (left) -->
    <section class="w-full">
      <!-- wrapper constrains total reads width to ~two cards + gap -->
      <div
        class="mx-auto columns-1 lg:columns-2
               [column-gap:1rem]
               /* two columns ≈ 2×900 + gap; adjust if you change clamp */
               lg:max-w-[calc(1800px+1rem)]
               /* allow single column to still look like 700–900 */
               sm:max-w-[900px]"
      >
        <div class="mb-4 [break-inside:avoid]">
          <ReadPanel type="read_holding_registers" nts={currentNTS} />
        </div>
        <div class="mb-4 [break-inside:avoid]">
          <ReadPanel type="read_input_registers" nts={currentNTS} />
        </div>
        <div class="mb-4 [break-inside:avoid]">
          <ReadPanel type="read_coils" nts={currentNTS} />
        </div>
        <div class="mb-4 [break-inside:avoid]">
          <ReadPanel type="read_coils" nts={currentNTS} />
        </div>
        <!-- add more read panels with the same wrapper -->
      </div>
    </section>

    <!-- WRITES (right) -->
    <aside class="shrink-0 w-[clamp(700px,28vw,900px)] space-y-4 self-start lg:sticky lg:top-4">
      <QuickWritePanel bind:shortcuts={lib.profiles[activeProfileId].writeShortcuts} nts={currentNTS} />
      <WritePanel type="write_registers" nts={currentNTS} addShortcut={AddShortcut} />
      <WritePanel type="write_coils" nts={currentNTS} addShortcut={AddShortcut} />
    </aside>
  </div>
</main>




<!-- Modal to edit name tables -->
<NameTableSetModal
  bind:open={modals.nameTableOpen}
  readNTS={(id: TAG) => $state.snapshot(lib.nameTables[id]) ?? createEmptyNameTableSet()}
  ntsIds={Object.keys(lib.nameTables)}
  bind:activeNtsId={lib.profiles[activeProfileId].nameTableSetId}
  onCreate={(id: TAG) => {
    lib = upsertNameTableSet(lib, id, createEmptyNameTableSet())
    lib.profiles[activeProfileId].nameTableSetId = id
  }}
  onSave={(id: TAG, nts: NameTableSet) => {
    lib = upsertNameTableSet(lib, id, nts)
    lib.profiles[activeProfileId].nameTableSetId = id
  }}
  onDelete={(id: TAG) => {
    lib = deleteNameTableSet(lib, id)
    lib.profiles[activeProfileId].nameTableSetId = null
  }}
/>
