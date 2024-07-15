import {TemplatesObject} from "logimat";
import {addFileBytes, addFileString, diskDataForEach, exportDisk, registerDisk} from "./disk";
import {allocString, char, forEachChar, string, stringRaw} from "./string";
import {exportMemory, memoryDataForEach, registerMemory} from "./memory";

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
    diskDataForEach,
    registerMemory,
    exportMemory,
    memoryDataForEach,
    string,
    stringRaw,
    char,
    forEachChar,
    allocString,
};