<script lang="ts">
  import type { ConnectStatus } from '@/types/comp'
  import type { ConnectionSettings } from '@/sys/library/types'

  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { Separator } from '$lib/components/ui/separator'
  import { Badge } from '$lib/components/ui/badge'
  import type { SvimmerWriter } from 'svimmer-store'
  import { key } from 'svimmer-store/helpers/selectors'
  import { setNumber } from '../util/set-value'

  /**
   * The svimmer implementation here might need debouncing or batching.
   */

  type Props = {
    settings: SvimmerWriter<ConnectionSettings>
    status: ConnectStatus
    onsubmit: () => void
    ondisconnect: () => void
  }

  let { settings, status, onsubmit, ondisconnect }: Props = $props()

  const deviceId = settings.focus(key('deviceId'))
  const baudRate = settings.focus((x) => x.options.baudRate)
  const dataBits = settings.focus((x) => x.options.dataBits)
  const stopBits = settings.focus((x) => x.options.stopBits)
  const parity = settings.focus((x) => x.options.parity)

  const disabled = $derived(status.status === 'connecting' || status.status === 'connected')

  const canSubmit = $derived(status.status !== 'connecting' && status.status !== 'connected')

  const statusText = $derived.by(() => {
    switch (status.status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'disconnected':
        return 'Disconnected'
      case 'idle':
        return 'Idle'
    }
  })

  const statusVariant = $derived(status.status === 'idle' ? 'outline' : 'secondary')

  const statusClass = $derived(status.status === 'connected' ? 'bg-green-500 text-white' : '')

  const statusMessage = $derived(status.msg.length === 0 ? 'No message available' : status.msg)

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    void onsubmit()
  }
</script>

<header class="w-full border-b">
  <div class="flex min-h-20 flex-wrap items-center gap-3 px-4 py-3">
    <div class="flex min-w-[18rem] flex-1 items-center gap-3">
      <Badge variant={statusVariant} class={statusClass}>
        {statusText}
      </Badge>

      <p class="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
        {statusMessage}
      </p>
    </div>

    <Separator orientation="vertical" class="hidden !h-12 lg:block" />

    <form class="flex flex-wrap items-end gap-3" onsubmit={handleSubmit}>
      <fieldset {disabled} class="contents">
        <div class="flex flex-col gap-1.5">
          <Label for="connect-device-id" class="text-xs text-muted-foreground">Device ID</Label>

          <Input
            id="connect-device-id"
            type="number"
            min="0"
            max="255"
            value={$deviceId.value()}
            oninput={setNumber(deviceId)}
            class="h-9 w-24"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="connect-baud-rate" class="text-xs text-muted-foreground">Baud rate</Label>

          <Input
            id="connect-baud-rate"
            type="number"
            min="1200"
            step="100"
            value={$baudRate.value()}
            oninput={setNumber(baudRate)}
            class="h-9 w-28"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="connect-data-bits" class="text-xs text-muted-foreground">Data bits</Label>

          <Select.Root
            type="single"
            value={String($dataBits.value())}
            onValueChange={(value) => {
              const num = Number(value) as 7 | 8
              dataBits.set(num)
            }}
          >
            <Select.Trigger id="connect-data-bits" class="h-9 w-20">
              {$dataBits.value()}
            </Select.Trigger>

            <Select.Content>
              <Select.Item value="7">7</Select.Item>
              <Select.Item value="8">8</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="connect-parity" class="text-xs text-muted-foreground">Parity</Label>

          <Select.Root
            type="single"
            value={$parity.value()}
            onValueChange={(val) => parity.set(val as 'odd' | 'even' | 'none')}
          >
            <Select.Trigger id="connect-parity" class="h-9 w-24 capitalize">
              {$parity.value()}
            </Select.Trigger>

            <Select.Content>
              <Select.Item value="none">none</Select.Item>
              <Select.Item value="even">even</Select.Item>
              <Select.Item value="odd">odd</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label for="connect-stop-bits" class="text-xs text-muted-foreground">Stop bits</Label>

          <Select.Root
            type="single"
            value={String($stopBits.value())}
            onValueChange={(value) => {
              stopBits.set(Number(value) as 1 | 2)
            }}
          >
            <Select.Trigger id="connect-stop-bits" class="h-9 w-20">
              {$stopBits.value()}
            </Select.Trigger>

            <Select.Content>
              <Select.Item value="1">1</Select.Item>
              <Select.Item value="2">2</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </fieldset>

      {#if status.status === 'connected'}
        <Button
          id="connect-disconnect"
          type="button"
          variant="outline"
          class="h-9"
          onclick={ondisconnect}
        >
          Disconnect
        </Button>
      {:else}
        <Button id="connect-submit" type="submit" class="h-9" disabled={!canSubmit}>Connect</Button>
      {/if}
    </form>
  </div>
</header>
