import {ensureState, expressionCheck, getBlock, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {TemplateObject} from "logimat";
import {fromManyBytes} from "./types/Float";

/**
 * Converts a string into an array of bytes.
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