import SuperJSON, { type SuperJSONResult } from 'superjson'
import type { LibSerializer, VersionedParser } from '../types'
import { z } from 'zod/v4-mini'
import type { JSONValue } from 'node_modules/superjson/dist/types'
import { ok, resErr } from '@/types/generic'

export const V2Parser: VersionedParser<V2Library, 2> = (blob: JSONValue) => {
  let obj
  try {
    const data = (blob as any).data
    obj = SuperJSON.deserialize<JSONValue>(data as object as SuperJSONResult)
  } catch (e) {
    return resErr(new Error('Deserialization failed.', { cause: e }))
  }
  const { success, data, error } = librarySchema.safeParse(obj)
  if (!success) {
    return resErr(new Error('Failed to parse object.', { cause: error.cause }))
  }

  const versioned = {
    version: 2 as const,
    data,
  }
  return ok(versioned)
}

export const V2Serializer:LibSerializer<V2Library> = (lib) => {
  try {
    const out = SuperJSON.serialize(lib) as object as JSONValue
    return ok(out)
  } catch(e:any) {
    return resErr(new Error("Internal error: Failed to serialize library.", {cause: e}))
  }
}

export type V2Library = z.infer<typeof librarySchema>
// -------------------------------------------------
// Schemas
// -------------------------------------------------

// modbus-webserial 0.11.2 schema
export const crcPolicySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('strict'),
  }),
  z.object({
    mode: z.literal('resync'),
    maxResyncDrops: z.number(),
  }),
])

const webSerialConfigSchema = z.object({
  baudRate: z.uint32(),
  dataBits: z.union([z.literal(7), z.literal(8)]),
  stopBits: z.union([z.literal(1), z.literal(2)]),
  parity: z.literal(['none', 'even', 'odd']),
  timeout: z.number(),
  crcPolicy: crcPolicySchema,
  postTimeoutWaitPeriod: z.number(),
  interRequestDelay: z.number(),
})
const connectionSettingsSchema = z.object({
    deviceId: z.uint32(),
    options: webSerialConfigSchema,
  });

export const writeQuerySchema = z.object({
  type: z.enum(['write_coils', 'write_registers']),
  address: z.number().check(z.int()),
  values: z.union([z.array(z.number()), z.array(z.boolean())]), // number[] | boolean[]
})

const nametable = z.object({
  iregs: z.map(z.number(), z.string()),
  hregs: z.map(z.number(), z.string()),
  coils: z.map(z.number(), z.string()),
  dinputs: z.map(z.number(), z.string()),
})
const nametables = z.record(z.string(), nametable)

const profile = z.object({
  activeNametable: z.union([z.string(), z.null()]),
  layout: z.optional(z.array(z.any())),
  connectionSettings: connectionSettingsSchema,
  writeShortcuts: z.record(z.string(), writeQuerySchema),
  updatedAt: z.int(),
})
const librarySchema = z.object({
  nametables,
  profiles: z.record(z.string(), profile),
  activeProfileTag: z.union([z.string(), z.null()]),
})
