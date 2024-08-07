import {TemplateObject} from "logimat";
import {ensureState, getBlock, getNum, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {Disk} from "./types/Disk";
import {fromManyBytes} from "./types/Float";
import {BYTES_PER_FLOAT} from "./index";

/**
 * Registers a disk. Once all the files are written to it, it can be exported with exportDisk.
 * Usage: registerDisk!(name: string, bytes: number);
 */
export const registerDisk: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const name = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();
        const size = getNum(args, state, 1, "A disk byte size is required!");

        if(name in state.calculatoros.disks) throw new Error("A disk with the name \"" + name + "\" already exists!");

        state.calculatoros.disks[name] = new Disk(name, size);

        return "";
    }
};

/**
 * Adds a file to the disk.
 * Usage: addFileString!(disk: string, name: string, data: string);
 */
export const addFileString: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const disk = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();
        const name = getString(args, state, 1, "A file name is required!");
        const data = getString(args, state, 2, "Disk data is required!");

        if(!(disk in state.calculatoros.disks)) throw new Error("A disk with the name \"" + disk + "\" does not exist!");
        if(state.calculatoros.disks[disk].locked) throw new Error("Disk \"" + disk + "\" has already been exported!");

        state.calculatoros.disks[disk].files[name] = fromManyBytes(data.split("").map(char => char.charCodeAt(0)), 0);

        return "";
    }
};

/**
 * Adds a file to the disk.
 * The data CANNOT be the return value of a template.
 * Usage: addFileBytes!(disk: string, name: string, data: number[]);
 */
export const addFileBytes: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const disk = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();
        const name = getString(args, state, 1, "A file name is required!");
        const data = JSON.parse(getBlock(args, state, 2, "Disk data is required!")) as number[];

        if(!(disk in state.calculatoros.disks)) throw new Error("A disk with the name \"" + disk + "\" does not exist!");
        if(state.calculatoros.disks[disk].locked) throw new Error("Disk \"" + disk + "\" has already been exported!");

        state.calculatoros.disks[disk].files[name] = data;

        return "";
    }
};

/**
 * Exports a disk.
 * Once this is run, no more files can be added to the disk.
 * Usage: exportDisk!(name: string);
 */
export const exportDisk: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const name = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();

        if(!(name in state.calculatoros.disks)) throw new Error("A disk with the name \"" + name + "\" does not exist!");

        state.calculatoros.disks[name].locked = true;
        return state.calculatoros.disks[name].export();
    }
};

/**
 * Repeats a statement for each piece of disk data, replacing
 * DISKID with the ID of the disk data list.
 * Usage: diskDataForEach!(name: string, code: Block);
 */
export const diskDataForEach: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const name = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();
        const code = getBlock(args, state, 1, "A piece of code to run is required!");

        if(!(name in state.calculatoros.disks)) throw new Error("A disk with the name \"" + name + "\" does not exist!");

        const numArrays = Math.max(1, Math.ceil(state.calculatoros.disks[name].size / BYTES_PER_FLOAT / 10_000));

        let out = "";

        for (let i = 0; i < numArrays; i++){
            out += code.replaceAll("DISKID", i.toString());
        }

        return out;
    }
};