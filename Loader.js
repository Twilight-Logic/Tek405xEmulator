
class Loader {

    #prog;

    constructor() {
        this.prog = new Uint8Array();
    }


    call(addr, gpibobj) {
        
        if (addr == 0x64) this.load(gpibobj);
    
    }


    get progSize() {
        return this.prog.length;
    }


    loadFrom(bytes) {
        this.#prog = new Uint8Array(bytes);
    }


    load(gpibobj) {
        gpibobj.inputBuffer = this.#prog;
    }

}

//module.exports = RTC;


