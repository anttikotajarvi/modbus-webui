import { type Migration, type Versioned } from "@/sys/generic/versioning";
import type { V1Library } from "../snapshots/v1";
import { asNametableTag, asProfileTag, type LibraryData, type NametableTag, type ProfileTag } from "../../types";
import { createEmptyLibrary, defaultConnectionSettings } from "../../defaults";

export const migrate1to2: Migration<1, V1Library, 2, LibraryData> = {
  from: 1,
  to: 2,
  migrate: (value: Versioned<1, V1Library>) => {
    const lib = createEmptyLibrary(); // Scratch is ensured here

    /* Nametables */
    Object.entries(value.data.nametables).forEach(([id, nts]) => {
      lib.nametables[asNametableTag(id)] = structuredClone(nts.names)
    })

    /* Profiles */
    Object.entries(value.data.profiles).forEach(([id, profile]) => {
      /**
       * Normalize connections settings.
       * - The V1 schema defined dataBits and stopBits as integers so have to 
       *   normalize them to 7 | 8 and 1 | 2 respectively.  Technically
       *   the V1 schema could be changed to enforce this but it might 
       *   lead to some previously valid libraries to not pass the current 
       *   V1 parsing step. 
       */
      const options = defaultConnectionSettings().options
      {
        const { baudRate, dataBits, parity, stopBits } = profile.connectionSettings.options;
        options.baudRate = baudRate;
        if([7, 8].includes(dataBits)) {
          options.dataBits = dataBits as 7 | 8
        }
        options.parity = parity;
        if([1, 2].includes(stopBits)) {
          options.stopBits = stopBits as 1 | 2
        }
      }

      lib.profiles[asProfileTag(id)] = {
        activeNametable: profile.nametableSetId as NametableTag | null,
        layout: structuredClone(profile.layout),
        connectionSettings: {
          deviceId: profile.connectionSettings.deviceId,
          options
        },
        writeShortcuts: structuredClone(profile.writeShortcuts),
        updatedAt: profile.updatedAt
      }
    })

    /* Active profile */
    lib.activeProfileTag = value.data.activeProfileTag as ProfileTag | null;
    
    return {
      version: 2,
      data: lib
    }
  }
}
