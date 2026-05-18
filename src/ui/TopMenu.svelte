<script lang="ts">
  import * as Menubar from '$lib/components/ui/menubar'
  import { Separator } from '$lib/components/ui/separator'
  import { performDeleteProfile } from '@/actions/profile'
  import { SCRATCH_ID, type LibraryData, type ProfileTag } from '@/sys/library/types'
  import { activeProfileLoc, nametableKeys, profileKeys } from '@/sys/state'
  import type { SvimmerWriter } from 'svimmer-store'
  import { self } from 'svimmer-store/helpers/accessors'
  import type { Modals } from './modals'
  import type { LibraryStatus } from '@/sys/types'
  import type { PersistenceActions } from '@/actions/persistence'

  let {
    lib,
    modals = $bindable(),
    persistenceActions,
    libStatus,
  }: {
    lib: SvimmerWriter<LibraryData>
    modals: Modals
    persistenceActions: PersistenceActions
    libStatus: LibraryStatus
  } = $props()

  // State handles
  // svelte-ignore state_referenced_locally
  const profileRef = lib.follow(activeProfileLoc)

  // svelte-ignore state_referenced_locally
  const profilesRef = lib.focus((x) => x.profiles)
  // svelte-ignore state_referenced_locally
  const nametablesRef = lib.focus((x) => x.nametables)

  // svelte-ignore state_referenced_locally
  let activeProfileTagRef = lib.focus((x) => x.activeProfileTag)
  let selectedNtTagRef = profileRef.focus((x) => x.activeNametable)

  // Local UI
  let activeProfileTag = $derived($activeProfileTagRef.read(self()))
  let selectedNtTag = $derived($selectedNtTagRef.read(self()))
  let ntTags = $derived($nametablesRef.read(nametableKeys))
  let profileTags = $derived($profilesRef.read(profileKeys))

  // Format long name to "REALLY_LONG_NAME..."
  const TAG_MAX_LENGTH = 15
  let formattedProfileId = $derived.by(() => {
    if (!activeProfileTag) return 'Unnamed profile'
    return activeProfileTag.length > TAG_MAX_LENGTH
      ? `${activeProfileTag.slice(0, TAG_MAX_LENGTH)}...`
      : activeProfileTag
  })

  let formattedNtsTag = $derived.by(() => {
    if (!selectedNtTag) return 'Not selected'
    return selectedNtTag.length > TAG_MAX_LENGTH
      ? `${selectedNtTag.slice(0, TAG_MAX_LENGTH)}...`
      : selectedNtTag
  })

  function onProfileDelete(tag: ProfileTag | null) {
    performDeleteProfile(lib, tag)
  }

  function onAddProfile() {
    modals.addProfileOpen = true
  }
  function onEditNametable() {
    modals.nametableOpen = true
  }
  function onStorageManage() {
    modals.manageStorageOpen = true
  }
</script>

