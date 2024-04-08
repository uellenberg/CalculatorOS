import {Disk} from "./Disk";
import {Memory} from "./Memory";

export interface TemplateState {
    calculatoros: {
        disks: Record<string, Disk>;
        memory: Record<string, Memory>;
    }
}