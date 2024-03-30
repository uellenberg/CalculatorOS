import {TemplateArgs, TemplateBlock, TemplateContext} from "logimat";
import {TemplateState} from "./types/TemplateState";

export const ensureState = (state: TemplateState) => {
    if (!state.hasOwnProperty("calculatoros")) state.calculatoros = {disks: {}};
};

//Context checks

export const outerCheck = (context: TemplateContext) : void => {
    if(context !== TemplateContext.OuterDeclaration) throw new Error("This can only be ran from outside of any functions.");
};

export const expressionCheck = (context: TemplateContext) : void => {
    if(context !== TemplateContext.Expression) throw new Error("This can only be ran from within an expression.");
};

export const outerInnerCheck = (context: TemplateContext) : void => {
    if(context === TemplateContext.Expression) throw new Error("This cannot be ran from within an expression.");
}

//Arg checks

export const getNum = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : number => {
    if(args.length < idx+1 || args[idx] == null || typeof(args[idx]) !== "number" || isNaN(<number>args[idx])) {
        if(error) throw new Error(error);
        else return null;
    }
    return <number>args[idx];
};

export const getBoolean = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : boolean => {
    if(args.length < idx+1 || args[idx] == null || typeof(args[idx]) !== "boolean") {
        if(error) throw new Error(error);
        else return false;
    }
    return <boolean>args[idx];
};

export const getString = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : string => {
    if(args.length < idx+1 || args[idx] == null || typeof(args[idx]) !== "string") {
        if(error) throw new Error(error);
        else return null;
    }
    return <string>args[idx];
};

export const getAnyAsString = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : string => {
    if(args.length < idx+1 || args[idx] == null) {
        if(error) throw new Error(error);
        else return null;
    }
    return args[idx].toString();
};

export const getNumOrStringOrBlock = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : string | number | TemplateBlock => {
    if(args.length < idx+1 || args[idx] == null || (typeof(args[idx]) != "string" && typeof(args[idx]) != "number" && (typeof(args[idx]) != "object" || !args[idx]["block"]))) {
        if(error) throw new Error(error);
        else return null;
    }

    return <string | number | TemplateBlock>args[idx];
};

export const getBlock = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : string => {
    if(args.length < idx+1 || args[idx] == null || typeof(args[idx]) !== "object" || !args[idx]["block"]) {
        if(error) throw new Error(error);
        else return null;
    }
    return <string>args[idx]["value"];
};

export const getNumOrBlock = (args: TemplateArgs, state: TemplateState, idx: number, error: string = null) : string => {
    if(args.length < idx+1 || args[idx] == null || ((typeof(args[idx]) != "object" || !args[idx]["block"]) && typeof(args[idx]) != "number")) {
        if(error) throw new Error(error);
        else return null;
    }

    if(typeof(args[idx]) === "number") return args[idx].toString();
    return "{" + args[idx]["value"] + "}";
};

// List helpers

/**
 * Pads a list to a certain number of elements, appending zeros where needed.
 */
export function padList<T>(list: T[], length = 10_000) : T[] {
    const out = Array(length).fill(0);
    for(let i = 0; i < list.length; i++) {
        out[i] = list[i];
    }

    return out;
}