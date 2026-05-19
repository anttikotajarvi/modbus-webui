/**
 * Import the current parser etc. from here to avoid issues where
 *  we are referencing an outdated version of the storage.
 */
export * from "./snapshots/v2"
import type { Versioned } from "@/sys/generic/versioning";
import type { V2Library } from "./current";
import type { Unbrand } from "@/types/brand";
import type { LibraryData } from "../types";
import type { Equal, Expect } from "@/types/generic";
type _check_LibraryData = Expect<Equal<V2Library, Unbrand<LibraryData>>> 
type CurrentLibrary = LibraryData;
export type { CurrentLibrary }
export type CurrentVersion = Versioned<typeof STORAGE_VERSION, CurrentLibrary>;
export const STORAGE_VERSION = 2 as const;
