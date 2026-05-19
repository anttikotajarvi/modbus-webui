<script lang="ts">
  import type { ConnectStatus } from '@/types/comp'
  import type { ConnectionSettings } from '@/sys/library/types'

  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { Separator } from '$lib/components/ui/separator'
  import { Badge } from '$lib/components/ui/badge'
  import { Popover } from 'bits-ui'
  import { ChevronDown } from '@lucide/svelte'
  import type { SvimmerWriter } from 'svimmer-store'
  import { key } from 'svimmer-store/helpers/selectors'
  import { setNumber } from '../util/set-value'

  /**
   * The svimmer implementation here might need debouncing or batching.
   */

  type CrcPolicy = ConnectionSettings['options']['crcPolicy']
  type CrcMode = CrcPolicy['mode']

  type Props = {
    settingsRef: SvimmerWriter<ConnectionSettings>
    status: ConnectStatus
    onConnect: () => void
    onDisconnect: () => void
  }

  let { settingsRef, status, onConnect, onDisconnect }: Props = $props()

  const deviceId = settingsRef.focus(key('deviceId'))
  const baudRate = settingsRef.focus((x) => x.options.baudRate)
  const dataBits = settingsRef.focus((x) => x.options.dataBits)
  const stopBits = settingsRef.focus((x) => x.options.stopBits)
  const parity = settingsRef.focus((x) => x.options.parity)
  const timeout = settingsRef.focus((x) => x.options.timeout)
  const postTimeoutWaitPeriod = settingsRef.focus((x) => x.options.postTimeoutWaitPeriod)
  const interRequestDelay = settingsRef.focus((x) => x.options.interRequestDelay)
  const crcPolicy = settingsRef.focus((x) => x.options.crcPolicy)

  let advancedOpen = $state(false)
  let lastMaxResyncDrops = $state<number | undefined>(undefined)

  const maxResyncDropsValue = $derived.by(() => {
    const policy = $crcPolicy.value()

    return policy.mode === 'resync' ? policy.maxResyncDrops : undefined
  })

  $effect(() => {
    if (typeof maxResyncDropsValue === 'number') {
      lastMaxResyncDrops = maxResyncDropsValue
    }
  })

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

  const statusMessage = $derived(status.msg.length === 0 ? 'No Message Available' : status.msg)

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    void onConnect()
  }

  function setCrcMode(value: CrcMode) {
    settingsRef.transact((settings) => {
      if (value === 'strict') {
        settings.options.crcPolicy = { mode: 'strict' }
        return
      }

      settings.options.crcPolicy = {
        mode: 'resync',
        maxResyncDrops:
          settings.options.crcPolicy.mode === 'resync'
            ? settings.options.crcPolicy.maxResyncDrops
            : (lastMaxResyncDrops ?? 10),
      }
    })
  }

  function setMaxResyncDrops(event: Event) {
    const input = event.currentTarget as HTMLInputElement

    if (input.value === '') return

    const value = input.valueAsNumber
    if (!Number.isFinite(value)) return

    settingsRef.transact((settings) => {
      settings.options.crcPolicy = {
        mode: 'resync',
        maxResyncDrops: value,
      }
    })
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
          <Label for="connect-baud-rate" class="text-xs text-muted-foreground">Baud Rate</Label>

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
          <Label for="connect-data-bits" class="text-xs text-muted-foreground">Data Bits</Label>

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
          <Label for="connect-stop-bits" class="text-xs text-muted-foreground">Stop Bits</Label>

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

        <Popover.Root bind:open={advancedOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                id="connect-advanced-toggle"
                type="button"
                variant="ghost"
                class="h-9 self-end px-2 text-muted-foreground hover:text-foreground"
                aria-controls="connect-advanced-options"
              >
                <span class="text-xs">Advanced</span>
                <ChevronDown class={`size-4 ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            {/snippet}
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              id="connect-advanced-options"
              align="end"
              sideOffset={8}
              class="z-50 grid w-[min(28rem,calc(100vw-2rem))] gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <div class="space-y-1">
                <p class="text-sm font-medium leading-none">Advanced Connection Options</p>
                <p class="text-xs text-muted-foreground">
                  Tune WebSerial timing and Modbus RTU CRC handling.
                </p>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <Label for="connect-timeout" class="text-xs text-muted-foreground"
                    >Timeout (ms)</Label
                  >

                  <Input
                    id="connect-timeout"
                    type="number"
                    min="0"
                    step="1"
                    value={$timeout.value()}
                    oninput={setNumber(timeout)}
                    {disabled}
                    class="h-9"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="connect-post-timeout-wait" class="text-xs text-muted-foreground">
                    Post-timeout Wait (ms)
                  </Label>

                  <Input
                    id="connect-post-timeout-wait"
                    type="number"
                    min="0"
                    step="1"
                    value={$postTimeoutWaitPeriod.value()}
                    oninput={setNumber(postTimeoutWaitPeriod)}
                    {disabled}
                    class="h-9"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="connect-inter-request-delay" class="text-xs text-muted-foreground">
                    Inter-request Delay (ms)
                  </Label>

                  <Input
                    id="connect-inter-request-delay"
                    type="number"
                    min="0"
                    step="1"
                    value={$interRequestDelay.value()}
                    oninput={setNumber(interRequestDelay)}
                    {disabled}
                    class="h-9"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="connect-crc-policy" class="text-xs text-muted-foreground"
                    >CRC Policy</Label
                  >

                  <Select.Root
                    type="single"
                    value={$crcPolicy.value().mode}
                    onValueChange={(value) => setCrcMode(value as CrcMode)}
                    {disabled}
                  >
                    <Select.Trigger id="connect-crc-policy" class="h-9 w-full capitalize">
                      {$crcPolicy.value().mode}
                    </Select.Trigger>

                    <Select.Content>
                      <Select.Item value="strict">strict</Select.Item>
                      <Select.Item value="resync">resync</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>

                {#if $crcPolicy.value().mode === 'resync'}
                  <div class="flex flex-col gap-1.5">
                    <Label for="connect-max-resync-drops" class="text-xs text-muted-foreground">
                      Max resync drops
                    </Label>

                    <Input
                      id="connect-max-resync-drops"
                      type="number"
                      min="0"
                      step="1"
                      value={maxResyncDropsValue}
                      oninput={setMaxResyncDrops}
                      {disabled}
                      class="h-9"
                    />
                  </div>
                {/if}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </fieldset>

      {#if status.status === 'connected'}
        <Button
          id="connect-disconnect"
          type="button"
          variant="outline"
          class="h-9"
          onclick={onDisconnect}
        >
          Disconnect
        </Button>
      {:else}
        <Button id="connect-submit" type="submit" class="h-9" disabled={!canSubmit}>Connect</Button>
      {/if}
    </form>
  </div>
</header>
