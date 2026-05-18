<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Separator } from '$lib/components/ui/separator'
  import * as Tabs from '$lib/components/ui/tabs'
  import NameMapEditor from '@/ui/generics/NameMapEditor.svelte'
  import type { Nametable, NametableCategory } from '@/sys/library/types'
  import { fromNametableString, toNametableString } from './NametableEditor'
  import { registerLabels as labels } from '@/sys/modbus'
  import { sv } from '@/util/sv.svelte'

  // Edits a single NameBucketMap (iregs, hregs, coils, dinputs)
  let {
    name,
    initialData,
    onsave,
    ondelete,
    dirty = $bindable<boolean>(false),
  }: {
    name: string
    initialData: Nametable
    onsave: (nt: Nametable) => void
    ondelete: () => void
    dirty: boolean
  } = $props()

  /* Dirtiness tracking */
  // gate for ignoring changes during initial load
  let _ignoreDirty = true
  // release the gate after the first microtask
  queueMicrotask(() =>
    requestAnimationFrame(() => {
      _ignoreDirty = false
    }),
  )

  // working copy + json text
  // svelte-ignore state_referenced_locally
  let working = $state<Nametable>(structuredClone(initialData))
  // svelte-ignore state_referenced_locally
  let jsonText = $state<string>(toNametableString(initialData))
  let parseError = $state<string | null>(null)

  // When initialData changes (parent switches set), reset editor
  $effect(() => {
    working = structuredClone(initialData)
    jsonText = toNametableString(initialData)
    parseError = null
    dirty = false
    _ignoreDirty = true
    queueMicrotask(() =>
      requestAnimationFrame(() => {
        _ignoreDirty = false
      }),
    )
  })

  // Keep JSON in sync when the table editors mutate `working`.
  // Avoid fighting user typing in the JSON area via a simple focus guard
  let jsonActive = $state(false)
  $effect(() => {
    void $state.snapshot(working)

    if (!_ignoreDirty) dirty = true

    if (!jsonActive) {
      jsonText = toNametableString(working)
      parseError = null
    }
  })
  let jsonDebounceTimeout: ReturnType<typeof setTimeout>
  function applyFromJson() {
    clearTimeout(jsonDebounceTimeout)
    // JSON -> working
    try {
      const parsed = fromNametableString(jsonText)
      working = structuredClone(parsed)
      parseError = null
    } catch (err) {
      parseError = (err as Error).message
    }
  }
  /* JSON -> working (manual paste/edit) */
  function onJsonInput(e: Event) {
    const el = e.target as HTMLTextAreaElement
    jsonText = el.value
    // Parse json with debounce to avoid too many updates
    clearTimeout(jsonDebounceTimeout)
    jsonDebounceTimeout = setTimeout(() => {
      applyFromJson()
    }, 1000)
  }

  /* Buttons */
  function resetToInitial() {
    working = structuredClone(initialData)
    jsonText = toNametableString(initialData)
    dirty = false
    parseError = null
  }
  function saveNow() {
    applyFromJson()
    if (parseError) return
    dirty = false
    onsave(sv(working))
  }

  /* Tabs state */
  let tab = $state<NametableCategory>('hregs')

  let saveDisabled = $derived.by(() => {
    return parseError !== null || dirty === false
  })
</script>

<Card.Root class="w-full">
  <Card.Header>
    <Card.Title
      >Nametable <code
        class="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
      >
        {name}
      </code></Card.Title
    >
    <Card.Description class="text-sm text-muted-foreground">
      Edit via the table editor or paste JSON. Addresses are 0x0000–0xFFFF.
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Tabs editor for each bucket -->
    <Tabs.Root bind:value={tab} class="w-full h-[500px]">
      <Tabs.List class="mb-2">
        <Tabs.Trigger value="hregs">Holding Regs</Tabs.Trigger>
        <Tabs.Trigger value="iregs">Input Regs</Tabs.Trigger>
        <Tabs.Trigger value="coils">Coils</Tabs.Trigger>
        <Tabs.Trigger value="dinputs">Discrete Inputs</Tabs.Trigger>
        <Tabs.Trigger value="json">Raw JSON</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="hregs" class="h-[420px] overflow-y-auto pr-2">
        <NameMapEditor bind:value={working.hregs} label={labels.hregs} />
      </Tabs.Content>

      <Tabs.Content value="iregs" class="h-[420px] overflow-y-auto pr-2">
        <NameMapEditor bind:value={working.iregs} label={labels.iregs} />
      </Tabs.Content>

      <Tabs.Content value="coils" class="h-[420px] overflow-y-auto pr-2">
        <NameMapEditor bind:value={working.coils} label={labels.coils} />
      </Tabs.Content>

      <Tabs.Content value="dinputs" class="h-[420px] overflow-y-auto pr-2">
        <NameMapEditor bind:value={working.dinputs} label={labels.dinputs} />
      </Tabs.Content>

      <Tabs.Content value="json" class="h-[420px]">
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">Raw JSON</p>
          <Textarea
            class="h-[420px] font-mono text-sm overflow-y-auto pr-2 bg-muted text-muted-foreground"
            bind:value={jsonText}
            onfocus={() => (jsonActive = true)}
            onblur={() => ((jsonActive = false), applyFromJson())}
            oninput={onJsonInput}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
          />
          {#if parseError}
            <p class="text-sm text-destructive">
              Invalid JSON: {parseError}
            </p>
          {/if}
        </div>
      </Tabs.Content>
    </Tabs.Root>
  </Card.Content>
  <Card.Footer class="flex items-center gap-2">
    <Button variant="secondary" onclick={resetToInitial}>Reset</Button>
    <Separator orientation="vertical" class="h-6" />
    <Button onclick={saveNow} disabled={saveDisabled}>Save</Button>
    <span class="text-xs text-muted-foreground">
      {dirty ? 'Unsaved changes' : ''}
    </span>
    <div class="ml-auto">
      <Button variant="destructive" onclick={ondelete}>Delete Set…</Button>
    </div>
  </Card.Footer>
</Card.Root>