<!-- Top menubar strip -->
<nav class="w-full p-4 pt-2 h-9 bg-white p-0">
  <Menubar.Root class="flex-1 width-min p-0 h-9">
    <!-- Profiles menu -->
    <Menubar.Menu>
      <Menubar.Trigger>Profiles</Menubar.Trigger>
      <Menubar.Content>
        {#if profileTags.length === 1 && profileTags[0] === SCRATCH_ID}
          <Menubar.Item disabled>No Profiles</Menubar.Item>
        {:else}
          {#each profileTags as p (p)}
            {#if p !== SCRATCH_ID}
              <Menubar.Item onclick={() => activeProfileTagRef.set(p)}>
                <span class="inline-flex items-center gap-2">
                  {#if activeProfileTag === p}
                    <span class="size-1.5 rounded-full bg-primary"></span>
                  {:else}
                    <span class="size-1.5 rounded-full bg-muted-foreground/30"></span>
                  {/if}
                  {p}
                </span>
              </Menubar.Item>
            {/if}
          {/each}
        {/if}
        <Menubar.Separator />
        <Menubar.Item onclick={onAddProfile}>Add Profile…</Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>

    <!-- Name tables menu -->
    <Menubar.Menu>
      <Menubar.Trigger>Name Tables</Menubar.Trigger>
      <Menubar.Content>
        {#if ntTags.length === 0}
          <Menubar.Item disabled>No Name Tables</Menubar.Item>
        {:else}
          {#each ntTags as s (s)}
            <Menubar.Item onclick={() => selectedNtTagRef.set(s)}>
              <span class="inline-flex items-center gap-2">
                {#if selectedNtTag === s}
                  <span class="size-1.5 rounded-full bg-primary"></span>
                {:else}
                  <span class="size-1.5 rounded-full bg-muted-foreground/30"></span>
                {/if}
                {s}
              </span>
            </Menubar.Item>
          {/each}
        {/if}
        <Menubar.Separator />
        <Menubar.Item onclick={onEditNametable}>Edit…</Menubar.Item>
      </Menubar.Content>
    </Menubar.Menu>
    <!-- Profiles description -->
    <Separator orientation="vertical" />

    <Menubar.Menu>
      <Menubar.Separator />
      <div class="h-9 w-[160px] pb-[2px] flex items-center px-2 text-muted-foreground">
        <!-- fixed width so it sits at the right edge, content left-aligned -->
        <div class="w-[12rem] leading-tight text-left">
          <div class="h-3 flex items-center justify-between">
            <span class="w-[90px] h-3 text-xs w-[8ch]">Current Profile</span>

            <button
              onclick={() => onProfileDelete(activeProfileTag)}
              class="h-3 p-0 discrete text-xs text-red-500">Delete</button
            >
          </div>
          <div class="h-3 text-xs mt-[2px]">
            <strong>{formattedProfileId}</strong>
          </div>
        </div>
      </div>
    </Menubar.Menu>
    <Separator orientation="vertical" />
    <!-- Name tables description -->
    <Menubar.Menu>
      <Menubar.Separator />
      <div class="h-9 w-[160px] pb-[2px] flex items-center px-2 text-muted-foreground">
        <!-- fixed width so it sits at the right edge, content left-aligned -->
        <div class="w-[12rem] leading-tight text-left">
          <div class="h-3 flex items-center justify-between">
            <span class="h-3 text-xs">Selected Nametable</span>
          </div>
          <div class="h-3 text-xs mt-[2px]">
            <strong>{formattedNtsTag}</strong>
          </div>
        </div>
      </div>
    </Menubar.Menu>
    <!-- Library status -->
    <Menubar.Menu>
      <Menubar.Separator />
      <div class="h-9 w-[250px] pb-[2px] flex items-center px-2 ml-auto text-muted-foreground">
        <Separator orientation="vertical" class="mr-4 !h-[60%]" />

        <!-- fixed width so it sits at the right edge, content left-aligned -->
        <div class="w-full leading-tight text-left">
          <!-- top line: left-aligned -->
          <div class="h-3 text-xs">
            Local storage {libStatus.dirty ? '(unsaved)' : '(saved)'}
            <span class="w-[90px] h-3 text-xs w-[8ch] text-right float-right">
              <i
                >{libStatus.lastSavedAt
                  ? new Date(libStatus.lastSavedAt).toLocaleTimeString()
                  : ''}</i
              >
            </span>
          </div>

          <!-- bottom line: Save left, time right (no jumping) -->
          <div class="h-3 mt-[2px] flex items-center justify-between">
            <button
              onclick={persistenceActions.saveLibrary}
              class="h-3 p-0 discrete text-xs text-emerald-500"
            >
              Save
            </button>
            <span class="w-[100px] h-3 text-xs w-[8ch] text-right">
              <button onclick={onStorageManage} class="h-3 p-0 discrete text-xs text-emerald-500">
                Import/Export
              </button>
            </span>
          </div>
        </div>
      </div>
    </Menubar.Menu>
  </Menubar.Root>
</nav>

<style>
</style>
