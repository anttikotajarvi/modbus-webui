import type { ConnectionSettings } from "@/sys/library/types"
import type { ConnectStatus } from "@/types/comp"
import type { Ref } from "@/util/ref"
import { ModbusRTU } from "modbus-webserial"
import type { SvimmerReader } from "svimmer-store"

export function performConnect(
  clientRef: Ref<ModbusRTU | null>,
  conn: ConnectStatus,
  settings: SvimmerReader<ConnectionSettings>,
) {
  conn.status = 'connecting'
  conn.msg = 'Connecting...'
  const { deviceId, options } = settings.value()

  ModbusRTU.openWebSerial(options)
    .then((client) => {
      client.setID(deviceId)
      conn.status = 'connected'
      conn.msg = 'Connected successfully'
      const { usbVendorId, usbProductId } = client.getPort().getInfo()
      conn.msg += ` (USB Vendor ID: ${usbVendorId}, Product ID: ${usbProductId})`

      clientRef.set(client)
    })
    .catch((err) => {
      conn.status = 'disconnected'
      conn.error = true
      conn.msg = `Connection failed: ${err.message}`
    })
}

export function performDisconnect(clientRef: Ref<ModbusRTU | null>, conn: ConnectStatus) {
  const client = clientRef.get()
  if (client) {
    client
      .close()
      .then(() => {
        clientRef.set(null)
        conn.status = 'disconnected'
        conn.msg = ''
      })
      .catch((err) => {
        conn.error = true
        conn.msg = `Disconnection failed: ${err.message}`
      })
  }
}
