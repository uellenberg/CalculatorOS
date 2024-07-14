import {TemplateObject} from "logimat";
import {ensureState, getBlock, getNum, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {Disk} from "./types/Disk";
import {fromManyBytes} from "./types/Float";
import {Memory} from "./types/Memory";
import {BYTES_PER_FLOAT} from "./index";

/**
 * Registers a memory. It can be exported with exportMemory.
 * Usage: registerMemory!(name: string, bytes: number);
 */
export const registerMemory: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const name = getString(args, state, 0, "A memory name is required!").trim().toLowerCase();
        const size = getNum(args, state, 1, "A memory byte size is required!");

        if(name in state.calculatoros.memory) throw new Error("A memory with the name \"" + name + "\" already exists!");

        state.calculatoros.memory[name] = new Memory(name, size);

        return "";
    }
};

/**
 * Exports a memory.
 * Usage: exportMemory!(name: string);
 */
export const exportMemory: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);
        outerCheck(context);

        const name = getString(args, state, 0, "A memory name is required!").trim().toLowerCase();

        if(!(name in state.calculatoros.memory)) throw new Error("A memory with the name \"" + name + "\" does not exist!");

        return state.calculatoros.memory[name].export();
    }
};

/**
 * Repeats a statement for each piece of memory data, replacing
 * MEMID with the ID of the memory data list.
 * Usage: memoryDataForEach!(name: string, code: Block);
 */
export const memoryDataForEach: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        ensureState(state);

        const name = getString(args, state, 0, "A memory name is required!").trim().toLowerCase();
        const code = getBlock(args, state, 1, "A piece of code to run is required!");

        if(!(name in state.calculatoros.memory)) throw new Error("A memory with the name \"" + name + "\" does not exist!");

        const numArrays = Math.max(1, Math.ceil(state.calculatoros.memory[name].size / BYTES_PER_FLOAT / 10_000));

        let out = "";

        for (let i = 0; i < numArrays; i++){
            out += code.replaceAll("MEMID", i.toString());
        }

        return out;
    }
};