
export type ProfileTag = Brand<string, "ProfileTag">;
export const asProfileTag = (id: string): ProfileTag => id as ProfileTag;

export type NametableTag = Brand<string, "NametableTag">;
export const asNametableTag = (id: string): NametableTag => id as NametableTag;

// -------------------------------------------------
// Library
// -------------------------------------------------
export type LibraryData = {
  nametables: Record<NametableTag, Nametable>;
  profiles: Record<ProfileTag, ProfileData>;
  activeProfileTag: ProfileTag | null;
};

// -------------------------------------------------
// Profile / Configuration
// -------------------------------------------------
import type { WebSerialConfig } from "modbus-webserial";
import type { WriteQuery } from "../modbus";
import type { Brand } from "@/types/brand";
export type ConnectionSettings = {
  deviceId: number;
  options: Required<WebSerialConfig>;
};
export type PanelKind = "read_coils" | "read_holding_registers" | "write_registers" | "write_coils";
export type PanelLayoutItem = any; 

export type ProfileConfiguration = {
  activeNametable: NametableTag | null;
  layout?: PanelLayoutItem[];
  connectionSettings: ConnectionSettings;
  writeShortcuts: Record<string, WriteQuery>;
  updatedAt: number;
};

export type ProfileData = ProfileConfiguration;
export const SCRATCH_ID = asProfileTag("__scratch__");


// -------------------------------------------------
// Nametables
// -------------------------------------------------
export type NametableCategory = "iregs" | "hregs" | "coils" | "dinputs";

export type Nametable = {
  iregs: Map<number, string>;
  hregs: Map<number, string>;
  coils: Map<number, string>;
  dinputs: Map<number, string>;
};

