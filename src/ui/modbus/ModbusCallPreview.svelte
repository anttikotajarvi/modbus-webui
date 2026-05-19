<script lang="ts">
  import * as Collapsible from '$lib/components/ui/collapsible'
  import { Button } from '$lib/components/ui/button'
  import { ChevronDown } from '@lucide/svelte'
  import { regPrefixes, type WriteFunction } from '@/sys/modbus'
  import { HEX } from '@/sys/generic/formatting'
  import {
    buildWriteMultiple,
    buildWriteMultipleCoils,
    buildWriteSingle,
    buildWriteSingleCoil,
  } from 'modbus-webserial'

  type FrameSegment = {
    label: string
    bytes: number[]
    description?: string
    emphasis?: boolean
  }

  type Props = {
    type: WriteFunction
    address: number
    values: number[] | boolean[]
    deviceId: number
  }

  let { type, address, values, deviceId }: Props = $props()
  let open = $state(false)

  const isValid = $derived(values.length > 0 && address >= 0 && address <= 0xffff)
  const regPrefix = $derived(regPrefixes[type])
  const startAddressLabel = $derived(`${regPrefix}${address + 1}`)

  const functionDisplayName = $derived.by(() => {
    switch (type) {
      case 'write_coils':
        return values.length === 1 ? 'write_single_coil' : 'write_multiple_coils'
      case 'write_registers':
        return values.length === 1 ? 'write_single_register' : 'write_multiple_registers'
      default:
        return null
    }
  })

  function hexByte(value: number) {
    return HEX(value, 2)
  }

  function hexBytes(bytes: number[]) {
    return bytes.map(hexByte).join(' ')
  }

  function frameDataBytes() {
    if (!isValid) return null

    if (type === 'write_registers') {
      const registerValues = values as number[]
      if (registerValues.length === 1) return buildWriteSingle(deviceId, address, registerValues[0])
      return buildWriteMultiple(deviceId, address, registerValues)
    }

    const coilValues = values as boolean[]
    if (coilValues.length === 1) return buildWriteSingleCoil(deviceId, address, coilValues[0])
    return buildWriteMultipleCoils(deviceId, address, coilValues)
  }

  function dataDescription() {
    if (type === 'write_registers') {
      return (values as number[])
        .map((value, index) => `${regPrefix}${address + index + 1}=${HEX(value, 4)}`)
        .join(', ')
    }

    return (values as boolean[])
      .map((value, index) => `${regPrefix}${address + index + 1}=${value ? 'ON' : 'OFF'}`)
      .join(', ')
  }

  const framePreview = $derived.by(() => {
    try {
      const frame = frameDataBytes()
      if (!frame) return { frame: null, error: null, segments: [] as FrameSegment[] }

      const bytes = Array.from(frame)
      const segments: FrameSegment[] = [
        { label: 'Slave ID', bytes: bytes.slice(0, 1), description: String(deviceId) },
        {
          label: 'Function',
          bytes: bytes.slice(1, 2),
          description: functionDisplayName?.replaceAll('_', ' '),
          emphasis: true,
        },
        {
          label: 'Start address',
          bytes: bytes.slice(2, 4),
          description: `${HEX(address, 4)} / ${startAddressLabel}`,
        },
      ]

      if (values.length === 1) {
        segments.push({
          label: type === 'write_registers' ? 'Value' : 'Coil state',
          bytes: bytes.slice(4, 6),
          description: dataDescription(),
          emphasis: true,
        })
      } else {
        segments.push(
          {
            label: 'Quantity',
            bytes: bytes.slice(4, 6),
            description: `${values.length} ${type === 'write_registers' ? 'registers' : 'coils'}`,
          },
          {
            label: 'Byte count',
            bytes: bytes.slice(6, 7),
            description: `${bytes[6]} data bytes`,
          },
          {
            label: 'Packed values',
            bytes: bytes.slice(7, -2),
            description: dataDescription(),
            emphasis: true,
          },
        )
      }

      segments.push({ label: 'CRC', bytes: bytes.slice(-2), description: 'low byte first' })

      return { frame: bytes, error: null, segments }
    } catch (err) {
      return {
        frame: null,
        error: err instanceof Error ? err.message : String(err),
        segments: [] as FrameSegment[],
      }
    }
  })

  const callSignature = $derived.by(() => {
    const displayValues =
      type === 'write_registers'
        ? `[${(values as number[]).map((value) => HEX(value, 4)).join(', ')}]`
        : `[${(values as boolean[]).map((value) => (value ? 'true' : 'false')).join(', ')}]`

    if (type === 'write_registers') {
      const registerValues = values as number[]
      return values.length === 1
        ? `client.writeRegister(${HEX(address, 4)}, ${HEX(registerValues[0] ?? 0, 4)})`
        : `client.writeRegisters(${HEX(address, 4)}, ${displayValues})`
    }

    const coilValues = values as boolean[]
    return values.length === 1
      ? `client.writeCoil(${HEX(address, 4)}, ${coilValues[0] ? 'true' : 'false'})`
      : `client.writeCoils(${HEX(address, 4)}, ${displayValues})`
  })
</script>

<Collapsible.Root bind:open class="w-full">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-sm font-medium text-foreground">Modbus RTU Request Preview</p>
      <code class="text-xs text-muted-foreground">{callSignature}</code
      >
    </div>
    <Collapsible.Trigger>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? 'Hide frame bytes' : 'Show frame bytes'}
      >
        <ChevronDown class={`size-4${open ? ' rotate-180' : ''}`} />
      </Button>
    </Collapsible.Trigger>
  </div>

  <Collapsible.Content class="pt-3">
    {#if framePreview.error}
      <p class="text-sm text-destructive">Cannot build frame: {framePreview.error}</p>
    {:else if !framePreview.frame}
      <p
        class="rounded-md border border-dashed bg-background px-3 py-2 text-sm text-muted-foreground"
      >
        Add values above to preview the exact RTU bytes before you write.
      </p>
    {:else}
      <div class="flex flex-wrap items-stretch gap-2">
        {#each framePreview.segments as segment (segment.label)}
          <div
            class="min-w-20 rounded-md bg-background px-2 py-1 ring-1 ring-border {segment.emphasis
              ? 'bg-blue-50 ring-blue-300 dark:bg-blue-950/40 dark:ring-blue-900'
              : ''}"
          >
            <div class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {segment.label}
            </div>
            <div class="font-mono text-sm text-foreground">{hexBytes(segment.bytes)}</div>
            {#if segment.description}
              <div
                class="max-w-48 truncate text-[0.7rem] text-muted-foreground"
                title={segment.description}
              >
                {segment.description}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <div class="mt-3 rounded-md bg-background px-3 py-2">
        <div class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Complete frame
        </div>
        <code class="break-all font-mono text-sm text-foreground"
          >{hexBytes(framePreview.frame)}</code
        >
        <p class="text-xs text-muted-foreground">
          Built with modbus-webserial frame builders using slave ID {deviceId}.
        </p>
      </div>
    {/if}
  </Collapsible.Content>
</Collapsible.Root>
