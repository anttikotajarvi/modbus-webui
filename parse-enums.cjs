#!/usr/bin/env node

/***************************************************************************
 * parseEnums.js  → outputs SerializableNameBucketMap
 *
 * Result shape:
 * {
 *   iregs:  [[0, "First IReg"],    [1, "Second IReg"]],
 *   hregs:  [[0, "First HReg"],    [1, "Second HReg"]],
 *   coils:  [[0, "First Coil"],    [1, "Second Coil"]],
 *   dinputs:[[0, "First DInput"],  [1, "Second DInput"]]
 * }
 ***************************************************************************/

const fs = require("fs");
const path = require("path");

/* -------------------------------------------------------------------------
 * CONFIGURATION
 * ------------------------------------------------------------------------- */

// You can pass a file path as argv[2]; otherwise it uses the default below.
const SOURCE_FILE = process.argv[2] || "/home/antti/repos/co2c-s1/modbus.h";

// Enum names to parse:
const DISCRETE_INPUTS_ENUM_NAME = "LOCAL_DISCRETE_INPUTS";
const COILS_ENUM_NAME           = "LOCAL_COILS";
const HOLDING_REGISTER_ENUM_NAME= "LOCAL_HOLDING_REGISTERS";
const INPUT_REGISTER_ENUM_NAME  = "LOCAL_INPUT_REGISTERS";

/* -------------------------------------------------------------------------
 * 1) Read file
 * ------------------------------------------------------------------------- */

let fileContents;
try {
  fileContents = fs.readFileSync(SOURCE_FILE, "utf8");
} catch (err) {
  console.error(`Error reading file "${SOURCE_FILE}":`, err.message);
  process.exit(1);
}

/* -------------------------------------------------------------------------
 * 2) Parse a single enum block by name → return array of [addr:number, name]
 * ------------------------------------------------------------------------- */

function parseEnumBlockToPairs(text, enumName) {
  // Capture contents inside:  enum <enumName> { ... };
  const regex = new RegExp(`enum\\s+${enumName}\\s*\\{([^}]*)\\};`, "m");
  const match = text.match(regex);
  if (!match) return [];

  const enumBlock = match[1];
  const lines = enumBlock.split("\n");

  /** @type {[number,string][]} */
  const pairs = [];

  for (let raw of lines) {
    let line = raw.trim();
    if (!line) continue;

    // strip inline comments
    line = line.replace(/\/\/.*$/, "");       // // comment
    line = line.replace(/\/\*.*?\*\//g, "");  // /* comment */

    if (!line) continue;
    if (!line.includes("=")) continue; // skip implicit enums (not address-based)

    // Examples:
    //   NAME = 0x0000,
    //   NAME = 0x0000 // comment
    //   NAME = 123,
    //   NAME = 123 /* comment */
    const mHex = line.match(/^([A-Za-z_]\w*)\s*=\s*(0x[0-9A-Fa-f]+)\s*,?/);
    const mDec = !mHex && line.match(/^([A-Za-z_]\w*)\s*=\s*([0-9]+)\s*,?/);

    if (mHex) {
      const name = mHex[1];
      const addr = parseInt(mHex[2], 16);
      if (Number.isFinite(addr)) pairs.push([addr, name]);
      continue;
    }
    if (mDec) {
      const name = mDec[1];
      const addr = parseInt(mDec[2], 10);
      if (Number.isFinite(addr)) pairs.push([addr, name]);
      continue;
    }
    // otherwise ignore this line
  }

  // Sort by address ascending for stable output
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs;
}

/* -------------------------------------------------------------------------
 * 3) Build SerializableNameBucketMap
 * ------------------------------------------------------------------------- */

function buildSerializableNameBucketMap() {
  const dinputs = parseEnumBlockToPairs(fileContents, DISCRETE_INPUTS_ENUM_NAME);
  const coils   = parseEnumBlockToPairs(fileContents, COILS_ENUM_NAME);
  const hregs   = parseEnumBlockToPairs(fileContents, HOLDING_REGISTER_ENUM_NAME);
  const iregs   = parseEnumBlockToPairs(fileContents, INPUT_REGISTER_ENUM_NAME);

  return { iregs, hregs, coils, dinputs };
}

/* -------------------------------------------------------------------------
 * 4) Execute and write output
 * ------------------------------------------------------------------------- */

const nameBucket = buildSerializableNameBucketMap();
const out = JSON.stringify(nameBucket, null, 2);
const outFile = path.join(__dirname, "serializable-namebucket.json");
fs.writeFileSync(outFile, out, "utf8");
console.log(`Wrote ${outFile}`);
