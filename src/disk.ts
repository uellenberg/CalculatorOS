import {TemplateObject} from "logimat";
import {getNum, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {Disk} from "./types/Disk";

/**
 * Registers a disk. Once all the files are written to it, it can be exported with exportDisk.
 * Usage: registerDisk!(name: string, bytes: number);
 */
export const registerDisk: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        outerCheck(context);

        const name = getString(args, state, 0, "A disk name is required!").trim().toLowerCase();
        const size = getNum(args, state, 1, "A disk byte size is required!");

        if(name in state.calculatoros.disks) throw new Error("A disk with the name \"" + name + "\" already exists!");

        state.calculatoros.disks[name] = new Disk(name, size);

        return "";
    }
};