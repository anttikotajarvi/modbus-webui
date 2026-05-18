<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog'
  import * as Select from '$lib/components/ui/select'
  import { Button } from '$lib/components/ui/button'
  import { Separator } from '$lib/components/ui/separator'
  import TagInput from '@/ui/generics/custom-input/TagInput.svelte'
  import { useAlert } from '@/ui/alert/context'
  import { deriveHandle, type SvimmerWriter } from 'svimmer-store'
  import type { LibraryData, Nametable, NametableTag } from '@/sys/library/types'
  import { deleteKey, setKey } from 'svimmer-store/helpers/transactors'
  import { createEmptyNametable } from '@/sys/library/defaults'
  import NametableEditor from '@/ui/nametables/NametableEditor.svelte'
  import { key } from 'svimmer-store/helpers/selectors'
  import { keysOf } from 'svimmer-store/helpers/accessors'
  import { writable } from 'svelte/store'
  import { sv } from '@/util/sv.svelte'

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
  const selectedTag = writable(activeTagRef.value() ?? tags[0] ?? '')
  let selectedNtRef = deriveHandle([selectedTag], () => {
    return nametablesRef.focus(key($selectedTag))
  })

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

  let currentDirty = $state(false)

  function onSelect(nextId: string) {
    if (currentDirty) {
      alert.info(`Discarded unsaved changes to ${$selectedTag ?? 'current set'}`)
    }
    selectedTag.set(nextId as NametableTag)
  }
  function onCreate() {
    if (!newIdValid().ok || !newId) return
    const id = newId as NametableTag
    nametablesRef.transact(setKey(id, createEmptyNametable()))
    selectedTag.set(id)
    activeTagRef.set(id)
    newOpen = false
    newId = null
  }
  function onDelete() {
    const id = $selectedTag

    const res = nametablesRef.transact(deleteKey(id))
    if (res) alert.info(`Deleted nametable "${id}" successfully.`)
    selectedTag.set(tags[0] ?? '') // pick next or clear
  }
  function onSave(data: Nametable) {
    const id = $selectedTag
    nametablesRef.transact(setKey(id, sv(data)))
    alert.success('Nametable Saved!', 'Saved ' + id)
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[1000px]">
    <Dialog.Header>
      <Dialog.Title>Edit Nametables</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground">
        Choose a nametable to edit. Changes are applied when you press <em>Save</em>.
      </Dialog.Description>

      <!-- Header toolbar -->
      <div class="mt-3 flex items-center gap-3">
        <div class="min-w-[260px]">
          <Select.Root
            disabled={tags.length === 0}
            type="single"
            value={$selectedTag ?? ''}
            onValueChange={onSelect}
          >
            <Select.Trigger class="w-full h-9">
              {#if $selectedTag}{$selectedTag}{:else}<span class="text-muted-foreground"
                  >Select a Nametable...</span
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
    {#if $selectedTag}
      <div class="mt-4">
        {#key $selectedTag}
          <NametableEditor
            name={$selectedTag}
            bind:dirty={currentDirty}
            initialData={selectedNtRef.value()}
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
      <Dialog.Title>New Name Table Set</Dialog.Title>
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
