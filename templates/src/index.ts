import {TemplatesObject} from "logimat";
import {addFileBytes, addFileString, exportDisk, registerDisk} from "./disk";
import {string} from "./string";

export const BYTES_PER_FLOAT = 6;

export const templates: TemplatesObject = {
    registerDisk,
    addFileString,
    addFileBytes,
    exportDisk,
    string,
};