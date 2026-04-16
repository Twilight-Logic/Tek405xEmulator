// Tek 4051 Emulator Storage Script
// 10-12-2023


const fileTypes = [
    {idx:'A',type:'ASCII'},
    {idx:'B',type:'BINARY'},
    {idx:'N',type:'NEW'},
    {idx:'L',type:'LAST'}
]; 


const fileUsages = [
    {idx:'P',usage:'PROG'},
    {idx:'D',usage:'DATA'},
    {idx:'L',usage:'LOG'},
    {idx:'T',usage:'TEXT'}
]; 


const fileNameLength = 46;    // Including CR and NULL
const SIGEOI = 1;             // Signal EOI on last character
const NOEOI = 0;              // Do not send EOI signal

//function Storage() {

class Storage {

    #fileBuffer;
    #fileBufPtr;
    #filesPerDirectory;
    #dirNamePrefix;
    #writeClrFlg;



    constructor () {
    
        this.fstore = new fileStore();    

        this.#filesPerDirectory = 254;
        this.#dirNamePrefix = "Tape";
        this.currentTekFile = new tFile();
        this.#fileBuffer = new Uint8Array();
        this.#fileBufPtr = 0;
        this.writeClrFlg = false;

    }
    

    call(addr, gpibobj) {
//console.log("Called: ", addr);
        switch(addr) {        
            case 0x61:  this.gpibSave(gpibobj); break;
            case 0x62:  this.gpibClose(); break;
            case 0x64:  this.gpibOld(gpibobj); break;
            case 0x66:  this.gpibType(gpibobj); break;            
            case 0x69:  this.gpibDir(gpibobj); break;
            case 0x6C:  this.gpibPrint(gpibobj); break;
            case 0x6D:  this.gpibInput(gpibobj); break;
            case 0x6E:  this.gpibRead(gpibobj); break;   
            case 0x6F:  this.gpibWrite(gpibobj); break;
            case 0x71:  this.gpibBPL(gpibobj); break; // BSAVE & BOLD
            case 0x73:  this.gpibList(gpibobj); break;
            case 0x7B:  this.gpibFind(gpibobj); break;        
        }
    
    }


