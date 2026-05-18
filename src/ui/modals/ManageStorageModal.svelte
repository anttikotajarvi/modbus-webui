<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Separator } from '$lib/components/ui/separator'
  import * as Alert from '$lib/components/ui/alert'
  import * as RadioGroup from '$lib/components/ui/radio-group'

  import type { LibraryData, NametableTag, ProfileTag } from '@/sys/library/types'
  import { normalizeLibrary, serializeLibrary } from '@/sys/library'
  import { ensureEnvelope } from '@/sys/generic/persistence'
  import type { CurrentVersion } from '@/sys/library/versions/current'
  import { openFiles } from '@/sys/generic/open-file'
  import type { SvimmerReader } from 'svimmer-store'
  import { useAlert } from '../alert/context'
  import { sv } from '@/util/sv.svelte'
  import { createEmptyLibrary } from '@/sys/library/defaults'
  import { FileDown, FileUp } from '@lucide/svelte'
  const alert = useAlert()
  let {
    open = $bindable<boolean>(false),
    libRef,
    onExport,
    onImport,
  }: {
    open: boolean
    libRef: SvimmerReader<LibraryData>
    onImport: (lib: LibraryData) => void
    onExport: () => void
  } = $props()

  let currentStats = $derived.by(() => {
    const lib = $libRef.value()
    return stats(lib)
  })

  // local state
  let newRaw = $state('')
  let loaded: CurrentVersion | null = $state(null)
  let loadError: string | null = $state(null)
  let mode = $state<'replace' | 'merge'>('replace')

  let loadedStats = $derived.by(() => {
    if (!loaded) return null
    return stats(loaded.data)
  })

  // merge planning
  let conflicts = $state<{ profiles: ProfileTag[]; sets: NametableTag[] }>({
    profiles: [],
    sets: [],
  })
  let additions = $state<{ profiles: ProfileTag[]; sets: NametableTag[] }>({
    profiles: [],
    sets: [],
  })
  let choices = $state<{
    profiles: Record<ProfileTag, 'current' | 'new'>
    sets: Record<NametableTag, 'current' | 'new'>
  }>({ profiles: {}, sets: {} })

  // utility
  const stats = (l: LibraryData) => ({
    profiles: Object.keys(l.profiles ?? {}).length,
    sets: Object.keys(l.nametables ?? {}).length,
  })

  /* Domain procedures */
  function parseAndLoad(text: string) {
    loadError = null
    loaded = null
    const err = <T extends Error>(e?: T) => {
      loadError = e?.message ?? String(e)
    }

    let parseRes = ensureEnvelope(text)
    if (parseRes.err) {
      err(parseRes.err)
      return
    }

    const normRes = normalizeLibrary(parseRes.val)
    if (normRes.err) {
      err(normRes.err)
      return
    }

    {
      const initialVersion = parseRes.val.version
      const normVersion = normRes.val.version
      if (normVersion !== initialVersion)
        alert.info(
          'Upgraded input data',
          `Upgraded library data from v${initialVersion} to v${normVersion}`,
        )
    }

    loaded = normRes.val //structuredClone(normRes.val)
    mode = 'replace'
    computeDiffs()
  }

  function computeDiffs() {
    if (!loaded) {
      conflicts = { profiles: [], sets: [] }
      additions = { profiles: [], sets: [] }
      choices = { profiles: {}, sets: {} }
      return
    }
    const current = libRef.value()
    const curP = new Set(Object.keys(current.profiles) as ProfileTag[])
    const curS = new Set(Object.keys(current.nametables) as NametableTag[])
    const newP = Object.keys(loaded.data.profiles) as ProfileTag[]
    const newS = Object.keys(loaded.data.nametables) as NametableTag[]

    const profConf = newP.filter((k) => curP.has(k))
    const setConf = newS.filter((k) => curS.has(k))
    const profAdd = newP.filter((k) => !curP.has(k))
    const setAdd = newS.filter((k) => !curS.has(k))

    conflicts = { profiles: profConf, sets: setConf }
    additions = { profiles: profAdd, sets: setAdd }

    // default conflict resolution prefer "new"
    choices = {
      profiles: Object.fromEntries(profConf.map((k) => [k, 'new' as const])),
      sets: Object.fromEntries(setConf.map((k) => [k, 'new' as const])),
    }
  }
  /* Handlers */
  async function handlePickFile() {
    const file = await openFiles({
      accept: ['.json', 'application/json'],
      multiple: false,
    })
    if (!file) return

    const text = await file.text()
    newRaw = text
    parseAndLoad(text)
  }

  function handleChooseAllProfiles(which: 'current' | 'new') {
    for (const k of conflicts.profiles) choices.profiles[k] = which
  }
  function handleChooseAllNametables(which: 'current' | 'new') {
    for (const k of conflicts.sets) choices.sets[k] = which
  }

  function handleClear() {
    newRaw = ''
    loaded = null
    loadError = null
    mode = 'replace'
    conflicts = { profiles: [], sets: [] }
    additions = { profiles: [], sets: [] }
    choices = { profiles: {}, sets: {} }
  }

  function handleApply() {
    if (!loaded) return

    if (mode === 'replace') {
      onImport(sv(loaded.data))
      open = false
      return
    }
    /* Merge */
    const current = structuredClone(libRef.value())
    const merged = structuredClone(current)

    // Additions
    for (const k of additions.profiles) merged.profiles[k] = loaded.data.profiles[k]
    for (const k of additions.sets) merged.nametables[k] = loaded.data.nametables[k]

    // Conflicts
    for (const k of conflicts.profiles) {
      merged.profiles[k] =
        choices.profiles[k] === 'new' ? loaded.data.profiles[k] : current.profiles[k]
    }
    for (const k of conflicts.sets) {
      merged.nametables[k] =
        choices.sets[k] === 'new' ? loaded.data.nametables[k] : current.nametables[k]
    }

    // Keep Current activeProfileTag
    merged.activeProfileTag = current.activeProfileTag ?? null

    onImport(sv(merged))
    open = false
  }
  function handleLoadTemplate() {
    const lib = serializeLibrary(createEmptyLibrary())
    newRaw = JSON.stringify(lib.val, null, 2)
  }
  function handleJsonIputChange(str: string) {
    if (str.length == 0) return
    parseAndLoad(str)
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title class="text-base">Manage Storage</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground">
        Import a library and choose to replace or merge it with your current data. <br /> <br />
      </Dialog.Description>
    </Dialog.Header>

    <!-- Import row -->
    <div class="flex flex-wrap items-end gap-2">
      <div class="flex items-center gap-2">
        <Button
          id="manage-storage-pick-json"
          variant="secondary"
          class="h-8 px-3 text-xs"
          onclick={handlePickFile}><FileUp />Pick File (.json)</Button
        >
        <Button
          id="manage-storage-export"
          variant="outline"
          class="h-8 px-3 text-xs"
          onclick={onExport}><FileDown />Export Current</Button
        >
        <Button
          id="manage-storage-clear"
          variant="ghost"
          class="h-8 px-3 text-xs"
          onclick={handleClear}>Clear</Button
        >
      </div>
      <div class="ml-auto text-xs text-muted-foreground">
        Current: {currentStats.profiles} profiles • {currentStats.sets} nametables
      </div>
    </div>

    <div class="mt-2">
      <div class="flex">
        <Label for="manage-storage-json-field" class="text-xs mb-1 block">Paste JSON</Label>
        <button
          id="manage-storage-load-template"
          onclick={handleLoadTemplate}
          class="discrete text-xs m-1 ml-auto text-blue-500 float-right"
          >Load Library Template</button
        >
      </div>
      <Textarea
        id="manage-storage-json-field"
        class="h-28 resize-y font-mono text-xs break-all"
        placeholder="…or paste exported library JSON here"
        bind:value={newRaw}
        onchange={(e: Event) => handleJsonIputChange((e.target as HTMLTextAreaElement).value)}
      />
      &nbsp;
      {#if loadError}
        <Alert.Root variant="destructive">
          <Alert.Title>Invalid Library</Alert.Title>
          <Alert.Description>{loadError}</Alert.Description>
        </Alert.Root>
      {:else if loaded}
        <Alert.Root variant="success">
          <Alert.Title>Valid Library!</Alert.Title>
        </Alert.Root>
      {/if}
    </div>
    <Separator class="my-4" />

    <!-- Mode (shadcn RadioGroup) -->
    <div class="space-y-3">
      <RadioGroup.Root class="flex flex-wrap gap-6 text-sm" bind:value={mode} disabled={!loaded}>
        <div class="flex items-center gap-2">
          <RadioGroup.Item id="manage-storage-mode-replace" value="replace" disabled={!loaded} />
          <Label for="manage-storage-mode-replace">Replace Current Library</Label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroup.Item id="manage-storage-mode-merge" value="merge" />
          <Label for="manage-storage-mode-merge" class={!loaded ? 'opacity-50' : ''}
            >Merge Libraries</Label
          >
        </div>
      </RadioGroup.Root>

      {#if loaded}
        <div class="text-xs text-muted-foreground">
          Loaded: {loadedStats?.profiles} profiles • {loadedStats?.sets} nametables
        </div>
      {/if}
    </div>

    {#if mode === 'merge' && loaded}
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <!-- Profiles -->
        <div class="rounded-md border">
          <div class="flex items-center justify-between p-2">
            <div class="text-sm font-medium">Profiles</div>
            {#if conflicts.profiles.length}
              <div class="flex items-center gap-2">
                <Button
                  id="manage-storage-keep-current"
                  variant="outline"
                  class="h-7 px-2 text-xs"
                  onclick={() => handleChooseAllProfiles('current')}>Keep Current</Button
                >
                <Button
                  id="manage-storage-use-new"
                  variant="outline"
                  class="h-7 px-2 text-xs"
                  onclick={() => handleChooseAllProfiles('new')}>Use New</Button
                >
              </div>
            {/if}
          </div>
          <Separator />
          <div class="p-2 text-xs">
            <div class="mb-2 opacity-70">
              Add: {additions.profiles.length} • Conflicts: {conflicts.profiles.length}
            </div>
            <div class="h-40 overflow-y-auto pr-2">
              {#if conflicts.profiles.length === 0}
                <div class="opacity-60">No Profile Name Conflicts.</div>
              {:else}
                <ul class="divide-y">
                  {#each conflicts.profiles as k (k)}
                    <li class="flex items-center justify-between gap-3 py-1">
                      <div class="truncate font-mono">{k}</div>
                      <RadioGroup.Root
                        class="flex items-center gap-3"
                        bind:value={choices.profiles[k]}
                      >
                        <div class="flex items-center gap-1">
                          <RadioGroup.Item id={'pc-' + k} value="current" />
                          <Label for={'pc-' + k}>current</Label>
                        </div>
                        <div class="flex items-center gap-1">
                          <RadioGroup.Item id={'pn-' + k} value="new" />
                          <Label for={'pn-' + k}>new</Label>
                        </div>
                      </RadioGroup.Root>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </div>

        <!-- Name Table Sets -->
        <div class="rounded-md border">
          <div class="flex items-center justify-between p-2">
            <div class="text-sm font-medium">Name Table Sets</div>
            {#if conflicts.sets.length}
              <div class="flex items-center gap-2">
                <Button
                  id="manage-storage-keep-all-current"
                  variant="outline"
                  class="h-7 px-2 text-xs"
                  onclick={() => handleChooseAllNametables('current')}>Keep Current</Button
                >
                <Button
                  id="manage-storage-use-all-new"
                  variant="outline"
                  class="h-7 px-2 text-xs"
                  onclick={() => handleChooseAllNametables('new')}>Use New</Button
                >
              </div>
            {/if}
          </div>
          <Separator />
          <div class="p-2 text-xs">
            <div class="mb-2 opacity-70">
              Add: {additions.sets.length} • Conflicts: {conflicts.sets.length}
            </div>
            <div class="h-40 overflow-y-auto pr-2">
              {#if conflicts.sets.length === 0}
                <div class="opacity-60">No Nametable Conflicts.</div>
              {:else}
                <ul class="divide-y">
                  {#each conflicts.sets as k (k)}
                    <li class="flex items-center justify-between gap-3 py-1">
                      <div class="truncate font-mono">{k}</div>
                      <RadioGroup.Root class="flex items-center gap-3" bind:value={choices.sets[k]}>
                        <div class="flex items-center gap-1">
                          <RadioGroup.Item id={'sc-' + k} value="current" />
                          <Label for={'sc-' + k}>current</Label>
                        </div>
                        <div class="flex items-center gap-1">
                          <RadioGroup.Item id={'sn-' + k} value="new" />
                          <Label for={'sn-' + k}>new</Label>
                        </div>
                      </RadioGroup.Root>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}

    <Dialog.Footer class="mt-4">
      <Dialog.Close>
        <Button id="manage-storage-cancel" variant="outline" class="h-8 px-3 text-xs">Cancel</Button
        >
      </Dialog.Close>
      <Button
        id="manage-storage-apply"
        class="h-8 px-3 text-xs"
        disabled={!loaded}
        onclick={handleApply}
      >
        {mode === 'replace' ? 'Replace' : 'Apply merge'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
