import {BYTES_PER_FLOAT} from "../index";
import {fromManyBytes} from "./Float";
import {padList} from "../util";

export class Disk {
    /** File Name -> Bytes */
    public files: Record<string, number[]> = {};
    public name: string;
    public size: number;
    public locked: boolean;

    public constructor(name: string, size: number) {
        this.name = name;
        this.size = size;
    }

    public export() : string {
        // The disk looks like this:
        // - A disk table list, containing blocks of BYTES_PER_FLOAT * 10
        //   for the name, plus BYTES_PER_FLOAT * 5 for an ordered list of blocks.
        //   Each block has an ID of 2 bytes (0-65535). Each block is prefixed by a
        //   0 or a 1 to designate whether it's filled or not. Therefore, empty blocks
        //   can be found by checking every k*(10 + 5 + 1).
        // - A series of disk data lists, enough to meet the requested size.
        //   Each block is BYTES_PER_FLOAT * 100 bytes long. Therefore, the ID
        //   can be multiplied by 100 (and have 1 added to it, due to Desmos),
        //   in order to get the starting point of the block.
        // - An occupied blocks list, which stores the block IDs as numbers,
        //   so each item in the list is a single ID.
        const HEADER_NAME_SIZE = 10;
        const HEADER_BLOCKS_SIZE = 5;
        const HEADER_SIZE = 1 + HEADER_NAME_SIZE + HEADER_BLOCKS_SIZE;

        const BLOCK_SIZE = 100;

        const table = [];
        const data = [];
        const occupiedIDs = [];

        let nextBlockID = 0;

        for(const fileName in this.files) {
            const bytes = this.files[fileName];

            const nameEncoded = padList(fromManyBytes(fileName.split("").map(char => char.charCodeAt(0)), 0), HEADER_NAME_SIZE);
            if(nameEncoded.length !== HEADER_NAME_SIZE) throw new Error(fileName + " exceeds the maximum name length!");

            table.push(1);
            table.push(...nameEncoded);

            const tableIDs = [];

            const requiredBlocks = Math.ceil(bytes.length / (BLOCK_SIZE * BYTES_PER_FLOAT));
            for(let i = 0; i < requiredBlocks; i++) {
                const blockID = nextBlockID++
                occupiedIDs.push(blockID);

                // Block IDs are represented as two bytes.
                // The first byte is just a whole number multiple of 256,
                // and the second is the remainder.
                tableIDs.push(Math.floor(blockID / 256));
                tableIDs.push(blockID % 256);

                data.push(...padList(bytes.slice(BLOCK_SIZE * i, BLOCK_SIZE * (i + 1)), BLOCK_SIZE));
            }

            table.push(...padList(fromManyBytes(tableIDs, 0), HEADER_BLOCKS_SIZE));
        }

        // Now, the above arrays contain the actual content that will appear
        // in Desmos, but they need to be split and formatted.
        let out = "";

        out += `export const d_isk_${this.name}_header = ${JSON.stringify(padList(table))};\n`;
        out += `export const d_isk_${this.name}_ids = ${JSON.stringify(padList(occupiedIDs))};\n`;

        // If we're above the requested size, then that's fine, we just need to
        // use that size instead.
        const requestedSize = Math.ceil(this.size / BYTES_PER_FLOAT / 10_000);
        const actualSize = Math.ceil(data.length / 10_000);
        const numDataArrays = Math.max(requestedSize, actualSize);

        for(let i = 0; i < numDataArrays; i++) {
            out += `export const d_isk_${this.name}_data_${i} = ${JSON.stringify(padList(data.slice(10_000 * i, 10_000 * (i + 1))))};\n`;
        }

        // TODO: Add functions for interacting with disks.

        return out;
    }
}