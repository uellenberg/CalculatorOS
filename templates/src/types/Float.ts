import {BYTES_PER_FLOAT} from "../index";

export function toBytes(float: number, buffer: number[]) {
    for(let i = 0; i < BYTES_PER_FLOAT; i++) {
        // Base 256 to extract bytes.
        buffer.push(getDigitBase(float, i, 256));
    }
}

export function toManyBytes(floats: number[], buffer: number[]) {
    for(const float of floats) {
        toBytes(float, buffer);
    }
}

export function fromBytes(buffer: number[], readOffset: number) : number {
    let num = 0;
    for(let i = 0; i < BYTES_PER_FLOAT; i++) {
        num += (buffer[readOffset + i] || 0) * (256 ** (BYTES_PER_FLOAT - i - 1));
    }

    return num;
}

export function fromManyBytes(buffer: number[], readOffset: number) : number[] {
    const numFloats = Math.ceil(buffer.length / BYTES_PER_FLOAT);

    let out = [];
    for(let i = 0; i < numFloats; i++) {
        out.push(fromBytes(buffer, readOffset + i * BYTES_PER_FLOAT));
    }

    return out;
}

/**
 * Extracts the nth digit (starting at 0) from a number in a specific base.
 * The first input is the number and the second is the place of the digit.
 */
function getDigitBase(num: number, digit: number, base: number) : number {
    // We know the length is always BYTES_PER_FLOAT, so we can use it directly
    // here.
    // This is required to make leading zeros work correctly.
    const pt1 = num/(base ** (BYTES_PER_FLOAT-digit-1));
    const pt2 = num/(base ** (BYTES_PER_FLOAT-digit));

    return Math.floor(pt1-Math.floor(pt2)*base);
}