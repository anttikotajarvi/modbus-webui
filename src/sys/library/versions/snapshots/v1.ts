import { z } from "zod/v4-mini";
import type { LibSerializer, VersionedParser } from "../types";
import { resErr, ok } from "@/types/generic";
import type { Versioned } from "@/sys/generic/versioning";
import type { JSONValue } from "node_modules/superjson/dist/types";



export type V1Library = {
  nametables: Record<string, NametableSet>;
  profiles: Record<string, Configuration>;
  activeProfileTag: string | null;
}
export const V1Parser: VersionedParser<V1Library, 1> = (blob:JSONValue) => {
  const blobType = typeof blob;
  if(typeof blob !== "object") {
    return resErr(new Error(`Invalid blob type. Expected object got '${blobType}'.`));
  } 

  // Validate
  const {data, error, success} = SerializableLibrarySchema.safeParse(blob)
  if(!success) return resErr(error);

  // Unserialize
  const v1Lib = fromSerializable(data) as V1Library;

  // Check active profile
  if(v1Lib.activeProfileTag && !v1Lib.profiles[v1Lib.activeProfileTag]) {
    v1Lib.activeProfileTag = null;
  }
  
  // Wrap
  const versioned = {
    version: 1,
    data: v1Lib
  } as Versioned<1, V1Library>;

  return ok(versioned)
}

export const V1Serializer:LibSerializer<V1Library> = (lib) => {
  return ok(toSerializable(lib) as JSONValue)
};


/** 
 * Legacy definitions.
 * - Too bad this code still has to be shipped. 
 * - The serializable format is validated only, so those 
 *   types need to be defined as schemas.
 */ 

export function fromSerializable(_obj: SerializableLibrary): V1Library {
  const obj = structuredClone(_obj); // Ensure we don't mutate the original
  const nametables: Record<string, NametableSet> = {};
  for (const [tag, t] of Object.entries(obj.nametables)) {
    nametables[tag] = {
      updatedAt: t.updatedAt,
      names: fromSerializableNameBucketMap(t.names),
    };
  }
  return {
    nametables,
    profiles: obj.profiles,
    activeProfileTag: obj.activeProfileTag ?? null,
  };
}
export function toSerializable(lib: V1Library): SerializableLibrary {
  const nametables: Record<string, SerializableNametableSet> = {};
  for (const [id, t] of Object.entries(lib.nametables)) {
    nametables[id] = {
      updatedAt: t.updatedAt,
      names: toSerializableNameBucketMap(t.names),
    };
  }
  return {
    nametables,
    profiles: lib.profiles,
    activeProfileTag: lib.activeProfileTag ?? null,
  };
}
export function fromSerializableNameBucketMap(_obj: {
  [K in keyof NameBucketMap]: [number, string][];
}): NameBucketMap {
  const obj = structuredClone(_obj); // Ensure we don't mutate the original
  return {
    iregs: new Map<number, string>(obj.iregs),
    hregs: new Map<number, string>(obj.hregs),
    coils: new Map<number, string>(obj.coils),
    dinputs: new Map<number, string>(obj.dinputs),
  };
}
export function toSerializableNameBucketMap(map: NameBucketMap): { [K in keyof NameBucketMap]: [number, string][] } {
  return {
    iregs: Array.from(map.iregs.entries()),
    hregs: Array.from(map.hregs.entries()),
    coils: Array.from(map.coils.entries()),
    dinputs: Array.from(map.dinputs.entries()),
  };
}

// -------------------------------------------------
// Nametable stuff
// -------------------------------------------------

/* NameBucketMap */
type NameBucketMap = {
  iregs: Map<number, string>;
  hregs: Map<number, string>;
  coils: Map<number, string>;
  dinputs: Map<number, string>;
};

/* Serializable NameBucketMap */
const SerializableNameBucketMapSchema = z.object({
  iregs: z.array(z.tuple([z.number(), z.string()])),
  hregs: z.array(z.tuple([z.number(), z.string()])),
  coils: z.array(z.tuple([z.number(), z.string()])),
  dinputs: z.array(z.tuple([z.number(), z.string()])),
});

type NametableSet = {
  updatedAt: number;
  names: NameBucketMap;
};

/* Serializable NametableSet */
const SerializableNametableSetSchema = z.object({
  updatedAt: z.number(),
  names: SerializableNameBucketMapSchema,
});

type SerializableNametableSet = z.infer<typeof SerializableNametableSetSchema>
// -------------------------------------------------
// Connection
// -------------------------------------------------
const ConnectionSettingsSchema = z.object({
  deviceId: z.number(),
  options: z.object({
    baudRate: z.number(),
    dataBits: z.number().check(z.int()),
    parity: z.enum(["none", "even", "odd"]),
    stopBits: z.number().check(z.int()),
  }),
});

// -------------------------------------------------
// Panel layout (future)
// -------------------------------------------------
type PanelLayoutItem = any; // matches z.any() below
const PanelLayoutItemSchema:z.ZodMiniType<PanelLayoutItem> = z.object({
  unknown: z.any(), // Placeholder for future layout
});

// -------------------------------------------------
// Configuration / profile
// -------------------------------------------------
const writeQuerySchema = z.object({
  type: z.enum(['write_coils', 'write_registers']),
  address: z.number().check(z.int()),
  values: z.union([z.array(z.number()), z.array(z.boolean())]), // number[] | boolean[]
})
const ConfigurationSchema = z.object({
  nametableSetId: z.nullable(z.string()),
  layout: z.optional(z.array(PanelLayoutItemSchema)), // Placeholder for future layout
  connectionSettings: ConnectionSettingsSchema,
  writeShortcuts: z.record(z.string(), writeQuerySchema),
  updatedAt: z.number(),
});
type Configuration = z.infer<typeof ConfigurationSchema>

// -------------------------------------------------
// Library
// -------------------------------------------------
const SerializableLibrarySchema = z.object({
  nametables: z.record(z.string(), SerializableNametableSetSchema),
  profiles: z.record(z.string(), ConfigurationSchema),
  activeProfileTag: z.nullable(z.string()),
});
type SerializableLibrary = z.infer<typeof SerializableLibrarySchema>;
