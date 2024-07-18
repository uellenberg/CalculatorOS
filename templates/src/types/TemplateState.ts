import {Disk} from "./Disk";
import {Memory} from "./Memory";
import {stringJumpFast} from "../string";

export interface TemplateState {
    calculatoros: {
        disks: Record<string, Disk>;
        memory: Record<string, Memory>;
        stringJumpFastVar: number,
    }
}