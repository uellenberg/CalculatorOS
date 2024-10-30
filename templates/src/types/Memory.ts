import {BYTES_PER_FLOAT} from "../index";

export const MEMORY_BLOCK_SIZE = 5;

export class Memory {
    public name: string;
    public size: number;

    public constructor(name: string, size: number) {
        this.name = name;
        this.size = size;
    }

    public export() : string {
        // The memory looks like this:
        // - A memory table list, containing blocks of BYTES_PER_FLOAT * 5 for an ordered list of blocks.
        //   Each block has an ID of 2 bytes (0-65535). Each block is prefixed by a
        //   0 or a 1 to designate whether it's filled or not. Therefore, empty blocks
        //   can be found by checking every k*(5 + 1).
        // - A series of memory data lists, enough to meet the requested size.
        //   Each block is BYTES_PER_FLOAT * 100 bytes long. Therefore, the ID
        //   can be multiplied by 100 (and have 1 added to it, due to Desmos),
        //   in order to get the starting point of the block.
        // - An occupied blocks list, which stores the block IDs as numbers,
        //   so each item in the list is a single ID.
        const HEADER_BLOCKS_SIZE = 2;
        const HEADER_SIZE = 1 + HEADER_BLOCKS_SIZE;

        // Now, generate the data and helpers for the memory.
        let out = "";

        out += `createBehavior!("memory_${this.name}", {
        setDefaultDisplay!({ display folder = "Memory (LAG)"; });

        setItemName!("m_emory_${this.name}_header");
        setVal!("m_emory_${this.name}_header", { [] });
        setMut!("m_emory_${this.name}_header");

        setItemName!("m_emory_${this.name}_ids");
        setVal!("m_emory_${this.name}_ids", { [] });
        setMut!("m_emory_${this.name}_ids");`;

        const requestedSize = Math.max(1, Math.ceil(this.size / BYTES_PER_FLOAT / 10_000));

        for(let i = 0; i < requestedSize; i++) {
            out += `setItemName!("m_emory_${this.name}_data_${i}");
            setVal!("m_emory_${this.name}_data_${i}", { [] });
            setMut!("m_emory_${this.name}_data_${i}");`;
        }

        out += `display folder = "Memory (LAG)";
        display hidden = true;
        export function m_emory_${this.name}_array(i_ndex) {`;
        if(requestedSize === 1) out += `m_emory_${this.name}_data_0`;
        else {
            out += "const a_rray_num = floor(i_ndex / 10000);";

            for(let i = 0; i < requestedSize; i++) {
                if(i === 0) {
                    out += `if(a_rray_num == ${i}) { m_emory_${this.name}_data_${i} }`;
                } else if(i === requestedSize - 1) {
                    out += `else { m_emory_${this.name}_data_${i} }`;
                } else {
                    out += `else if(a_rray_num == ${i}) { m_emory_${this.name}_data_${i} }`;
                }
            }
        }
        out += "}";

        // Get the right index to read from.
        // This always needs to start at 1, so
        // we need to do this correction.
        // Also, this is inline because it's a really simple function.
        out += `inline function m_emory_${this.name}_index(i_ndex) {
            1 + mod(i_ndex - 1, 10000)
        }

        display folder = "Memory (LAG)";
        display hidden = true;
        export function m_emory_${this.name}_read(i_ndex) {
            m_emory_${this.name}_array(i_ndex)[m_emory_${this.name}_index(i_ndex)]
        }

        inline const MEMORY_${this.name}_HEADER_BLOCKS_SIZE = ${HEADER_BLOCKS_SIZE};
        define!(MEMORY_${this.name}_HEADER_BLOCKS_SIZE, ${HEADER_BLOCKS_SIZE});

        inline const MEMORY_${this.name}_HEADER_SIZE = ${HEADER_SIZE};
        define!(MEMORY_${this.name}_HEADER_SIZE, ${HEADER_SIZE});

        inline const MEMORY_${this.name}_BLOCK_SIZE = ${MEMORY_BLOCK_SIZE};
        define!(MEMORY_${this.name}_BLOCK_SIZE, ${MEMORY_BLOCK_SIZE});`;

        out += "});";

        return out;
    }
}