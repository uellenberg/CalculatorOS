import {Disk} from "./Disk";

export interface TemplateState {
    calculatoros: {
        disks: Record<string, Disk>;
    }
}