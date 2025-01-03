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
        const HEADER_BLOCKS_SIZE = 2;
        const HEADER_SIZE = 1 + HEADER_NAME_SIZE + HEADER_BLOCKS_SIZE;

        const BLOCK_SIZE = 10;

        const table = [];
        const data = [];
        const occupiedIDs = [];

        // Block IDs start at 1 so that we can use 0 to indicate
        // no block.
        let nextBlockID = 1;

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

        out += `createBehavior!("disk_${this.name}", {
        setDefaultDisplay!({ display folder = "Storage (LAG)"; });
        
        setItemName!("d_isk_${this.name}_header");
        setVal!("d_isk_${this.name}_header", { ${JSON.stringify(table)} });
        setMut!("d_isk_${this.name}_header");
        
        setItemName!("d_isk_${this.name}_ids");
        setVal!("d_isk_${this.name}_ids", { ${JSON.stringify(occupiedIDs)} });
        setMut!("d_isk_${this.name}_ids");`;

        // If we're above the requested size, then that's fine, we just need to
        // use that size instead.
        const requestedSize = Math.ceil(this.size / BYTES_PER_FLOAT / 10_000);
        const actualSize = Math.ceil(data.length / 10_000);
        // Make sure there's at least one array.
        const numDataArrays = Math.max(requestedSize, actualSize, 1);

        for(let i = 0; i < numDataArrays; i++) {
            out += `setItemName!("d_isk_${this.name}_data_${i}");
            setVal!("d_isk_${this.name}_data_${i}", { ${JSON.stringify(data.slice(10_000 * i, 10_000 * (i + 1)))} });
            setMut!("d_isk_${this.name}_data_${i}");`;
        }

        out += `display folder = "Storage (LAG)";
        display hidden = true;
        export function d_isk_${this.name}_array(i_ndex) {`;
        if(numDataArrays === 1) out += `d_isk_${this.name}_data_0`;
        else {
            out += "const a_rray_num = floor(i_ndex / 10000);";

            for(let i = 0; i < numDataArrays; i++) {
                if(i === 0) {
                    out += `if(a_rray_num == ${i}) { d_isk_${this.name}_data_${i} }`;
                } else if(i === numDataArrays - 1) {
                    out += `else { d_isk_${this.name}_data_${i} }`;
                } else {
                    out += `else if(a_rray_num == ${i}) { d_isk_${this.name}_data_${i} }`;
                }
            }
        }
        out += "}";

        // Get the right index to read from.
        // This always needs to start at 1, so
        // we need to do this correction.
        // Also, this is inline because it's a really simple function.
        out += `inline function d_isk_${this.name}_index(i_ndex) {
            1 + mod(i_ndex - 1, 10000)
        }`;

        out += `
        display folder = "Storage (LAG)";
        display hidden = true;
        export function d_isk_${this.name}_read(i_ndex) {
            d_isk_${this.name}_array(i_ndex)[d_isk_${this.name}_index(i_ndex)]
        }
        
        inline const DISK_${this.name}_HEADER_NAME_SIZE = ${HEADER_NAME_SIZE};
        define!(DISK_${this.name}_HEADER_NAME_SIZE, ${HEADER_NAME_SIZE});
        
        inline const DISK_${this.name}_HEADER_BLOCKS_SIZE = ${HEADER_BLOCKS_SIZE};
        define!(DISK_${this.name}_HEADER_BLOCKS_SIZE, ${HEADER_BLOCKS_SIZE});
        
        inline const DISK_${this.name}_HEADER_SIZE = ${HEADER_SIZE};
        define!(DISK_${this.name}_HEADER_SIZE, ${HEADER_SIZE});
        
        inline const DISK_${this.name}_BLOCK_SIZE = ${BLOCK_SIZE};
        define!(DISK_${this.name}_BLOCK_SIZE, ${BLOCK_SIZE});`;

        out += "});";

        return out;
    }
}