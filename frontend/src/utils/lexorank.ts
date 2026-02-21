/**
 * Client-side LexoRank implementation.
 * Matches the backend Python algorithm for consistent rank computation.
 */

const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyz';
const BASE = CHARSET.length; // 36

function parse(rank: string): string {
    let r = rank;
    if (r.startsWith('0|')) r = r.slice(2);
    if (r.endsWith(':')) r = r.slice(0, -1);
    return r;
}

function encode(value: number, length: number = 6): string {
    if (value === 0) return CHARSET[0].repeat(length);

    const result: string[] = [];
    let v = value;
    while (v > 0) {
        result.push(CHARSET[v % BASE]);
        v = Math.floor(v / BASE);
    }
    result.reverse();
    let encoded = result.join('');

    if (encoded.length < length) {
        encoded = CHARSET[0].repeat(length - encoded.length) + encoded;
    }

    return encoded;
}

function decode(s: string): number {
    let result = 0;
    for (const char of s) {
        result = result * BASE + CHARSET.indexOf(char);
    }
    return result;
}

export function lexoRankBetween(
    before: string | null,
    after: string | null
): string {
    if (!before && !after) {
        return '0|hzzzzz:';
    }

    if (!before) {
        const afterVal = parse(after!);
        const afterInt = decode(afterVal);
        let newInt = Math.floor(afterInt / 2);
        if (newInt === 0) newInt = 1;
        let newVal = encode(newInt, afterVal.length);
        if (newVal >= afterVal) {
            newVal = afterVal + 'i';
        }
        return `0|${newVal}:`;
    }

    if (!after) {
        const beforeVal = parse(before);
        const beforeInt = decode(beforeVal);
        const maxInt = Math.pow(BASE, beforeVal.length) - 1;
        let newInt = beforeInt + Math.floor((maxInt - beforeInt) * 3 / 4);
        if (newInt <= beforeInt) newInt = beforeInt + 1;
        let newVal = encode(newInt, beforeVal.length);
        if (newVal <= beforeVal) {
            newVal = beforeVal + 'i';
        }
        return `0|${newVal}:`;
    }

    const beforeVal = parse(before);
    const afterVal = parse(after);

    const maxLen = Math.max(beforeVal.length, afterVal.length);
    const beforePadded = beforeVal.padEnd(maxLen, CHARSET[0]);
    const afterPadded = afterVal.padEnd(maxLen, CHARSET[0]);

    const beforeInt = decode(beforePadded);
    const afterInt = decode(afterPadded);

    const midInt = Math.floor((beforeInt + afterInt) / 2);
    let midVal = encode(midInt, maxLen);

    if (midVal <= beforePadded || midVal >= afterPadded) {
        midVal = beforeVal + 'i';
    }

    return `0|${midVal}:`;
}
