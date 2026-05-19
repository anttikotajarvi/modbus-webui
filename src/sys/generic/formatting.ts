
const HEX = (n: number, width = 2) => `0x${n.toString(16).toUpperCase().padStart(width, '0')}`;
const groupBits = (s: string, size = 4, sep = '_') =>
    s.replace(new RegExp(`(.{${size}})(?=.)`, 'g'), `$1${sep}`);

const BINg = (n: number, bits = 16, group = 4, sep = '_') => {
    const raw = ((n & ((2 ** bits) - 1)) >>> 0).toString(2).padStart(bits, '0');
    return `0b${groupBits(raw, group, sep)}`;
};

export { HEX, BINg };