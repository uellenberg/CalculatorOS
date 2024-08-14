import {ensureState, expressionCheck, getAnyAsString, getBlock, getString} from "./util";
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
 * Returns the number of characters in a string.
 * Usage: stringLen!(value: string);
 */
export const stringLen: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        expressionCheck(context);

        const value = getString(args, state, 0, "A value is required!");

        // Ensure that this length matches the other string methods,
        // so split it first.
        return value.split("").length.toString();
    }
};

/**
 * Converts a character into a byte.
 * Usage: char!(value: string);
 */
export const char: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        expressionCheck(context);

        const value = getString(args, state, 0, "A value is required!");

        return value.charCodeAt(0).toString();
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
 * Returns a piece of code with a certain string replaced by
 * another one.
 * Usage: replace!(find: string, replace: string, code: Block);
 */
export const replace: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const find = getAnyAsString(args, state, 0, "A search string is required!");
        const replace = getAnyAsString(args, state, 1, "A replace string is required!");
        const code = getBlock(args, state, 2, "A piece of code to run is required!");

        return code.replaceAll(find, replace);
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
        const lengthVar = getString(args, state, 2, "A length variable is required!");
        const capVar = getString(args, state, 3, "A capacity variable is required!");

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

/**
 * Creates an optimized jump to several pieces of code based on
 * the value of a string.
 * This is guaranteed to work for all specified values but may incorrectly
 * jump to a non-specified value instead of going to the noMatch case if
 * the string is too close to one of the values.
 * In all likelihood, noMatch will not be called.
 * For example, if only a single value is given, this will just run the code specified.
 * The string's pointer and length values must be given as string variable names.
 * Usage: stringJumpFast!(strPtr: string, strLen: string, ...(value?: string, valueCase?: Block), noMatch?: Block);
 */
export const stringJumpFast: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const numPreArgs = 2;
        const strPtr = getString(args, state, 0, "A string pointer to check if required!");
        const strLen = getString(args, state, 1, "A string length to check if required!");

        const checkPairs: {value: string, block: string}[] = [];

        let handledArgs = 0;
        // i + 1 is used here because both value and block must be in bounds.
        for(let i = numPreArgs; (i + 1) < args.length; i+=2) {
            const value = getString(args, state, i, "Expected a string value to check!");
            const block = getBlock(args, state, i+1, "Expected a block to run!");

            // This is invalid (for reasons mentioned below).
            if(value === "") {
                throw new Error("Empty strings are not valid values!");
            }

            checkPairs.push({value, block});

            handledArgs+=2;
        }

        if(handledArgs === 0) {
            throw new Error("At least one test value must be given!");
        }

        // If there's still another arg, it means we have a noMatch case.
        const noMatch = (numPreArgs + handledArgs) < args.length ? getBlock(args, state, numPreArgs + handledArgs, "Expected a no match block to run!") : null;

        const readVarName = "stringJumpFastRead" + state.calculatoros.stringJumpFastVar++;

        // The search algorithm is constructed as follows:
        // - If the string is zero length, then run the no match handler.
        // - Perform a binary search on each unique block prefix.
        //   This is the float with BYTES_PER_FLOAT encoded in it.
        //   If that prefix is unique, then run the handler.
        //   Otherwise, if one of the values using the prefix is
        //   the length of the check (in other words, it is the prefix itself),
        //   then use that for the length check. Otherwise, just use noMatch.
        //   Do the exact same binary search but this time on the second block.
        //   If it still isn't unique, repeat.
        const mergeAndSortAscPrefixes = (values: {floatValues: number[], code: string}[]) : {prefix: number, rest: number[][], code: string[]}[] => {
            const prefixMap: Record<string, {rest: number[][], code: string[]}> = {};

            for(const value of values) {
                const prefix = value.floatValues[0];
                const rest = value.floatValues.slice(1);

                if(!(prefix in prefixMap)) {
                    prefixMap[prefix] = {rest: [], code: []};
                }

                prefixMap[prefix].rest.push(rest);
                prefixMap[prefix].code.push(value.code);
            }

            const valuesArr = Object.entries(prefixMap).map(([prefix, data]) => ({prefix: Number(prefix), rest: data.rest, code: data.code}));

            valuesArr.sort((a, b) => a.prefix > b.prefix ? 1 : -1);

            return valuesArr;
        };

        const binarySearch = (values: {prefix: number, rest: number[][], code: string[]}[], left: number, right: number, readPos: number, firstForPos: boolean) : string => {
            // If we're not searching through anything, then just fall through
            // to the check below.
            if(values.length === 1) {
                left = 0;
                right = 0;
            }

            if(left === right || right < left) {
                // If there's only a single code for this prefix, then we
                // can run it.
                // Otherwise, we'll need to start a new binary search using the next prefix
                // as the first item in rest (for each value using this prefix).
                const prefixData = values[left];
                if(prefixData.code.length === 1) {
                    return prefixData.code[0];
                }

                const newValues = prefixData.rest.map((rest, i) => ({floatValues: rest, code: prefixData.code[i]}));
                const mergedNewValues = mergeAndSortAscPrefixes(newValues);

                return binarySearch(mergedNewValues, 0, mergedNewValues.length - 1, readPos + 1, true);
            }

            // If we're the first piece of code that's touching this position, then we
            // need to read it in first before the code below will be valid.
            // We also need to do a bounds check here to prevent undefined behavior.
            let outPrefix = "";
            let outPostfix = "";
            if(firstForPos) {
                outPrefix = `if(${readPos} < ceil(${strLen}/BYTES_PER_FLOAT)) {
                r_ead(${strPtr}, ${readPos}, &${readVarName});`;
                outPostfix = `}` + (noMatch ? `else { ${noMatch} } ` : "");
            }

            // We can just use a simple comparison if there are two.
            if(right - left === 1) {
                return outPrefix + `if(${readVarName} == ${values[left].prefix}) { ${binarySearch(values, left, left, readPos, false)} } else { ${binarySearch(values, right, right, readPos, false)} }` + outPostfix;
            }

            const middle = Math.floor((right - left) / 2) + left;
            return outPrefix + `if(${readVarName} < ${values[middle].prefix}) { ${binarySearch(values, left, middle - 1, readPos, false)} } else { ${binarySearch(values, middle, right, readPos, false)} }` + outPostfix;
        };

        // Now, we need to convert the given values into floats and feed them into
        // the binary search above.
        const values = checkPairs.map(pair => ({floatValues: fromManyBytes(pair.value.split("").map(char => char.charCodeAt(0)), 0), code: pair.block}));
        const mergedValues = mergeAndSortAscPrefixes(values);

        return `stackvar ${readVarName};
${binarySearch(mergedValues, 0, mergedValues.length - 1, 0, true)}`;
    }
};