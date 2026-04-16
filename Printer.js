
class Printer {

    #printerobj;
    #page;
    
    constructor(){
    
        this.#printerobj;
        this.#page;    
    }
    

    call(addr, gpibobj) {
        if (addr == 0x6C) this.print(gpibobj);
    
    }


    print(gpibobj) {
        if ( (!this.#printerobj) || (this.#printerobj.closed) ) this.show();
        let output = String.fromCharCode(...gpibobj.outputBuffer);
        this.#page.innerHTML += output;
    }


    show(){
        let pname = "Printer@" + gpib.currentAddr;
        this.#printerobj = window.open('', pname, "width=600,height=600,directories=0,toolbar=0,location=0,menubar=0");
        this.#printerobj.document.write("<html><head><title>");
        this.#printerobj.document.write(pname);
        this.#printerobj.document.write("</title></head><body>");
        this.#printerobj.document.write("<style>div{font-family: monospace; font-size: 1.5em; white-space: pre;}</style>");
        this.#printerobj.document.write("<div id='printer'></div></body></html>");
        this.#page = this.#printerobj.document.getElementById('printer');
        this.#page.innerHTML += "<pre>";
    }


}

//module.exports = RTC;


