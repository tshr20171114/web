// Copyright (c) 2019 Kichikuou <KichikuouChrome@gmail.com>
// This source code is governed by the MIT License, see the LICENSE file.
import { urlParams } from './util.js';
const major = 240;
let entryCount = 0;
// See xsystem35-sdl2/patch/README.TXT
const PastelChimePatch = [
    [0x1c68, 0x54, 0x47]
];
const TADAModePatch = [
    [0x0087b, 0x40, 0x41],
    [0x01b79, 0x40, 0x41],
    [0x16e5f, 0x24, 0x40],
    [0x16e60, 0xae, 0x92],
    [0x16e61, 0x06, 0x05]
];
export function registerDataFile(fname, size, chunks) {
    let patch = null;
    ;
    switch (fname.toUpperCase()) {
        case 'ぱすてるSA.ALD':
            patch = PastelChimePatch;
            break;
        case '鬼畜王SA.ALD':
            if (urlParams.get('tada') === '1')
                patch = TADAModePatch;
            break;
    }
    let dev = FS.makedev(major, entryCount++);
    let ops = new NodeOps(size, chunks, patch);
    FS.registerDevice(dev, ops);
    FS.mkdev('/' + fname, dev);
}
class NodeOps {
    constructor(size, chunks, patchTbl) {
        this.size = size;
        this.patchTbl = patchTbl;
        this.chunks = chunks;
    }
    read(stream, buffer, offset, length, position) {
        if (buffer !== Module.HEAP8)
            throw new Error('Invalid argument');
        if (this.addr === undefined)
            this.load();
        let src = this.addr + position;
        length = Math.min(length, this.size - position);
        // load() might have invalidated `buffer`, so use Module.HEAP8 directly
        Module.HEAP8.set(Module.HEAPU8.subarray(src, src + length), offset);
        return length;
    }
    llseek(stream, offset, whence) {
        let position = offset;
        if (whence === 1) // SEEK_CUR
            position += stream.position;
        else if (whence === 2) // SEEK_END
            position += this.size;
        return position;
    }
    mmap() {
        if (this.addr === undefined)
            this.load();
        return { ptr: this.addr, allocated: false };
    }
    load() {
        let ptr = this.addr = Module._malloc(this.size);
        for (let c of this.chunks) {
            Module.HEAPU8.set(c, ptr);
            ptr += c.byteLength;
        }
        this.chunks = null;
        this.patch();
    }
    patch() {
        if (!this.patchTbl)
            return;
        for (let a of this.patchTbl) {
            if (Module.HEAPU8[this.addr + a[0]] !== a[1]) {
                console.log('Patch failed');
                return;
            }
        }
        for (let a of this.patchTbl)
            Module.HEAPU8[this.addr + a[0]] = a[2];
        console.log('Patch applied');
        this.patchTbl = null;
    }
}
