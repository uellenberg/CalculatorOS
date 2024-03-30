import {expressionCheck, getString} from "./util";
import {TemplateState} from "./types/TemplateState";
import {TemplateObject} from "logimat";
import {fromManyBytes} from "./types/Float";

/**
 * Converts a string into an array of bytes.
 * Usage: string!(value: string);
 */
export const string: TemplateObject = {
    function: (args, state: TemplateState, context) => {
        expressionCheck(context);

        const value = getString(args, state, 0, "A value is required!").trim().toLowerCase();

        return JSON.stringify(fromManyBytes(value.split("").map(char => char.charCodeAt(0)), 0));
    }
};