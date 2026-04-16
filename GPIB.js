

class GPIB {

    #registry;
    
    #inBuffer;
    #inBufPtr;
    
    #byteToSend;
    #outBuffer;
    #outBufPtr;
    
    #devaddrnow;
    #addrcmdnow;
    
    #eoisig;
    
    #gpibDeviceList;
    

    constructor(loader, rtc, storage) {
    
        this.#registry = [];

        this.#inBuffer = new Uint8Array();     // For reading data in from devices
        this.#inBufPtr = 0;
        
        this.#byteToSend = 0x00;
        this.#outBuffer = [];                   // For sending characters out to devices
        this.#outBufPtr = 0;
        
        this.#devaddrnow = 0;                   // Actual device address being currently being called
        this.#addrcmdnow = 0;                   // LAD/TAD address command currently being called
        
        this.#eoisig = 0;			// EOI signal
        
        this.#gpibDeviceList = [
            ['L', "Program loader"],
            ['R', "Real time clock"],
            ['T', "4924 tape drive"],
            ['P', "Printer"]
        ];
        
    }


// ********** GPIB FUNCTIONS *****

    get poll(){
    	let eoisig = this.#eoisig;		// Do we send with EOI?
console.log("EOI: ", eoisig);
        if (this.#inBuffer && this.#inBuffer.length > 0) {
            if (this.#inBufPtr < this.#inBuffer.length) {
                let c = this.#inBuffer[this.#inBufPtr];
                if ( this.#inBufPtr === (this.#inBuffer.length - 1) ) {
                    this.clearInputBuffer();
                    return([c,eoisig]);   // EOI with last char ?
                }else{
                    this.#inBufPtr++;
                    return([c,0]);
                }           
            }
        }
        return([0xFF, 1]);
    }


    get deviceRegistry(){
        return this.#registry;
    }


    get currentAddr(){
        return this.#devaddrnow;    // GPIB address
    }
    
    
    get currentAddrCmd(){
        return this.#addrcmdnow;    // LAD/TAD
    }


    get byteToSend(){
        return this.#byteToSend;
    }


    get outputBuffer(){
        let buf = this.#outBuffer;
        this.clearOutputBuffer();
        return buf;
    }


    get outputBufferAsStr(){
        let bufStr = "";
        for (let i=0; i<this.#outBuffer.length; i++){
            bufStr += String.fromCharCode(this.#outBuffer[i]);
        }
        this.clearOutputBuffer();
        return bufStr;
    }


    set append(c){
        this.#outBuffer.push(c);
    }


    set inputBuffer(data) {
        this.#inBuffer = data.buffer;  // data = Uint8Array
        this.#eoisig = data.eoi;
        this.#inBufPtr = 0;
    }


    set inputBufferFromStr(data){
        let strlen = data.strtosend.length;
        this.#eoisig = data.eoi;
        let buffer = new Uint8Array(strlen);
        for (let i=0; i<strlen; i++) {
            buffer[i] = data.strtosend.charCodeAt(i);
        }
        this.#inBuffer = buffer;
        this.#inBufPtr = 0;
    }

    
    set sendByte(c){
        this.#byteToSend = c;
    }


    clearInputBuffer(){
        this.#inBuffer = new Uint8Array();
        this.#inBufPtr = 0;
        this.#eoisig = 0;
    }


    clearOutputBuffer(){
        this.#outBuffer = [];
        this.#outBufPtr = 0;
    }


    register(addr, deviceobj, description) {    // Register devices
        if (addr>0 && addr<32) {
            let registration = [addr, deviceobj, description];
            let registered = 0;

            // Check whether registration already exists. If it does then ignore.
            for (let reginstance in this.#registry) {
                let regaddr = reginstance[0];
                if (regaddr === addr) registered = 1;
            }
            if (!registered) this.#registry.push(registration);
        }
    }


    unregister(addr){
        // Check whether registration already exists. If it does then remove it.
        for (let i=0; i<this.#registry.length; i++) {
            let regaddr = this.#registry[i][0];
            if (regaddr === addr) this.#registry.splice(i, 1);
        }
    }


    call(priAddr, secAddr){ // Call GPIB device @ priAddr with command in secAddr 
        let addr = 0;
        if ( (priAddr > 0x20) && (priAddr < 0x40) ) addr = priAddr - 0x20;
        if ( (priAddr > 0x40) && (priAddr < 0x60) ) addr = priAddr - 0x40;
//console.log("Called: ", addr, "with command: ", secAddr);         
        for (let i=0; i<this.#registry.length; i++) {
            if (addr === this.#registry[i][0]) {            
                let device = this.#registry[i][1];
                this.#devaddrnow = addr;
                this.#addrcmdnow = priAddr;
                device.call(secAddr, this);                                                
            }
        }   
    }




// ********** GPIB DIALOGUE FUNCTIONS **********


    initDialog(){
        this.fillGpibAddrSelect();
        this.fillGpibDeviceSelect();
    }


    showGpibDialog(){
        let gpibDialog = document.getElementById('gpibDialog');
        this.genDeviceList();    
        gpibDialog.style.display="block";
    }
    
    
    hideGpibDialog(){
        let gpibDialog = document.getElementById('gpibDialog');
        gpibDialog.style.display="none";
    }


    fillGpibAddrSelect(){
        let gpibAddrSelect = document.getElementById('gpibAddrSelect');
        for (let i=1; i<32; i++){
            let opt = document.createElement('option');
            opt.textContent = String(i);
            opt.value = i;
            gpibAddrSelect.appendChild(opt);
        }
    }


    fillGpibDeviceSelect(){
        let gpibDevSelect = document.getElementById('gpibDevSelect');
        for (let i=0; i<this.#gpibDeviceList.length; i++){
            let opt = document.createElement('option');
            opt.textContent = this.#gpibDeviceList[i][1];
            opt.value = this.#gpibDeviceList[i][0];
            gpibDevSelect.appendChild(opt);
        }
    }


    deviceConnect(){
        let gpibAddrSelect = document.getElementById('gpibAddrSelect');
        let gpibDevSelect = document.getElementById('gpibDevSelect');
        
        let addr = parseInt(gpibAddrSelect.value);
        let devtype = gpibDevSelect.value;
        let devdesc = gpibDevSelect[gpibDevSelect.selectedIndex].text;
		
		// If device already exists then exit
		for (let i=0; i<this.#registry.length; i++) {
            let regaddr = this.#registry[i][0];
            if (regaddr === addr) return;
        }

        let regdevobj = document.getElementById('regdev');
        regdevobj.value = String(addr + ':' + devtype + ':' + devdesc);
        regdevobj.onchange();

        this.genDeviceList(); 

    }


    deviceRemove(){
        let gpibAddrSelect = document.getElementById('gpibAddrSelect');
        let addr = parseInt(gpibAddrSelect.value);
        this.unregister(addr);
        this.genDeviceList();
    }


    genDeviceList(){
        let viewer = document.getElementById('deviceViewer');
        viewer.value = "";
        for (let i=0; i<this.#registry.length; i++){
            let addr = this.#registry[i][0];
            let desc = this.#registry[i][2];
            let line = addr + ": " + desc + "\n";
            viewer.value += line;
        }
    }


}

//module.exports = GPIB;


