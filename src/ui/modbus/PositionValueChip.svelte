<script lang="ts">
  import { HEX } from '@/sys/generic/formatting'

  type Props = {
    address: number
    addressLabel: string
    index: number
    type: 'write_registers' | 'write_coils'
    value: number | boolean
    class?: string
  }

  let { address, addressLabel, index, type, value, class: className = '' }: Props = $props()

  const formattedValue = $derived.by(() => {
    if (type === 'write_registers') {
      const numberValue = value as number
      return `${numberValue} (${HEX(numberValue, 4)})`
    }

    const booleanValue = value as boolean
    return `${booleanValue ? 1 : 0} (${booleanValue ? 'true' : 'false'})`
  })
</script>

<span
  class={`inline-flex flex-col gap-0.5 rounded-md px-2 py-1 ${className}`}
  title={`Address ${addressLabel} (${HEX(address, 4)})`}
>
  <span class="uppercase tracking-wide opacity-70 text-[0.65rem]">
    {addressLabel} · #{index + 1}
  </span>
  <span class="font-mono">{formattedValue}</span>
</span>
