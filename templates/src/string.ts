import {ensureState, expressionCheck, getBlock, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {TemplateObject} from "logimat";
import {fromManyBytes} from "./types/Float";
import {BYTES_PER_FLOAT} from "./index";
import {MEMORY_BLOCK_SIZE} from "./types/Memory";

/**
 * Converts a string into an array of bytes (encoded as floats).
 * Usage: string!(value: string);
 */
export const string: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        expressionCheck(context);

        const value = getString(args, state, 0, "A value is required!");

        return JSON.stringify(fromManyBytes(value.split("").map(char => char.charCodeAt(0)), 0));
    }
};

/**
 * Converts a string into an array of bytes.
 * Usage: stringRaw!(value: string);
 */
export const stringRaw: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        expressionCheck(context);

        const value = getString(args, state, 0, "A value is required!");

        return JSON.stringify(value.split("").map(char => char.charCodeAt(0)));
    }
};

/**
 * Repeats a piece of code for each character in a string.
 * Any occurrences of "CHAR" are string-replaced with the character,
 * and any occurrences of "CHARCODE" are replaced with the character's code.
 * If the character is a quote or backslash, it will be escaped.
 * Usage: forEachChar!(characters: string, code: Block);
 */
export const forEachChar: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const characters = getString(args, state, 0, "A character list is required!");
        const code = getBlock(args, state, 1, "A piece of code to run is required!");
        const separator = getString(args, state, 2) || "\n";
        const before = getString(args, state, 3) || "";
        const after = getString(args, state, 4) || "";

        let out = "";

        const split = characters.split("");
        for (let i = 0; i < split.length; i++){
            const character = split[i];
            const escapedChar = character === "\"" || character === "\\" ? "\\" + character : character;

            out += code.replaceAll("CHARCODE", character.charCodeAt(0).toString()).replaceAll("CHAR", escapedChar);
            if(i !== split.length - 1) out += separator;
        }

        return before + out + after;
    }
};

/**
 * Allocates a string in memory, setting variables for its
 * address, length, and capacity.
 * The variable names for each of these need to be given as strings.
 * These variables must exist prior to running the template.
 * Usage: allocString!(str: string, addrVar: string, lengthVar: string, capVar: string);
 */
export const allocString: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const str = getString(args, state, 0, "A string to allocate is required!");
        const addrVar = getString(args, state, 1, "An address variable is required!");
        const lengthVar = getString(args, state, 1, "A length variable is required!");
        const capVar = getString(args, state, 1, "A capacity variable is required!");

        // We need to determine the number of floats to allocate, rounded up to the
        // memory block size.
        // Each float can hold BYTES_PER_FLOAT characters.
        const numFloats = Math.ceil((str.length / BYTES_PER_FLOAT) / MEMORY_BLOCK_SIZE) * MEMORY_BLOCK_SIZE;

        let out = `
            ${capVar} = ${numFloats};
            ${lengthVar} = ${str.length};
            m_alloc(${numFloats}, &${addrVar});
        `;

        const encodedFloats = fromManyBytes(str.split("").map(char => char.charCodeAt(0)), 0);
        for(const idx in encodedFloats) {
            const encodedFloat = encodedFloats[idx];

            out += `w_rite(${addrVar}, ${idx}, ${encodedFloat});`
        }

        return out;
    }
};