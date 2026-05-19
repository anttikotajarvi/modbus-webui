<script lang="ts">
  import * as Card from '$lib/components/ui/card'
  import * as Table from '$lib/components/ui/table'
  import { Button } from '$lib/components/ui/button'
  import { Play, Trash2 } from '@lucide/svelte'

  import { regPrefixes, type WriteQuery } from '@/sys/modbus'
  import { useAlert } from '@/ui/alert/context'
  import type { SvimmerReader, SvimmerWriter } from 'svimmer-store'
  import type { Nametable, ProfileData } from '@/sys/library/types'
  import { deleteKey } from 'svimmer-store/helpers/transactors'
  import { resolveAddressName } from '@/sys/state'
  import { HEX } from '@/sys/generic/formatting'
  import type { ModbusClientProcedures } from '@/sys/modbus/gateway'

  type Props = {
    profileRef: SvimmerWriter<ProfileData>
    nametable: SvimmerReader<Nametable | undefined>
    writeToClient: ModbusClientProcedures['writeToClient']
  }
  let { profileRef, nametable, writeToClient }: Props = $props()

  const shortcuts = profileRef.focus((x) => x.writeShortcuts)

  // Derived list for rendering
  let rows = $derived(Object.entries($shortcuts.value()))

  // Execute write using app-provided context
  const alert = useAlert()

  function fnLabel(q: WriteQuery) {
    if (q.type === 'write_registers') {
      return q.values.length === 1 ? 'write_single_register' : 'write_multiple_registers'
    }
    return q.values.length === 1 ? 'write_single_coil' : 'write_multiple_coils'
  }

  function callDisplayParts(q: WriteQuery, maxVals = 6) {
    const addr = HEX(q.address)
    const vals = (q.values ?? []) as Array<number | boolean>
    const parts = vals
      .slice(0, maxVals)
      .map((v) => (q.type === 'write_coils' ? (v ? '0x01' : '0x00') : HEX(v as number)))
    //const more = vals.length > maxVals ? ` …(+${vals.length - maxVals})` : ''
    return { label: fnLabel(q), address: addr, parts: parts.join(' ') }
  }

  async function handleRun(name: string) {
    const q = shortcuts.read((x) => x[name]) as WriteQuery
    if (!q) return
    try {
      const res = await writeToClient(q)
      const prefix = regPrefixes[q.type]
      alert.success(
        `'${name}' write successful`,
        `${fnLabel(q)} @ ${HEX(res.address)} (${prefix}${res.address + 1}) → ${res.quantity} value(s)`,
      )
    } catch (e: any) {
      alert.error('Write failed', e?.message ?? 'Unknown error')
    }
  }

  function handleDelete(name: string) {
    shortcuts.transact(deleteKey(name))
  }
</script>

<Card.Root class="w-full">
  <Card.Header class="flex items-center justify-between gap-3">
    <h3 class="truncate font-semibold">Write Shortcuts</h3>
    <span class="text-sm text-muted-foreground">{rows.length} saved</span>
  </Card.Header>

  <Card.Content class="p-0">
    {#if rows.length === 0}
      <div class="px-4 py-8 text-sm text-muted-foreground">
        No shortcuts yet. Save one from the Write panel.
      </div>
    {:else}
      <Table.Root class="w-full">
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[28%]">Name</Table.Head>
            <Table.Head>Call</Table.Head>
            <Table.Head class="w-[140px] text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {#each rows as [name, q] (name)}
            {@const { label, address, parts } = callDisplayParts(q)}
            {@const resolvedName = nametable.read(resolveAddressName(q))}
            <Table.Row
              class="hover:bg-secondary/40 cursor-pointer"
              onclick={() => handleRun(name)}
              role="button"
              aria-label={`Run ${name}`}
            >
              <Table.Cell class="">
                <div class="font-medium">{name}</div>
              </Table.Cell>
              <Table.Cell class="align-top">
                <div class="font-mono text-xs">
                  {label}
                  {address}{resolvedName ? `/${resolvedName}` : ''}
                </div>
                <div class="text-xs text-muted-foreground">{parts}</div>
              </Table.Cell>
              <Table.Cell class="align-top">
                <div class="flex justify-end gap-2">
                  <Button
                    size="sm"
                    onclick={(e) => {
                      e.stopPropagation()
                      handleRun(name)
                    }}
                    aria-label={`Run ${name}`}
                  >
                    <Play class="size-4 mr-1" /> Run
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => handleDelete(name)}
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </Card.Content>
  <Card.Footer class="text-xs text-muted-foreground">
    Click a row (or&nbsp; <em>Run</em>) to execute immediately. Shorthands are stored in your
    current profile.
  </Card.Footer>
</Card.Root>
