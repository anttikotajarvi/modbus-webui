// system.ts — core types + helpers for NameTables and Configurations (dummy-ready)
// Keep this file framework-agnostic; App.svelte owns state & persistence.

import type { WebSerialOptions } from "modbus-webserial";
import type { ReadFunction, readFunctions, ReadQuery, WriteFunction, WriteQuery } from "./panels";

export type TAG = string;

export type NameTableCategory = "iregs" | "hregs" | "coils" | "dinputs";

export type NameBucketMap = {
  iregs: Map<number, string>;
  hregs: Map<number, string>;
  coils: Map<number, string>;
  dinputs: Map<number, string>;
};

export const nameTableCategoryFromFunctionType: Record<WriteFunction | ReadFunction, NameTableCategory> = {
  read_input_registers: "iregs",
  read_holding_registers: "hregs",
  read_coils: "coils",
  read_discrete_inputs: "dinputs",
  write_registers: "hregs",
  write_coils: "coils",
};
export const resolveAddressName = (query: WriteQuery | ReadQuery, nts: NameTableSet): string | null => {
 const NameTableCategory = nameTableCategoryFromFunctionType[query.type];
 const name = nts.names[NameTableCategory].get(query.address);
 return name ?? null;
};

export type NameTableSet = {
  updatedAt: number;
  names: NameBucketMap; // four maps
};

export type ConnectionSettings = {
    deviceId: number;
    options: WebSerialOptions;
}

// Future-proof: you can add layout later (panel types / positions)
export type PanelKind = "read_coils" | "read_holding_registers" | "write_registers" | "write_coils";
export type PanelLayoutItem = { tag: TAG; kind: PanelKind; props?: Record<string, unknown> };

export type Configuration = {
 // Which NameTableSet is active for this config
  nameTableSetId: TAG | null;
  // Placeholder for future layout
  layout?: PanelLayoutItem[];
  connectionSettings: ConnectionSettings;
  writeShortcuts: Record<string, WriteQuery>;
  updatedAt: number;
};
export const defaultConfiguration: Configuration = {
    nameTableSetId: null,
    layout: [],
    connectionSettings: {
        deviceId: 1,
        options: { // Default 8N1
            baudRate: 9600,
            dataBits: 8,
            parity: "none",
            stopBits: 1,
        },
    },
    writeShortcuts: {},
    updatedAt: Date.now(),
};
export const SCRATCH_ID: TAG = "__scratch__";

export type Library = {
  nameTables: Record<TAG, NameTableSet>;
  profiles: Record<TAG, Configuration>;
  activeProfileTag: TAG | null; // for status bar text
};

// ---------- Constructors ----------
export function createEmptyNameTableSet(): NameTableSet {
  return {
    updatedAt: Date.now(),
    names: {
      iregs: new Map<number, string>(),
      hregs: new Map<number, string>(),
      coils: new Map<number, string>(),
      dinputs: new Map<number, string>(),
    },
  };
}
export function createEmptyLibrary(): Library {
  return {
    nameTables: {},
    profiles: {},
    activeProfileTag: null,
  };
}

// ---------- Pure updaters (return new objects; caller sets state) ----------
export function upsertNameTableSet(lib: Library, tag: TAG, nts: NameTableSet): Library {
  return {
    ...lib,
    nameTables: { ...lib.nameTables, [tag]: { ...nts, updatedAt: Date.now() } },
   };
}

export function deleteNameTableSet(lib: Library, tag: TAG): Library {
    if (!lib.nameTables[tag]) {
      // ensure it exists
      return lib;
    }
    const next = { ...lib };
    delete next.nameTables[tag];
    return next;
}

export function upsertProfile(lib: Library, tag: TAG, cfg: Configuration): Library {
    return {
        ...lib,
        profiles: { ...lib.profiles, [tag]: { ...cfg, updatedAt: Date.now() } },
    };
}

export function deleteProfile(lib: Library, tag: TAG): Library {

    if(!lib.profiles[tag]) {
        // ensure it exists
        return lib;
    }
    const next = { ...lib };
    delete next.profiles[tag];
    return next;
}

export function setActiveProfile(lib: Library, tag: TAG | null): Library {
  return { ...lib, activeProfileTag: tag ?? null };
}

// ---------- Serialization helpers (Map <-> JSON) ----------

export type SerializableNameBucketMap = {
    iregs: [number, string][];
    hregs: [number, string][];
    coils: [number, string][];
    dinputs: [number, string][];
};
export type SerializableNameTableSet = Omit<NameTableSet, "names"> & {
  names: SerializableNameBucketMap;
};

export type SerializableLibrary = Omit<Library, "nameTables"> & {
  nameTables: Record<TAG, SerializableNameTableSet>;
};

export function toSerializableNameBucketMap(map: NameBucketMap): { [K in keyof NameBucketMap]: [number, string][] } {
  return {
    iregs: Array.from(map.iregs.entries()),
    hregs: Array.from(map.hregs.entries()),
    coils: Array.from(map.coils.entries()),
    dinputs: Array.from(map.dinputs.entries()),
  };
}
export function fromSerializableNameBucketMap(obj: { [K in keyof NameBucketMap]: [number, string][] }): NameBucketMap {
  return {
    iregs: new Map<number, string>(obj.iregs),
    hregs: new Map<number, string>(obj.hregs),
    coils: new Map<number, string>(obj.coils),
    dinputs: new Map<number, string>(obj.dinputs),
  };
}
export function toSerializable(lib: Library): SerializableLibrary {
  const nameTables: Record<TAG, SerializableNameTableSet> = {};
  for (const [id, t] of Object.entries(lib.nameTables)) {
    nameTables[id] = {
        updatedAt: t.updatedAt,
        names: toSerializableNameBucketMap(t.names)
    };
  }
  return {
    nameTables,
    profiles: lib.profiles,
    activeProfileTag: lib.activeProfileTag ?? null,
  };
}

export function fromSerializable(obj: SerializableLibrary): Library {
  const nameTables: Record<TAG, NameTableSet> = {};
  for (const [tag, t] of Object.entries(obj.nameTables)) {
    nameTables[tag] = {
      updatedAt: t.updatedAt,
      names: fromSerializableNameBucketMap(t.names)
    };
  }
  return {
    nameTables,
    profiles: obj.profiles,
    activeProfileTag: obj.activeProfileTag ?? null,
  };
}

// ---------- Optional localStorage helpers (caller can ignore) ----------
const STORAGE_KEY = "modbus:library:v1";

export function saveLibrary(lib: Library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSerializable(lib)));
  } catch {}
}

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLibrary();
    return fromSerializable(JSON.parse(raw));
  } catch {
    console.log("Failed to load library from localStorage, returning empty library.");
    return createEmptyLibrary();
  }
}
