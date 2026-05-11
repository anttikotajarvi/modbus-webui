<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Select from '$lib/components/ui/select'
  import { Button } from '$lib/components/ui/button'
  import { Separator } from '$lib/components/ui/separator'
  import TagInput from '@/ui/generics/custom-input/TagInput.svelte'
  import { useAlert } from '@/ui/alert/context'
  import type { SvimmerWriter } from 'svimmer-store'
  import type { LibraryData, Nametable, NametableTag } from '@/sys/library/types'
  import { deleteKey, setKey } from 'svimmer-store/helpers/transactors'
  import { createEmptyNametable } from '@/sys/library/defaults'
  import { keysOf } from 'svimmer-store/helpers/accessors'
  import NametableEditor from '@/ui/nametables/NametableEditor.svelte'
  import { key } from 'svimmer-store/helpers/selectors'

  // Minimal API:
  // - open (bindable)
  // - ntsIds: list of all available set ids
  // - activeNtsId (bindable): which set is currently targeted (optional)
  // - readNTS(id): returns the current NametableSet (from your library)
  // - onSave(id, nts), onDelete(id), onCreate(id)
  let {
    open = $bindable<boolean>(false),
    activeTagRef,
    nametablesRef,
  }: {
    open: boolean
    activeTagRef: SvimmerWriter<NametableTag | null>
    nametablesRef: SvimmerWriter<LibraryData['nametables']>
  } = $props()

  let tags = $derived($nametablesRef.read(keysOf()))
  // local selected id inside the modal (defaults to active or first)
  // svelte-ignore state_referenced_locally
  let selectedTag = $state<NametableTag>(activeTagRef.value() ?? tags[0] ?? "");
  let selectedNtRef = $derived(nametablesRef.focus(key(selectedTag)));

  // creation dialog
  let newOpen = $state(false)
  let newId = $state<string | null>(null)
  const newIdValid = $derived(() => {
    const v = (newId ?? '').trim()
    if (v === '') return { ok: false, msg: 'Identifier cannot be empty' }
    if (tags.includes(v as NametableTag)) return { ok: false, msg: 'Identifier already exists' }
    return { ok: true, msg: '' }
  })

  const alert = useAlert()

  let currentDirty = $state(false) // bound from NTSEditor via a separate prop

  function onSelect(nextId: string) {
    if (currentDirty) {
      alert.info(`Discarded unsaved changes to ${selectedTag ?? 'current set'}`)
    }
    selectedTag = nextId as NametableTag;
  }
  function onCreate() {
    if (!newIdValid().ok || !newId) return
    const id = newId as NametableTag
    nametablesRef.transact(setKey(id, createEmptyNametable()))
    selectedTag = id;
    activeTagRef.set(id)
    newOpen = false
    newId = null
  }
  function onDelete() {
    const id = selectedTag;
    const res = nametablesRef.transact(deleteKey(id))
    if (res) alert.info(`Deleted nametable "${id}" successfully.`)


  }
  function onSave(data: Nametable) {
    const id = selectedTag;
    nametablesRef.transact(setKey(id, data));
    alert.success("Nametable saved!", "Saved " + id);
    selectedTag = tags[0] ?? ""; // pick next or clear
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[1000px]">
    <Dialog.Header>
      <Dialog.Title>Edit name table sets</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground">
        Choose a set to edit. Changes are applied when you press <em>Save</em>.
      </Dialog.Description>

      <!-- Header toolbar -->
      <div class="mt-3 flex items-center gap-3">
        <div class="min-w-[260px]">
          <Select.Root
            disabled={tags.length === 0}
            type="single"
            value={selectedTag ?? ''}
            onValueChange={onSelect}
          >
            <Select.Trigger class="w-full h-9">
              {#if selectedTag}{selectedTag}{:else}<span class="text-muted-foreground"
                  >Select a set…</span
                >{/if}
            </Select.Trigger>
            <Select.Content>
              {#each tags as tag (tag)}
                <Select.Item value={tag}>{tag}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <Separator orientation="vertical" class="h-9" />

        <Button
          variant="secondary"
          onclick={() => {
            newOpen = true
          }}
        >
          New set…
        </Button>
      </div>
    </Dialog.Header>

    <!-- Body -->
    {#if selectedTag}
      <div class="mt-4">
        {#key selectedTag}
          <NametableEditor
            bind:dirty={currentDirty}
            initialData={$selectedNtRef.value()}
            onsave={onSave}
            ondelete={onDelete}
          />
        {/key}
      </div>
    {:else}
      <p class="text-sm text-muted-foreground mt-6">
        No name table set selected. Please select an existing or create a new one.
      </p>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- "New set" dialog -->
<Dialog.Root bind:open={newOpen}>
  <Dialog.Content class="sm:max-w-[520px]">
    <Dialog.Header>
      <Dialog.Title>New name table set</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground">
        Choose an identifier. Use A–Z, digits, and “_”. Digits cannot be first.
      </Dialog.Description>
    </Dialog.Header>

    <div class="p-4">
      <TagInput placeholder="NTS_IDENTIFIER" bind:value={newId} class="w-full" />
      <p class={`mt-2 text-sm ${newIdValid().ok ? 'text-muted-foreground' : 'text-destructive'}`}>
        {newIdValid().ok ? '\u00A0' : newIdValid().msg}
      </p>
    </div>

    <Dialog.Footer>
      <Button
        variant="ghost"
        onclick={() => {
          newOpen = false
        }}>Cancel</Button
      >
      <Button disabled={!newIdValid().ok} onclick={onCreate}>Create</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
