import {TemplateObject} from "logimat";
import {ensureState, getBlock, getNum, getString, outerCheck} from "./util";
import {TemplateState} from "./types/TemplateState";
import {Disk} from "./types/Disk";
import {fromManyBytes} from "./types/Float";
import {Memory} from "./types/Memory";

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