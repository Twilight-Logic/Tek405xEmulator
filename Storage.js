// Storage test script

function saveProgram(idx, progobj){
	if (idx) {
        if (localStorage.getItem(idx)) {
            if (confirm("Overwrite existing program?")){
		        localStorage.setItem(idx, progobj.value);
            }else{
                return;
            }
        }else{
            localStorage.setItem(idx, progobj.value);
        }
	}else{
		alert("Program number required!");
	}
}


function loadProgram(idx){
	if (idx) {
		progobj = document.getElementById('program');
		progobj.value = localStorage.getItem(idx);
	}else{
		alert("Program number required!");
	}
}


function deleteProgram(idx){
	if (idx) {
        if (localStorage.getItem(idx)) {
            if (confirm("Delete existing program?")){
		        progobj = document.getElementById('program');
		        progobj.value = "";
                localStorage.removeItem(idx);
            }
        }else{
            alert("Nothing to delete!");
        }
	}else{
		alert("Program number required!");
	}
}


function selectProgram(){
    var program = document.getElementById('program').value;
    upload_to_tek(str2addrbuf(program));
	closeStorage();
}


function closeStorage(){
    var storageobj = document.getElementById('storage');
    storageobj.style.display="none";
}


function readFile(file){
    var filename = file.name;
    var filenamefield = document.getElementById('fname');
    var freader = new FileReader();
    filenamefield.innerHTML = filename;
    freader.onload = function(ev) {
        var filenamefield = document.getElementById('fname');
        //console.log(ev.target.result);
        program.value = ev.target.result;
    }
    freader.readAsText(file);
}



function dropHandler(ev) {
  console.log('File(s) dropped');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

//  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
//    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
//      if (ev.dataTransfer.items[i].kind === 'file') {
//        var file = ev.dataTransfer.items[i].getAsFile();
//        var program = document.getElementById('program');
//        console.log('... file[' + i + '].name = ' + file.name);
        
//        program.value = ev.dataTransfer.getData();
//      }
//    }
//  } else {
    // Use DataTransfer interface to access the file(s)
//    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
    var file = ev.dataTransfer.files[0];
    readFile(file);
}


function dragOverHandler(event){
    event.preventDefault();
}


function exportProgram(content, filename, contentType) {
    const exported = document.createElement('a');
    const file = new Blob([content], {type: contentType});
  
    exported.href= URL.createObjectURL(file);
    exported.download = filename;
    exported.click();

    URL.revokeObjectURL(exported.href);
    exported.remove();
}


function importProgram() {
    var file = document.getElementById('importFile').files[0];
    var fread = new FileReader();
    readFile(file);
}


function showStorageOptions(){
    var storage = document.getElementById('storage');
    storage.style.display="block";
}


function str2addrbuf(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}