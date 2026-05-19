import type { ConnectionSettings } from '@/sys/library/types'
import type { ConnectStatus } from '@/types/comp'
import type { Ref } from '@/util/ref'
import { ModbusRTU } from 'modbus-webserial'
import type { SvimmerReader } from 'svimmer-store'
import { useAlert } from '@/ui/alert/context'

const alert = useAlert()
// Only invoked on disconnect by the device
let handleDisconnect = null as null | ((e: Event) => void)

export function performConnect(
  clientRef: Ref<ModbusRTU | null>,
  conn: ConnectStatus,
  settings: SvimmerReader<ConnectionSettings>,
) {
  // Create disconnect handler
  if (!handleDisconnect)
    handleDisconnect = (_e: Event) => {
      conn.status = 'disconnected'
      conn.error = false
      conn.msg = 'Connection lost'
    }

  conn.status = 'connecting'
  conn.msg = 'Connecting...'
  const { deviceId, options } = settings.value()

  ModbusRTU.openWebSerial(options)
    .then((client) => {
      client.setID(deviceId)
      conn.status = 'connected'
      conn.error = false
      conn.msg = 'Connected successfully'
      const { usbVendorId, usbProductId } = client.getPort().getInfo()
      conn.msg += ` (USB Vendor ID: ${usbVendorId}, Product ID: ${usbProductId})`

      clientRef.set(client)
      
      // Bind disconnect listener
      client.getPort().ondisconnect = handleDisconnect
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      conn.status = 'disconnected'
      conn.error = true
      conn.msg = `Connection failed: ${msg}`
      alert.error('Connection failed', msg)
    })
}

export function performDisconnect(clientRef: Ref<ModbusRTU | null>, conn: ConnectStatus) {
  const client = clientRef.get()
  if (client) {

    client.getPort().removeEventListener("disconnect", handleDisconnect!);

    client
      .close()
      .then(() => {
        clientRef.set(null)
        conn.status = 'disconnected'
        conn.error = false
        conn.msg = 'Disoconnected by user.'
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err)
        conn.error = true
        conn.msg = `Disconnection failed: ${msg}`
        alert.error('Disconnection failed', msg)
      })
  }
}
