<script lang="ts">
  import * as Collapsible from '$lib/components/ui/collapsible'
  import * as Card from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { Separator } from '$lib/components/ui/separator'
  import { ChevronUp } from '@lucide/svelte'
  import HexArrayInput from '@/ui/generics/custom-input/HexArrayInput.svelte'
  import BinaryArrayInput from '@/ui/generics/custom-input/BinaryArrayInput.svelte'
  import { useAlert } from '@/ui/alert/context'
  import TagInput from '@/ui/generics/custom-input/TagInput.svelte'
  import type { SvimmerReader, SvimmerWriter } from 'svimmer-store'
  import type {
    ConnectionSettings,
    Nametable,
    NametableCategory,
    ProfileData,
  } from '@/sys/library/types'
  import { performAddShortcut } from '@/actions/profile'
  import * as Table from '$lib/components/ui/table'

  import { regPrefixes, type WriteFunction, type WriteResponse } from '@/sys/modbus'
  import HexInput from '@/ui/generics/custom-input/HexInput.svelte'
  import { BINg, HEX } from '@/sys/generic/formatting'
  import type { ModbusClientProcedures } from '@/sys/modbus/gateway'
  import { sv } from '@/util/sv.svelte'
  import { ModbusCallPreview, PositionValueChip } from '@/ui/modbus'

  let {
    id,
    description,
    type,
    writeToClient,
    namesRef,
    shortcutsRef,
    settingsRef,
  }: {
    id: string
    description?: string
    type: WriteFunction
    writeToClient: ModbusClientProcedures['writeToClient']
    namesRef: SvimmerReader<Nametable[NametableCategory] | undefined>
    shortcutsRef: SvimmerWriter<ProfileData['writeShortcuts']>
    settingsRef: SvimmerReader<ConnectionSettings>
  } = $props()

  let address = $state<number>(0)
  let wordValues = $state<number[]>([])
  let bitValues = $state<boolean[]>([])

  const emptyNames = new Map<number, string>()
  let names = $derived($namesRef.value() ?? emptyNames)
  let addressResolved = $derived(names.get(address))
  let deviceId = $derived($settingsRef.value().deviceId)

  const rightValues = $derived(type === 'write_coils' ? bitValues : wordValues)
  let valuesFocused = $state(false)

  function writeData() {
    if (!isQueryValid()) {
      alert.error('Invalid query parameters.')
      return
    }
    writeToClient({
      type,
      address,
      values: type === 'write_coils' ? bitValues : wordValues,
    })
      .then((res: WriteResponse) => {
        console.log('Write successful:', res)
        alert.success(
          'Write successful',
          `Wrote ${res.quantity} values to address ${HEX(res.address, 4)} (${regPrefixes[type]}${res.address + 1}).`,
        )
      })
      .catch((err: any) => {
        console.error('Write failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        alert.error('Write failed', msg)
      })
  }

  let open = $state(true)
  const regPrefix = (n: number) => regPrefixes[type] + `${n + 1}`

  function handleValuesFocusIn() {
    valuesFocused = true
  }

  function handleValuesFocusOut(event: FocusEvent) {
    const container = event.currentTarget as HTMLElement
    const nextTarget = event.relatedTarget as Node | null

    if (!nextTarget || !container.contains(nextTarget)) valuesFocused = false
  }

  function handleClear() {
    wordValues = []
    bitValues = []
  }

  function isQueryValid() {
    if (type === 'write_coils') {
      return bitValues.length > 0 && address >= 0 && address <= 0xffff
    } else if (type === 'write_registers') {
      return wordValues.length > 0 && address >= 0 && address <= 0xffff
    }
    return false
  }

  const alert = useAlert()
  // Shortcuts
  let shortcutName = $state<string>('')
  function handleSaveShortcut() {
    if (shortcutName.trim() === '') {
      alert.error('Shortcut Name cannot be empty.')
      return
    }
    if (!isQueryValid()) {
      alert.error('Invalid query parameters.')
      return
    }
    performAddShortcut(shortcutsRef, shortcutName, {
      type,
      address,
      values: sv(rightValues),
    })
    shortcutName = '' // Reset after saving
  }
</script>

{#snippet registerTableRow(address: number, v: number, i: number)}
  {@const thisAddress = address + i}
  {@const name = names.get(thisAddress) || 'n/a'}
  <Table.Row>
    <Table.Cell class="font-medium">{regPrefix(thisAddress)}</Table.Cell>
    <Table.Cell class="font-mono">{HEX(thisAddress, 4)}</Table.Cell>
    <Table.Cell class="truncate">
      {name}
    </Table.Cell>
    <Table.Cell class="text-blue-500 text-right font-mono">{v}</Table.Cell>
    <Table.Cell class="text-blue-500 font-mono">{HEX(v as number, 4)}</Table.Cell>
    <Table.Cell class="text-blue-500 font-mono">{BINg(v as number, 16, 4)}</Table.Cell>
  </Table.Row>
{/snippet}
{#snippet coilTableRow(address: number, v: boolean, i: number)}
  {@const thisAddress = address + i}
  {@const name = names.get(thisAddress) || 'n/a'}
  <Table.Row>
    <Table.Cell class="font-medium">{regPrefix(thisAddress)}</Table.Cell>
    <Table.Cell class="font-mono">{HEX(thisAddress, 4)}</Table.Cell>
    <Table.Cell class="truncate">
      {name}
    </Table.Cell>
    <Table.Cell class="text-right font-mono">{v ? 1 : 0}</Table.Cell>
    <Table.Cell class="font-mono {v ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100'}"
      >{v ? 'true' : 'false'}</Table.Cell
    >
  </Table.Row>
{/snippet}
<Collapsible.Root bind:open class="w-full">
  <Card.Root class="w-full m-0">
    <Card.Header class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate font-semibold">
          {type}
        </h3>
        {#if description}
          <p class="text-xs text-muted-foreground">
            {description}
          </p>
        {/if}
      </div>

      <form class="flex flex-wrap items-end gap-3" onsubmit={writeData}>
        <div class="flex max-w-sm flex-col gap-1.5">
          <Label for={id + '-write-panel-address'} class="text-muted-foreground"
            >Start Address</Label
          >
          <div style="position: relative;">
            <HexInput
              id={id + '-write-panel-address'}
              bind:value={address}
              max={0xffff}
              display="auto"
              placeholder="0x0000"
              class="h-9 w-40 focus-visible:border-primary focus-visible:bg-secondary/70 focus-visible:text-primary focus-visible:ring-primary/30"
            />
            <p
              class="text-muted-foreground text-xs"
              style="position: absolute; left: 0; top: 100%; margin-top: 2px;"
            >
              {#if addressResolved}
                {addressResolved}
              {/if}
            </p>
          </div>
        </div>

        <div
          class="flex max-w-sm flex-col gap-1.5"
          onfocusin={handleValuesFocusIn}
          onfocusout={handleValuesFocusOut}
        >
          <Label for={id + '-write-panel-values'} class="text-muted-foreground">Add Values</Label>
          {#if type === 'write_coils'}
            <BinaryArrayInput
              id={id + '-write-panel-values'}
              bind:value={bitValues}
              class="h-9 w-40 focus-within:bg-secondary/70 focus-within:text-primary focus-within:ring-primary/30"
              inputClass="w-full"
            />
          {:else if type === 'write_registers'}
            <HexArrayInput
              id={id + '-write-panel-values'}
              bind:value={wordValues}
              max={0xffff}
              display="auto"
              placeholder="0x0000"
              inputClass="h-9 w-40 focus-visible:border-primary focus-visible:bg-secondary/70 focus-visible:text-primary focus-visible:ring-primary/30"
            />
          {/if}
        </div>

        <div class="flex items-center gap-1.5">
          <Button id={id + '-write-panel-submit'} onclick={writeData} aria-label="write"
            >Write</Button
          >

          <Collapsible.Trigger>
            <Button variant="ghost" size="icon" aria-label={open ? 'Minimize' : 'Maximize'}>
              <ChevronUp class={`size-4${!open ? ' rotate-180' : ''}`} />
            </Button>
          </Collapsible.Trigger>
        </div>
      </form>
    </Card.Header>
    <Card.Content>
      <div
        class="rounded p-3 text-sm transition-[background-color,border-color,box-shadow] border-s-2 {valuesFocused
          ? 'border-primary ring-2 ring-primary/30'
          : ''}"
      >
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="font-medium text-foreground">Values</span>
          {#if rightValues.length > 0}
            <Button variant="link" class="m-0 ml-auto h-[1em]" size="sm" onclick={handleClear}>
              Clear</Button
            >
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          {#if rightValues.length === 0}
            <span
              class="inline-flex items-center rounded-md border border-dashed bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              Focus Add Values and enter a value to start the queue.
            </span>
          {:else}
            {#each rightValues as v, i (i)}
              <PositionValueChip
                address={address + i}
                addressLabel={regPrefix(address + i)}
                index={i}
                {type}
                value={v}
                class="text-blue-600 rounded-md border text-[1em]"
              />
            {/each}
          {/if}
        </div>
      </div>
    </Card.Content>
    <Collapsible.Content>
      <Separator orientation="horizontal" />
      <Card.Footer class="flex flex-col gap-4 items-start">
        <div class="pt-4">
          <p class="text-sm font-medium text-foreground">Address/Value Preview</p>
          <p class="text-xs text-muted-foreground">
            Each collected value maps to the next Modbus address from the configured start address.
          </p>
        </div>
        <Table.Root class="w-full bg-blue-50 dark:bg-blue-900/20">
          <Table.Header>
            {#if type === 'write_registers'}
              <Table.Row>
                <Table.Head class="w-24">Reg.</Table.Head>
                <Table.Head class="w-28">Address</Table.Head>
                <Table.Head>Name</Table.Head>
                <Table.Head class="w-24 text-right">Decimal</Table.Head>
                <Table.Head class="w-24">Hex</Table.Head>
                <Table.Head class="w-24">Binary</Table.Head>
              </Table.Row>
            {:else if type === 'write_coils'}
              <Table.Row>
                <Table.Head class="w-24">Reg.</Table.Head>
                <Table.Head class="w-28">Address</Table.Head>
                <Table.Head>Name</Table.Head>
                <Table.Head class="w-24 text-right">Bin</Table.Head>
                <Table.Head class="w-24">Bool</Table.Head>
              </Table.Row>
            {/if}
          </Table.Header>

          <Table.Body>
            {#if type === 'write_registers'}
              {#if rightValues.length === 0}
                <Table.Row>
                  <Table.Cell class="font-medium">{regPrefix(address)}</Table.Cell>
                  <Table.Cell class="font-mono">{HEX(address, 4)}</Table.Cell>
                  <Table.Cell class="truncate text-muted-foreground">No Values Queued</Table.Cell>
                  <Table.Cell class="text-blue-500 text-right font-mono"></Table.Cell>
                  <Table.Cell class="text-blue-500 font-mono"></Table.Cell>
                  <Table.Cell class="text-blue-500 font-mono"></Table.Cell>
                </Table.Row>
              {:else}
                {#each wordValues as v, i (i)}
                  {@render registerTableRow(address, v, i)}
                {/each}
              {/if}
            {:else if type === 'write_coils'}
              {#if rightValues.length === 0}
                <Table.Row>
                  <Table.Cell class="font-medium">{regPrefix(address)}</Table.Cell>
                  <Table.Cell class="font-mono">{HEX(address, 4)}</Table.Cell>
                  <Table.Cell class="truncate text-muted-foreground">No Values Queued</Table.Cell>
                  <Table.Cell class="text-blue-500 text-right font-mono"></Table.Cell>
                  <Table.Cell class="text-blue-500 font-mono"></Table.Cell>
                </Table.Row>
              {:else}
                {#each bitValues as v, i (i)}
                  {@render coilTableRow(address, v, i)}
                {/each}
              {/if}
            {/if}
          </Table.Body>
        </Table.Root>
        <div class="w-full rounded-lg border bg-muted/30 p-3">
          <ModbusCallPreview {type} {address} values={rightValues} {deviceId} />
        </div>

        <div class="w-full pt-4">
          <Separator orientation="horizontal" />
        </div>

        <div class="flex items-end gap-3 pt-4">
          <div class="flex flex-col gap-1.5">
            <Label for={id + '-write-panel-shortcut-name'} class="text-muted-foreground"
              >Shortcut Name</Label
            >
            <TagInput
              id={id + '-write-panel-shortcut-name'}
              placeholder="RESTART_SYSTEM"
              bind:value={shortcutName}
              class="w-64"
            />
          </div>

          <Button
            id={id + '-write-panel-save-shortcut'}
            onclick={handleSaveShortcut}
            aria-label="Save write as shortcut"
            disabled={rightValues.length === 0}
          >
            Save as Shortcut
          </Button>
        </div>
      </Card.Footer>
    </Collapsible.Content>
  </Card.Root>
</Collapsible.Root>