    // Save a file to storage
    saveFile(){

        let filelistobj = document.getElementById('fileList');
        let fileNumObj = document.getElementById('fileNum');
        let filenum = parseInt(fileNumObj.value);

        // If the filenum is not defined or out of range then set to zero
        if ( !filenum || (filenum>this.#filesPerDirectory) ) filenum = 0;

        // If value is zero (no file number set) then prompt for one
        while (filenum == 0) {

            let nextfnum = fstore.nextFileNum;
            let result;

            if (nextfnum) {
                result = prompt("Please provide a file number (max. " + this.#filesPerDirectory + "):", nextfnum);
                if (!result) return;   // Cancelled so exit!
                filenum = parseInt(result);
                if (filenum>this.#filesPerDirectory) filenum = 0;
            }else{
                // No available next file number found
                alert("Unable to save. No free file numbers available!");
                return;
            }
        }

        // If we have a file number then Save the file
        if (filenum) {

            let file = new tFile();
            let header = this.getFileMarkedState(filenum);
            file.header = header;
            file.content = this.currentTekFile.content;
            this.fstore.saveFile(file);
            
            this.clearFileSelectControl();
            this.updateFileSelectList();
            this.selectCurrentFile(filenum.toString());
        }
    }


    // Retrieve a file from storage
    loadFile(){
        // Get the selected file number
        let fileListObj = document.getElementById('fileList');
        if (fileListObj.selectedIndex>-1) {
            let fileNumStr = fileListObj.options[fileListObj.selectedIndex].text;
            // Update the file number field
            let fileNumObj = document.getElementById('fileNum');
            fileNumObj.value = fileNumStr;
            // Load the file
            if (fileNumStr != "") {
                this.selectCurrentFile(fileNumStr);
            }else{
                alert("File number required!");
            }
            
        }
    }


    // Remove file from storage
    deleteFile(){
        let fileListObj = document.getElementById('fileList');
        let fileNumObj = document.getElementById('fileNum');
        let fnumStr;
        let fnum;
        if (fileListObj.selectedIndex>-1){
            fnumStr = fileListObj.options[fileListObj.selectedIndex].text;
        }else{
            fnumStr = fileNumObj.value;
        }
        fnum = parseInt(fnumStr);
        if ( (fnum>0) && this.fstore.exists(fnum) ) { 
            if (confirm("Delete existing file?")){
                this.fstore.delFile(fnum);
                this.clearFileSelectControl();
                this.setControlsToDefault();
                this.updateFileSelectList();
            }else{

                alert("Nothing to delete!");
            }
        }else{
            alert("Select a file number to delete!");
        }
    }


    // Select file for upload to Tek when 'Select' button clicked
    // OLD@1: called from the emulator then loads the file into the emulator
    selectTekFile(){
        // Get the currently selected file number
        let fnumstr = document.getElementById('fileNum').value;
        // If itd not null...    
        if (fnumstr != "") {
            upload_to_tek(this.fstore.getContent(parseInt(fnumstr)));
            this.hideStorageDialog();
        }
    }


    // Clear the file viewer and file from buffer
    clearCurrentFile(){
        document.getElementById('fileViewer').value = "";
        document.getElementById('fileType').value = "";
        document.getElementById('fileUsage').value = "";
        document.getElementById('fileDesc').value = "";
        document.getElementById('fname').innerHTML = "Drop a file to this window";
        document.getElementById('fileNum').value = "";
        document.getElementById('fileSize').value = "";
        this.currentTekFile = new tFile();
        this.#fileBuffer = new Uint8Array();
        this.#fileBufPtr = 0;
    }


    // Clear all fields and reset controls
    setControlsToDefault(){
//        document.getElementById('fileList').value = ""; // Set to null entry but don't clear?
        this.clearFileSelectControl();
        this.clearCurrentFile();
//        document.getElementById('fileViewer').value = "";
//        document.getElementById('fileType').value = "";
//        document.getElementById('fileUsage').value = "";
//        document.getElementById('fileDesc').value = "";
//        document.getElementById('fname').innerHTML = "Drop a file to this window";
//        document.getElementById('fileNum').value = "";
//        document.getElementById('fileSize').value = "";
    }


    // Delete everything from storage
    deleteAll(){
        if (confirm("WARNING: this will clear ALL storage and cannot be undone!\nDo you still wish to continue?")){
            this.setControlsToDefault();
            this.fstore = new fileStore();
        }
    }


    // Read a file from disk into storage
    readFile(diskfile, storageObj){
        if (diskfile) {
            let filename = diskfile.name;
            let filenamefield = document.getElementById('fname');
            let freader = new FileReader();
            filenamefield.innerHTML = filename;

            showStorageMsg("Loading...", '', 0);

            // Set up freader
            freader.onload = function(ev) {

                // Get page object references
                let tekUploadFlg = document.getElementById('tekUploadFlg');

                if (tekUploadFlg.value == "1") {  // Uploading from file directly to Tek?
                    let buffer = new Uint8Array(ev.target.result);
                    storageObj.gpibSendBuffer = buffer;
                    tekUploadFlg.value = 0; 
                }else{  // Load into content buffer and storage
                    // Sanity check: is it a 405x Flash Drive file?
                    let flashFileHandler = new flashFilenameHandler(filename);
                    if (flashFileHandler.isValidFlashName()) {
                        let tekFile = new tFile(flashFileHandler.header);
                        tekFile.content = ev.target.result;
                        storageObj.fstore.saveFile(tekFile);
                        storageObj.updateCtrlsFromFile(tekFile);
                        storageObj.currentTekFile = tekFile;
                    }else{
                        storageObj.currentTekFile = new tFile();
                        storageObj.currentTekFile.content = ev.target.result;
                    }
                    storageObj.updateFileSelectList();
                    storageObj.displayInViewer(ev.target.result);
                    clearStorageMsg();
                }
            }

            // Call freader
            freader.readAsArrayBuffer(diskfile);    

        }
    }


    // Update the viewer window
    displayInViewer(filecontent){

        let viewerobj = document.getElementById('fileViewer');
        viewerobj.value = "";

        // Upload new content
        if ( (typeof filecontent != 'undefined') && (filecontent.byteLength > 0) ) {
            let enc = new TextDecoder();
            viewerobj.value = enc.decode(filecontent);
        }
        
    }


    // Handler to import files in 405x Flash Drive format
    importFlashDir(storageObject){
        let fileObj = document.getElementById('importObj');
        let fileListObj = document.getElementById('fileList');
        let fnumObj = document.getElementById('fileNum');
        let numfiles = fileObj.files.length;
        let freader = new FileReader();
        let storageObj = this;

        // Clear the storage viewer
        storageObj.setControlsToDefault();
        showStorageMsg("Importing Flash Drive files ...",'',0);


        function readNextFile(fidx) {
            if (fidx >= numfiles) return;
            let nextFile = fileObj.files[fidx];
            let filename = nextFile.name;

            // File read handler
            freader.onload = function(ev) {

                let flashFileHandler = new flashFilenameHandler(filename);

                 // Sanity check - valid Flash Drive file?  
                if (flashFileHandler.isValidFlashName()) {

                    let tekFile = new tFile();

                    // Update or create file
                    tekFile.header = flashFileHandler.header;
                    tekFile.content = ev.target.result;
                    
                    // Get the file number and set the F# field
                    fnumObj.value = tekFile.num;

                    // Save the file to the store                    
                    storageObj.fstore.saveFile(tekFile); 

                    // Update viewer controls
                    storageObj.updateCtrlsFromFile(tekFile);
                    storageObj.updateFileSelectList();
                }

                if ( fidx == (numfiles-1) )  {  // Reached the last file
                    // Display the first file
                    fileListObj.selectedIndex = 0;
                    fileListObj.dispatchEvent(new Event('change'));
                    // Signal that import has completed
                    clearStorageMsg();
                    showStorageMsg("Done.",'',1);
                    numfiles = 0;
                }else{
                    readNextFile(fidx+1);
                }
            }
            freader.readAsArrayBuffer(nextFile);
        }
        readNextFile(0);

        // Finished with importing multiple files
        fileObj.removeAttribute('multiple','');
    }


    // Import the storage archive
    importStorageArchive(storageobj){

        let loadfile = document.getElementById('importObj').files[0];
        let freader = new FileReader();
        
        let storageObj = this;

        // Clear the storage viewer and storage data
        storageObj.setControlsToDefault();
        storageObj.fstore = new fileStore();

        showStorageMsg("Importing storage archive ...",'',0);
                    
        // File read handler
        freader.onload = function(ev) {

            JSZip.loadAsync(ev.target.result).then(function(zipcontainer) {
                storageObj.getArchiveContent(zipcontainer);
                clearStorageMsg();
                showStorageMsg("Done.",'',1);
                
            }).catch(function(err) {
                alert("Failed to open file: ", loadfile.name);
            })
            
        }
        freader.readAsArrayBuffer(loadfile);

    }


    // Helper for storage archive importer
    async getArchiveContent(zipContainer){

        let fileListObj = document.getElementById('fileList');
        let tflg = 0;
        
        let tekfile = new tFile();

        for(let [filename, fileObj] of Object.entries(zipContainer.files)) {

            if (tflg) { // File content
                const fileData = await fileObj.async("arrayBuffer");
                tekfile.content = fileData;
                this.fstore.saveFile(tekfile);
                tflg = 0;   // Next file is header 
            }else{  // File header
                const fileData = await fileObj.async("string");
                tekfile = new tFile();
                tekfile.header = JSON.parse(fileData);
                tflg = 1;   // Next file is content 
            }

        }    

        this.updateFileSelectList();
        // Select the first file
        fileListObj.selectedIndex = 0;
        // Trigger the 'change' event to display the file in viewer
        fileListObj.dispatchEvent(new Event('change'));
        // Signal that import has completed

    }


    // Process file dropped onto viewer window
    dropHandler(ev, storageObj) {
        let fileObj;
        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();

        if (ev.dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            // If dropped items aren't files, reject them
            if (ev.dataTransfer.items[0].kind === 'file') fileObj = ev.dataTransfer.items[0].getAsFile();
        } else {
            // Use DataTransfer interface to access the file(s)
            fileObj = ev.dataTransfer.files[0];
        }
        this.setControlsToDefault();
        this.readFile(fileObj, storageObj);
    }


    // Prevent default dragover action
    dragOverHandler(event){
        event.preventDefault();
    }


    // Storage import/export options
    fileIOHandle(inbound){
        let idx = document.getElementById('importType').selectedIndex;

        if (idx == 0) {
            if (inbound) {
                document.getElementById('importObj').click();
            }else{
                this.exportFile('file.txt', 'text/plain');
            }   
        } else if (idx == 1) {
            if (inbound) {
                if (confirm("WARNING: This will overwite all current files!")) {
                    document.getElementById('importObj').click();
                }else{
                    return;
                }
            }else{
                this.exportStorageArchive();
            }   
        } else if (idx == 2) {
            if (inbound) {
                if (confirm("WARNING: This will overwite all existing files with the same file number!")) {
                    let multifile = document.getElementById('importObj');
                    multifile.setAttribute('multiple','true');
                    multifile.click();
                }else{
                    return;
                }
            }else{
                this.exportFlashFiles();
            }   
        } else {
            alert("ERROR: shouldn't get here!");    
        }
    }


    // Import handler
    importObject(storageObj) {
        let idx = document.getElementById('importType').selectedIndex;

        if (idx == 0) {
            let file = document.getElementById('importObj').files[0];
            this.readFile(file, storageObj);
        } else if (idx == 1) {
            this.importStorageArchive(storageObj);
        } else if (idx == 2) {
            this.importFlashDir(storageObj);
        }

    }


    // File export handler
    exportFile(filename, contentType) {
        let fnum = parseInt(this.getCurrentFileNum());
        const file = new Blob([this.fstore.getContent(fnum)],{type: contentType});
        this.performExport(filename,file);        
    }


    // Handler to export 405x tagged files only to Flash Drive format
    exportStorageArchive(){
        let filename;
        let zip = new JSZip();
        let idx = 1;
        let storageObj = this;
        let fileCount = storageObj.fstore.fileCount;

        if (fileCount > 0) {

            for (let i=0; i<fileCount; i++) {
                let tekFile = storageObj.fstore.getFileByIdx(i);
                filename = idx.toString().padStart(4,'0');
                zip.file(filename, JSON.stringify(tekFile.header));
                idx++;
                filename = idx.toString().padStart(4,'0');
                zip.file(filename, tekFile.content);
                idx++;
            }
        
            zip.generateAsync({type:"blob"}).then(function(zipcontent) {
                storageObj.performExport("Archive.zip", zipcontent);
            });
        }
    }


    // Handler to export 405x tagged files only to Flash Drive format
    exportFlashFiles(){
        let zip = new JSZip();
        let storageObj = this;
        let fileCount = storageObj.fstore.fileCount;
        
        if (fileCount > 0) {

            for (let i=0; i<fileCount; i++) {
                let tekFile = storageObj.fstore.getFileByIdx(i);
                let flashFileHandler = new flashFilenameHandler(tekFile.name);
                if (flashFileHandler.isValidFlashName) {
                    zip.file(tekFile.name, tekFile.content);
                }

            }

            zip.generateAsync({type:"blob"}).then(function(zipcontent) {
                storageObj.performExport("4050files.zip", zipcontent);
            });
        }
    }


    // File export handler
    async performExport(filename, fileobj) {
        const exported = document.createElement('a');
        exported.href = URL.createObjectURL(fileobj);
        exported.download = filename;
        exported.click();
        URL.revokeObjectURL(exported.href);
        exported.remove();
        clearStorageMsg();
        showStorageMsg("Exporting done.", '', 1)
    }


    // Show the storage window
    showStorageDialog(){
        let storageDialog = document.getElementById('storageDialog');
        this.setControlsToDefault();
        this.updateFileSelectList();
        storageDialog.style.display="block";
    }

    // Hide the storage window
    hideStorageDialog(){
        let storageDialog = document.getElementById('storageDialog');
        storageDialog.style.display="none";
    }


    // Select the current file - load file and update controls and index
    selectCurrentFile(fnumstr){
        if (fnumstr) {

            // Get references to page file description objects
            let fileListObj = document.getElementById('fileList');
            let fileNameObj = document.getElementById('fname');
            let fileDescObj = document.getElementById('fileDesc');

            let tekFile;

            // Clear the viewer
            this.displayInViewer("");

            // Show the current file number is selected
            fileListObj.value = fnumstr;

            // Get the requested file
            let fnum = parseInt(fnumstr);
            if (this.fstore.exists(fnum)) {
                tekFile = this.fstore.getFile(fnum);
                this.updateCtrlsFromFile(tekFile);
                // Deal with filename and description fields
                if (tekFile.desc === "") {
                    fileNameObj.innerHTML = "No description";
                    fileDescObj.value = "";
                }else if ( (tekFile.type==='') || (tekFile.usage==='') ){
                    if ( (tekFile.type==='N') || (tekFile.type==='L') ) {
                        fileNameObj.innerHTML = tekFile.name;
                        fileDescObj.value = "";
                    }else{
                        fileNameObj.innerHTML = "File not marked!";
                        fileDescObj.value = tekFile.desc;
                    }
                }else{
                    fileNameObj.innerHTML = tekFile.name;
                    fileDescObj.value = tekFile.desc;
                }

                // If the file has content, display it in the viewer
                if (tekFile.content) {
                    this.displayInViewer(tekFile.content);
                }

            }else{  // No file info available
                fileNameObj.innerHTML = "No description";
                fileDescObj.value = "";
                tekFile = new tFile();
                tekFile.num = fnum;
            }

            this.currentTekFile = tekFile;
        }
    }


    // Change current file type via select dropdown
    changeType(){
        let fileTypeObj = document.getElementById('fileType');
        let type = fileTypeObj.options[fileTypeObj.selectedIndex].text;
        this.currentTekFile.type = type;
    }


    // Change current file usage type via select dropdown
    changeUsage(){
        let fileUsageObj = document.getElementById('fileUsage');
        let usage = fileUsageObj.options[fileUsageObj.selectedIndex].text;
        this.currentTekFile.usage = usage;
    }


    // Clear the file select control
    clearFileSelectControl() {
        let fileListObj = document.getElementById('fileList');
        if (fileListObj) {
            let listlen = fileListObj.length;
            while(listlen--){
                fileListObj.remove(listlen);
            }
        }
    }


    updateFileSelectList(){
        let fileList = this.fstore.fileList;

        if (fileList) {
            this.clearFileSelectControl();
            let fileListObj = document.getElementById('fileList');
            fileList.sort(function(a,b){return a - b});
            // Create file select list
            for (let i=0; i<fileList.length; i++) {
                let fnumstr = fileList[i].toString();  // Control values are text
                let opt = document.createElement('option');
                opt.textContent = fnumstr;
                opt.value = fnumstr;
                fileListObj.appendChild(opt);
            }
            // Make sure nothing is left selected
            fileListObj.selectedIndex = -1;

        }

    }


    // Returns the file number currently selected in the Select drop down
    getCurrentFileNum(){
        let listobj = document.getElementById('fileList');
        if (listobj.selectedIndex>-1) {
            let filenum = listobj.options[listobj.selectedIndex].text;
            return filenum;
        }
        return "";
    }


    updateCtrlsFromFile(file){
        let ftype = document.getElementById('fileType');
        let fusage = document.getElementById('fileUsage');
        let fdesc = document.getElementById('fileDesc');
        let fsize = document.getElementById('fileSize');
        ftype.value = file.type;
        fusage.value = file.usage;
        fdesc.value = file.desc;
        fsize.value = file.size;
    }


    // Updates file record from the status of the controls
    getFileMarkedState(fnum) {
        let ftype = document.getElementById('fileType').value;
        let fusage = document.getElementById('fileUsage').value;
        let fdesc = document.getElementById('fileDesc').value;
        return([fnum, ftype, fusage, fdesc]);
    }


    // Limits the file description field Limit to a specific length
    fdLimit(e) {
        let ftype = document.getElementById('fileType').value;
        let fdescobj = document.getElementById('fileDesc');
        let desclen = fileNameLength - 30;
        let fdesc = fdescobj.value;

        let keycode;
        let key = e.key;

        if (window.event) { 
            keycode = e.keyCode; 
        } else if (e.which) { 
            keycode = e.which; 
        }
        
        e.preventDefault();
        
        if ( (ftype=='N') || (ftype=='L') ) {
            fdescobj.value = "";    // Can't name a LAST or NEW file
            return true;
        }

        // Get cursor position
        let pos = fdescobj.selectionStart;;

        // Left arrow 
        if (keycode === 0x25) {
            if (pos) pos--;
        }

        // Right arrow
        if (keycode === 0x27) {
            if (pos<(fdesc.length)) pos++;
        }
        
        // Backspace
        if (keycode === 0x08) {
            fdescobj.value = fdesc.slice(0,(pos-1)) + fdesc.slice(pos,(fdesc.length));
            pos--;
        }

        // Add a character
        if ( fdesc.length < desclen ) {
            if ( (keycode>31) && (keycode<127) ) {
                if (key.length === 1) {
                    fdescobj.value = fdesc.slice(0,pos) + key + fdesc.slice(pos,(fdesc.length));
                    pos++;
                }
            }
        }

        // Set cursor position
        fdescobj.setSelectionRange(pos,pos);
        
    }


    
    // ********** GPIB functions **********


    set fileBuffer(data) {  // Data = Uint8Array
        this.#fileBuffer = data;
    }



    // 0x61 - SAVE file
    gpibSave(gpibobj){
        let fnumObj = document.getElementById('fileNum');
        let fnumStr = fnumObj.value;
        
        let data = gpibobj.outputBuffer;
        
//        this.displayInViewer(data);

        if (fnumStr == "0") {
            // Create a file object and perform the export
            const diskFile = new Blob([Uint8Array.from(data)], {type: 'text/plain'});
            performExport('file.txt', diskFile);
        }else{
            // Create/update file record
            let tekFile = new tFile();
            tekFile.num = parseInt(fnumStr);
            tekFile.type = 'A';
            tekFile.usage = 'P';
            tekFile.content = new Uint8Array(data).buffer;
            this.fstore.saveFile(tekFile);
        }    
    }


    // 0x62 - CLOSE file
    gpibClose(){
        let filelistobj = document.getElementById('fileList');
        this.currentTekFile = new tFile();
        this.setControlsToDefault();
        filelistobj.value = "";
        this.#fileBuffer = new Uint8Array();
    }


    // 0x64 - OLD/APPEND a program
    gpibOld(gpibobj){
        gpibobj.inputBuffer = { buffer: this.#fileBuffer, eoi: 1 };
    }


    // 0x66 - TYPE - return file type
    gpibType(gpibobj){
        let dtype = 0;
        let dsize = 0;
        let dsend = false;
        let pos = this.#fileBufPtr;

        // Calculate the type and size values
        if (pos >= this.#fileBuffer.byteLength-1 ) {
            dsend = true;
            dtype = 1;        
        }else if ( (this.currentTekFile.type === 'B') && (this.currentTekFile.usage === 'D') ) {
            dsend = true;
            // BINARY (hex) file
            let peekb = [0,0];
            if (this.#fileBuffer && this.#fileBuffer.byteLength > 2) {  // Not empty
                peekb[0] = this.#fileBuffer[pos];
                peekb[1] = this.#fileBuffer[pos+1];
                dtype = (peekb[0]&0xE0)>>5;
                dtype = dtype + 2;    // code 1=> type 3, code 2=> type 4;
            }else{
                dtype = 1;
            }
            if ( (dtype>2) && (dtype<5) ) dsize = ((peekb[0]&0x1F)<<8) | peekb[1];
            
        }else if ( (this.currentTekFile.type === 'A') && ((this.currentTekFile.usage != 'P') && (this.currentTekFile.usage != 'N')) ) {
            // ASCII file
            dsend = true;
            dtype = 2;
        }else{
            // NEW file or file not open
            dsend = true;
            dtype = 0;
        }

        if (dsend === true) {

            let sendstr = dtype.toString() + String.fromCharCode(13) + dsize.toString() + String.fromCharCode(13);

            gpibobj.inputBufferFromStr = { strtosend: sendstr, eoi: 1 };
        
        }
        
    }


    // 0x69 - Return root directory (always returns Tape@addr
    gpibDir(gpibobj){
        let rootdir = "/" + this.#dirNamePrefix + "@" + gpibobj.currentAddr + "/";
        gpibobj.inputBufferFromStr = { strtosend: rootdir, eoi: 1 };
    }


    // 0x6C - PRINT to file
    gpibPrint(gpibobj){
        
        let tekFile = this.currentTekFile;
        let buffer = [];
        
        if ( (tekFile.type === "") || (tekFile.type === 'N') || (tekFile.type === 'A') ) {
            if (this.#fileBufPtr === 0) {
                buffer = gpibobj.outputBuffer;
                this.#fileBufPtr = buffer.length;
            }else{
                const content = new Uint8Array(tekFile.content);
                let prevdata = Array.from(content);
                let curdata = gpibobj.outputBuffer;
                buffer = prevdata.concat(curdata);
                this.#fileBufPtr += buffer.length;
            }
            if ( (tekFile.type == "") || (tekFile.type == 'N') ) {
                tekFile.type = 'A';
                tekFile.usage = 'D';
                this.updateCtrlsFromFile(tekFile);   
            }
            tekFile.content = new Uint8Array(buffer).buffer;
            this.fstore.saveFile(tekFile);
            this.currentTekFile = tekFile;
        }
    }


    // 0x6D - INPUT data from a file
    gpibInput(gpibobj){
        if (this.currentTekFile.type === 'A') {
            let buflen = this.#fileBuffer.length;
            let pos = this.#fileBufPtr;
            let data = [];
            for (let i=pos; i<buflen; i++) {
                this.#fileBufPtr++;
                if (this.#fileBuffer[i] === 0x0D) {
                    data.push(this.#fileBuffer[i]);
                    gpibobj.inputBuffer = { buffer: Uint8Array.from(data), eoi: 1 };
                    return;
                }else{
                    data.push(this.#fileBuffer[i]);
                }     
            }
            return;         
        }
        gpibobj.inputBuffer = { buffer: new Uint8Array([0xFF]), eoi: 1 }; 
    }


    // 0x6E - READ data from a file
    gpibRead(gpibobj){
        if (this.currentTekFile.type === 'B') {
            let buflen = this.#fileBuffer.length;
            let pos = this.#fileBufPtr;
            let data = [];
            let peekb = [this.#fileBuffer[pos], this.#fileBuffer[pos+1]];
            let dtype = peekb[0]&0xE0;
            let dsize = ((peekb[0]&0x1F)<<8) | peekb[1];
            if (dtype & 0x40) dsize++;   // Text data takes one extra byte
            let dend = pos + dsize + 2;  // Include address bytes plus data
//console.log("Fname: ", this.currentTekFile.name);
//console.log("Pos: ", pos);
//console.log("Dtype: ", dtype);            
//console.log("Dsize: ", dsize);

            if ( (dsize>0) && (buflen >= dend) ) {
                for (let i=pos; i<dend; i++) {
                    data.push(this.#fileBuffer[i]);
                    pos++;
                }
                gpibobj.inputBuffer = { buffer: Uint8Array.from(data), eoi: 1 };
                this.#fileBufPtr = dend;
                return;
            }else{
                // End of file
                gpibobj.inputBuffer = { buffer: new Uint8Array([0xFF]), eoi: 1 };
                return;
            }
            
        }else{
            // Nil response
            gpibobj.inputBuffer = { buffer: new Uint8Array([0xFF]), eoi: 1 };
        }
    }
    

    // 0x6F - WRITE to file
    gpibWrite(gpibobj){

        let c = gpibobj.byteToSend;
        let tekFile = this.currentTekFile;
        let clen = 0;

        if (this.#writeClrFlg === true){
            this.#writeClrFlg = false;
            tekFile.content = new Uint8Array().buffer;
        }else{
            if (tekFile.content) clen = tekFile.content.byteLength;
        }

        let tmpArray = new Uint8Array(clen + 1);

        if (clen) tmpArray.set(new Uint8Array(tekFile.content), 0);
        tmpArray[clen] = c;

        if ( (tekFile.type === "") || (tekFile.type === 'N') || (tekFile.type === 'B') ) {

            tekFile.content = tmpArray.buffer;

            if ( (tekFile.type == "") || (tekFile.type == 'N') ) {
                tekFile.type = 'B';
                tekFile.usage = 'D';
                this.updateCtrlsFromFile(tekFile);   
            }

            this.fstore.saveFile(tekFile);
            this.currentTekFile = tekFile;
        }
    }


    // 0x71 - BOLD/BSAVE
    gpibBPL(gpibobj){
    
        if (gpibobj.currentAddrCmd > 0x40) {    // Controller wants me to send data (BOLD)
 
            if ( (this.currentTekFile.type == 'B') && (this.currentTekFile.usage == 'P') ) {

                let datalen = this.#fileBuffer.length;
                let padcnt = 256 - (this.#fileBuffer.length % 256);
                let padding = new Uint8Array(padcnt);
                let buffer = new Uint8Array(datalen + padcnt);
                
                padding.fill(0x20);
                padding[0] = 0xFF;

                buffer.set(this.#fileBuffer);
                buffer.set(padding, datalen);

                gpibobj.inputBuffer = { buffer: buffer, eoi: 1 };

            }
                  
        }else{  // Controller wants me to listen (BSAVE)
        
            let fnumObj = document.getElementById('fileNum');
            let fnumStr = fnumObj.value;
            fnumObj.value = fnumStr;

            let data = gpibobj.outputBuffer;

            if (fnumStr == '0') {
                // Create a file object and perform the export
                const diskFile = new Blob([Uint8Array.from(data)], {type: 'application/octet-stream'});
                this.performExport('prog.bin', diskFile);
            }else{
                // Create/update file record
                let tekFile = new tFile();
                tekFile.num = parseInt(fnumStr);
                tekFile.type = 'B';
                tekFile.usage = 'P';
                tekFile.content = Uint8Array.from(data).buffer;
                this.fstore.saveFile(tekFile);
            }
        
        }
    
    }
    

    // 0x73
    gpibList(gpibobj) {

        if (gpibobj.currentAddrCmd > 0x40) {    // Controller wants me to send data (LIST read entry)


            let stat = 0;
            let filename = "";

            if (this.fstore.exists(this.currentTekFile.num)) {
                stat++;
                if ( (this.currentTekFile.type === 'A') || (this.currentTekFile.type === 'B') ) {
                    if (this.currentTekFile.usage !== "") stat++;
                }
                if ( (this.currentTekFile.type === 'N') || (this.currentTekFile.type === 'L') ) {
                    stat++;
                }
                filename = this.currentTekFile.name;
                if (filename !== "") stat++;
            }
            if (stat === 3) {
                gpibobj.inputBufferFromStr = { strtosend: filename, eoi: 1 };
            }else{
                gpibobj.inputBuffer = { buffer: new Uint8Array([0xFF]), eoi: 1 };
            }

        }else{  // Controller wants me to listen (LIST write entry)

            let newname = String.fromCharCode(...gpibobj.outputBuffer);
            let flashNameHandler = new flashFilenameHandler(newname);
            // Must be valid format for marked file
            if (flashNameHandler.isValidFlashName()) {
                this.currentTekFile.header = flashNameHandler.header;
                this.fstore.saveFile(this.currentTekFile);
                this.updateCtrlsFromFile(this.currentTekFile);
            }
            
        }

    }


    // 0x7B - find file
    gpibFind(gpibobj){
        let fnumObj = document.getElementById('fileNum');
        let fnumstr = gpibobj.outputBufferAsStr;
        fnumObj.value = fnumstr;
        let fnum = parseInt(fnumstr);
        this.writeClrFlg = false;

        gpibobj.clearInputBuffer();
        
        if ( (fnum > 0) && (fnum < 255) ) {
            // Make the requested file the current file
            this.selectCurrentFile(fnumstr);
            if ( (this.currentTekFile.type === 'A') || (this.currentTekFile.type === 'B') ) {
                if (this.currentTekFile.usage === 'D'){
                    this.#writeClrFlg = true;
                }
                this.#fileBuffer = new Uint8Array(this.currentTekFile.content);
                this.#fileBufPtr = 0;
            }
        }else{
            let progObj = document.getElementById('fileViewer');
            let tekUploadFlg = document.getElementById('tekUploadFlg');
            progObj.value = "";
            // Signal we want to upload directly into the emulator
            tekUploadFlg.value = "1";
            // Trigger the file dialog to let the user choose a file
            document.getElementById('importObj').click();

        }
       
    }

}    // End class Storage



// ********** Utility functions **********

function showStorageMsg(msg, btncolor, btnstatus){
    let messageObj = document.getElementById('storageNotify');
    let messageBtnObj = document.getElementById('notifyBtn');
    if (btnstatus) messageBtnObj.disabled = false;
    if (btncolor) messageObj.style.background = btncolor;
    document.getElementById('storageMsg').innerHTML = msg;
    messageObj.style.display="block";
}



function clearStorageMsg(){
    let messageObj = document.getElementById('storageNotify');
    let messageBtnObj = document.getElementById('notifyBtn');
    messageObj.style.display="none";
    messageBtnObj.disabled = true;
}






// ********** File storage class **********

class fileStore {
    
    constructor() {
        this.filestore = [];    
    }

    
    get nextFileNum() {

        let keylist = this.filestore.map(elem => elem[0]);


        for (let i in this.filestore){
            keylist.push(this.filestore[i][0]);
        }

        keylist = keylist.sort(function(a,b){return a - b});
        for (let i=0; i<255; i++){
            if (keylist[i] != (i+1) ) return String(i+1);
        }
        return null;    
    
    }


    get fileList() {
        return this.filestore.map(elem => elem[0]);
    }


    get fileCount() {
        if (this.filestore) return this.filestore.length;
        return 0;
    }
    

    getFile(fnum) {
        let idx = this.getIdx(fnum);
        let file = new tFile();
        if (typeof this.filestore !== 'undefined') {
            if ( (idx>-1) && (idx<this.filestore.length) ) {
                file.header = this.filestore[idx].slice(0,4);
                file.content = this.filestore[idx][4];
                return file;
            }
        }
    }

    getFileByIdx(idx) {
        if (this.filestore) {
            if (idx<this.filestore.length) {
                let file = new tFile();
                file.header = this.filestore[idx].slice(0,4);
                file.content = this.filestore[idx][4];
                return file;
            }
        }
    }


    getContent(fnum) {
        let idx = this.getIdx(fnum);
        if ( (idx>-1) && (this.filestore[idx][4]) ){
            return this.filestore[idx][4];
        }
    }


    saveFile(file) {
        let idx = this.getIdx(file.num);
        if (idx>-1) {   // File exists
            this.filestore[idx][1] = file.type;    // File type
            this.filestore[idx][2] = file.usage;   // File usage
            this.filestore[idx][3] = file.desc;    // File description
            this.filestore[idx][4] = file.content;  // File content          
        }else{  // File does not exist
            this.filestore.push(file.all);
        }
    }


    delFile(fnum) {
        let idx = this.getIdx(fnum);
        if ( (idx>-1) && (idx<this.filestore.length) ) {
            this.filestore.splice(idx, 1);
        }
    }


    updateRecord(fileinfo) {
        let idx = this.getIdx(fileinfo[0]);
        if (idx>-1) {
            // Record already exists so update
            this.filestore[idx][1] = fileinfo[1];    // File type
            this.filestore[idx][2] = fileinfo[2];    // File usage
            this.filestore[idx][3] = fileinfo[3];    // File description
            this.filestore[idx][4] = fileinfo[4];    // File full name
        }else{
            // Create a new record
            this.filestore.push(fileinfo);
        }
    }


    updateContent(idx, filecontent) {
        if ( filecontent && (filecontent.constructor.toString().includes('ArrayBuffer')) ) {
            this.filestore[idx][4] = filecontent;
        }
    }


    exists(fnum) {
        if (this.getIdx(fnum)>-1) return true;
        return false;
    }


    getIdx(fnum) {
        let idx = -1;
        if (this.filestore) {
            for (let i in this.filestore) {
                if (this.filestore[i][0]==fnum){
                    idx = i;
                    break;
                }
            }
        }
        return idx;
    }

}



// ********** tFile class **********

class tFile {

    constructor(fileinfo) {
        this.file = ['','','','',];
        if (fileinfo) this.header = fileinfo;
    }


    get all() {
        return this.file;
    }

    get header() {
        return this.file.slice(0,4);
    }


    get num() {
        return this.file[0];    
    }


    get type() {
        return this.file[1];
    }
    
    
    get usage() {
        return this.file[2];
    }
    
    
    get desc() {
        return this.file[3];
    }

    
    get content() {
        if (this.file[4]) return this.file[4];
        return null;
    }


    get size() {
        if (this.file[4]) {
            return this.file[4].byteLength;
        }else{
            return 0;
        }
    }


    get name() {
    
        let fnum   = this.num.toString();
        let ftype  = ' ';
        let fusage = ' ';
        let fdesc  = this.desc ?? ' ';
        let idx = -1;
                
        idx = fileTypes.findIndex(elem => elem.idx === this.type);
        if (idx>-1) ftype = fileTypes[idx].type;
        idx = fileUsages.findIndex(elem => elem.idx === this.usage);
        if (idx>-1) fusage = fileUsages[idx].usage;
    
        let desclen = fileNameLength - 30;
        
        let filename =  fnum.padEnd(7) + 
                        ftype.padEnd(8) +
                        fusage.padEnd(5) +
                        fdesc.padEnd(desclen) +
                        ' ' +
                        this.size.toString();

        return filename;
        
    }


    set num(fnum) {
        if (fnum>0 && fnum<255) this.file[0] = fnum;
    }


    set type(ftype) {
        let found = fileTypes.some( item => { return (item.idx === ftype); } );
        if (found) this.file[1] = ftype;
    }


    set usage(fusage) {
        let found = fileUsages.some( item => { return (item.idx === fusage); } );
        if (found) this.file[2] = fusage;
    }


    set desc(fdesc) {
        this.file[3] = fdesc;
    }


    set header(fileinfo) {
        this.num = fileinfo[0];
        this.type = fileinfo[1];
        this.usage = fileinfo[2];
        this.desc = fileinfo[3];
    }


    set content(filecontent) {
        if ( filecontent && (filecontent.constructor.toString().includes('ArrayBuffer')) ) {
            this.file[4] = filecontent;
        }
    }

}



// ********** flashFilenameHandler class **********

class flashFilenameHandler {

    constructor(fNameStr) {
        this.filename = fNameStr;
        this.headerinfo = ['','','',''];
    }


    get fileNameStr(){
        return this.filename;
    }


    get header(){
        return this.headerinfo;
    }


    // Determine the position of the final space (start of file size)
    get lastSpacePos() {
        let lspos = 0;
        if (this.filename) {
            let ch = '';
            lspos = this.filename.length;
            while ( (ch != ' ') && (lspos > 0) ) {
                lspos--;
                ch = this.filename.charAt(lspos);
            } 
        }
        return lspos;
    }


    set nameStr(fNameStr) {
        this.filename = fNameStr;
    }


    // Set file information from 405x Flash Drive filename string
    // Returns 'true' for a valid flash filename and the file header is changed
    // Returns 'false' for an invalid file name nothing is changed
    isValidFlashName(){
        let fnumval = 0;
        fnumval = parseInt(this.filename.substring(0,6));
        if (isNaN(fnumval)) return false;
        this.headerinfo[0] = fnumval;

        let ftype = this.filename.charAt(7);
        for (let i in fileTypes){
            if (fileTypes[i].idx == ftype) this.headerinfo[1] = ftype;
        }
        if (!this.headerinfo[1]) return false;
        if ( (ftype !== 'N') && (ftype !== 'L') ) {  // Skip over usage for type NEW and LAST        
            let fusage = this.filename.charAt(15);
            for (let i in fileUsages){
                if (fileUsages[i].idx == fusage) this.headerinfo[2] = fusage;
            }
            if (!this.headerinfo[2]) return false;
        }

        this.headerinfo[3] = this.fileDescription();
        return true;
    }


    // Extracts the file description from the file name
    fileDescription() {
        let ch = '';
        let desc = "";

        if (this.filename) {
            let depos = this.lastSpacePos;
            let desclength = fileNameLength - 30;   // 30 = fnum[7] + ftype[8] + fusage[5] + fsize[7] + CR + NULL

            // Extract description
            for (let i=20; i<depos; i++) {
                ch = this.filename.charAt(i);
                if ( (ch != '[') && (ch != ']') ) {
                    desc = desc + ch;
                }
            }
            // Truncate or pad as required
            desc = desc.slice(0,desclength);
            desc = desc.padEnd(desclength);

        }

        return desc;
    }


}




