import {TemplatesObject} from "logimat";
import {addFileBytes, addFileString, exportDisk, registerDisk} from "./disk";
import {forEachChar, string, stringRaw} from "./string";
import {exportMemory, registerMemory} from "./memory";

export const BYTES_PER_FLOAT = 6;

export const templates: TemplatesObject = {
    calculatorInit: {
        function() {
            return `
                inline const BYTES_PER_FLOAT = 6;
            `;
        }
    },
    registerDisk,
    addFileString,
    addFileBytes,
    exportDisk,
    registerMemory,
    exportMemory,
    string,
    stringRaw,
    forEachChar,
};