

function TekDisplay(hw, canvas) {
	
	let canvasctx = canvas.getContext("2d", {willReadFrequently: true});
	let width = canvas.width;
	let height = canvas.height;

// console.log(canvas.height + "," + canvas.width);

	let X_DA = 0;
	let Y_DA = 0;

	// Pixel size
	let pxDotSize = 2;
	let adotSize = 2;

//	const pixel_erase_inten  = 255;

	let pixel_store_inten  = 240;
	let pixel_cursor_inten = 200;

	// Adjust position of graphics relative to canvas
	const screen_x_offset = 16;
	const screen_y_offset = 10;
	
	let VEN_1 = 0;
	
	let dvDebugEnabled = false;
	let allDebugEnabled = false;

    // ********************
    // ***              ***
    // ***  STD VIDEO.  ***
    // ***              ***
    // ********************

//    let FGColourIndex = 0x2;
//    let BGColourIndex = 0x0;

    // Colours are indexed [0..7] and then [Red,Green,Blue] (where Red, Green and Blue are in the range 0..255).
    //
    let ColourTable = [
      [   0,   0,   0 ], // [0] Black.
      [   0,   0, 255 ], // [1] Blue.
      [   0, 255,   0 ], // [2] Green.
      [ 255,   0,   0 ], // [3] Red.
      [   0, 255, 255 ], // [4] Cyan.
      [ 255,   0, 255 ], // [5] Magenta.
      [ 255, 255,   0 ], // [6] Yellow.
      [ 255, 255, 255 ], // [7] White.
    ];
    
	canvasctx.fillStyle = "rgb("+ColourTable[0][0]+","+ColourTable[0][1]+","+ColourTable[0][2]+")";
	canvasctx.fillRect( 0, 0, width, height );
    
    // ****************
    // ***          ***
    // ***  VECTOR  ***
    // ***          ***
    // ****************

	function VECTOR( x0, y0, x1, y1 ) {

		let dx = Math.abs( x1 - x0 );
		let dy = Math.abs( y1 - y0 );
		
		let sx = -1;
		let sy = -1;
		
		if( x0 < x1 ) sx = 1;
		if( y0 < y1 ) sy = 1;
		
		let err = dx - dy;
		
		do {
		
			if (VEN_1 == 1) {
				// course (2) or fine (1) vector pixel width and height for normal vectors
                setPixel(x0, y0, 'VECTOR', pxDotSize );
			} else {
				// single vector pixel width and height for refresh vectors
                setPixel(x0+1, y0+1, 'RVECTOR', 1 );
			}
			
			if( (x0 == x1) && (y0 == y1) ) break;
			
			let e2 = 2 * err;
			
			if( e2 > -dy ) {
				err -= dy;
				x0 += sx;	
			}
			
			if( e2 < dx ) {
				err += dx;
				y0 += sy;	
			}
			
		} while( true );
			
	} // End of function VECTOR.


    // xpos, ypos = tektronix display co-ordinates
    // Added psize to indicate the pixel size (values 1=1x1 or 2=2x2)
    // to solve a FF rendering problem when 'Delete' key is pressed
	function setPixel( xpos, ypos, type, pxsize ) {

        if (pxsize < 1) pxsize = 1;

//		my = height - ypos; // Convert to 'canvas' coordinates from Tektronix coordinates.
        let cypos = height - (ypos+1);  // Both have Zero base. Offset of 1 down required when converting.
  
		switch( type ) {
			case 'ERASE' :
		 		setPixelRGB( xpos, cypos, 0, 0, 0, pxsize ); // BLACK
				break;
			case 'SOT' : // cursor refresh dot
				// Do not replace pixel if it already has been stored!
				if(canvasctx.getImageData(xpos, cypos, 1, 1).data[1] != pixel_store_inten) {
				    setPixelRGB( xpos, cypos, 0, pixel_cursor_inten, 0, pxsize ); // DARK GREEN
				}
				break;
			case 'RVECTOR' : // vector refresh dot  -- added by mcm for refresh vector support
				// Do not replace pixel if it already has been stored!
				if(canvasctx.getImageData(xpos, cypos, 1, 1).data[1] != pixel_store_inten) {
				    setPixelRGB( xpos, cypos, 0, pixel_cursor_inten, 0, pxsize ); // DARK GREEN
				}
				break;
			case 'ADOT' : // stored character dot
				setPixelRGB( xpos, cypos, 0, pixel_store_inten, 0, pxsize ); // BRIGHT GREEN
				break;
			case 'VECTOR' :
				setPixelRGB( xpos, cypos, 0, pixel_store_inten, 0, pxsize ); // BRIGHT GREEN
				break;
			default :
				break;
		}					
	}


    // Draws a "pixel"
    // cxpos,cypos = canvas co-ordinates
	function setPixelRGB( cxpos, cypos, r, g, b, pxsize ) {
		canvasctx.fillStyle = "rgb("+r+","+g+","+b+")";
		canvasctx.fillRect( cxpos, cypos, pxsize, pxsize );
	}
    
   
    // ****************
    // ***          ***
    // ***  SCREEN  ***
    // ***          ***
    // ****************

	var adotpending = false;
	
	this.SCREEN = function( type ) {
        //console.log("TekDisplay SCREEN");

        let DISP_INFO = hw.getDisplayControl();

		let X_CHAR = DISP_INFO[0];
		let Y_CHAR = DISP_INFO[1];
		
		let VECTOR_0 = DISP_INFO[2];
		VEN_1    = DISP_INFO[3];	// Defined globally as it is shared across functions
		
		let new_X = DISP_INFO[4] + screen_x_offset;
		let new_Y = DISP_INFO[5] + screen_y_offset;

		if ( type == 'BUFCLK' ) {
		
			let old_X = X_DA;
			let old_Y = Y_DA;

			// moved VEN_1 test to function VECTOR to enable persistent AND refresh vectors
			if( (VECTOR_0 == 0) )
				VECTOR( old_X, old_Y, new_X, new_Y );
		    
			// DER 9th August 2014 - Add debug code for drawing vectors.
			if( (VEN_1 == 1) && (VECTOR_0 == 0) && dvDebugEnabled ) {
			
				console.log( 'DER: TEKTRONIX4051.js - $$$' );
				console.log( ' DRAW VECTOR ' ); 
				console.log( ' old_X = ', old_X );
				console.log( ' old_Y = ', old_Y );
				console.log( ' new_X = ', new_X );
				console.log( ' new_Y = ', new_Y );
				console.log( ' VECTOR-0 = ', VECTOR_0 );
				console.log( ' VEN-1 = ', VEN_1 );
				
			} // End if.
			
			X_DA = new_X;
			Y_DA = new_Y;
		
		} // End if bufclk.
	
		// Check for cursor dot.
		if( (type == 'SOT') && (VECTOR_0 == 1) && (VEN_1 == 0) ) {



			if( adotpending ) {

//console.log("X_DA: " + X_DA + "  Y_DA: " + Y_DA + "  X_CHAR: " + X_CHAR + "  Y_CHAR: " + Y_CHAR);

				// setPixel( X_DA + X_CHAR, Y_DA + Y_CHAR, 'ADOT');
				// double width and double height of character pixels
				// 4 setPixel calls to interpolate between pixels for continuous font appearance
/*
				setPixel( X_DA + ((2*X_CHAR)+2), Y_DA + (2*Y_CHAR), 'ADOT', 1 );
				setPixel( X_DA + ((2*X_CHAR)+1), Y_DA + (2*Y_CHAR), 'ADOT', 1 );
    			setPixel( X_DA + ((2*X_CHAR)+2), Y_DA + ((2*Y_CHAR)-1), 'ADOT', 1 );
				setPixel( X_DA + ((2*X_CHAR)+1), Y_DA + ((2*Y_CHAR)-1), 'ADOT', 1 );
*/
//                setPixel ( X_DA + (2*X_CHAR), Y_DA + (2*Y_CHAR), 'ADOT', 2 );

				if ( (X_DA == new_X) && (Y_DA == new_Y) ){

                	setPixel ( X_DA + (2*X_CHAR), Y_DA + (2*Y_CHAR), 'ADOT', pxDotSize );

				}else{

                	setPixel ( X_DA + (2*X_CHAR), Y_DA + (2*Y_CHAR), 'ADOT', adotSize );
				
				}


			} else {
			    // setPixel( X_DA + X_CHAR, Y_DA + Y_CHAR, 'SOT');
				// double width and double height of cursor pixels
				// 2 setPixel calls instead of 4 because it's pixelated like on actual machine
//				setPixel( X_DA + 2*X_CHAR+1, Y_DA + 2*Y_CHAR, 'SOT', 1 );
//				setPixel( X_DA + 2*X_CHAR+2, Y_DA + 2*Y_CHAR-1, 'SOT', 1 );

				setPixel( X_DA + (2*X_CHAR), Y_DA + (2*Y_CHAR), 'SOT', 1 );
				setPixel( X_DA + ((2*X_CHAR)+1), Y_DA + ((2*Y_CHAR)+1), 'SOT', 1 );

			}
			adotpending = false;
		} // End if sot.
		
		// Check for alphanumeric dot.
		if( (type == 'ADOT') && (VECTOR_0 == 1) && (VEN_1 == 0) ) {
			adotpending = true;
		}
		
		// DER - Debug code...
		if( allDebugEnabled ) {
//			console.log( 'DER: TEKTRONIX4051.js - $$$' );
//			console.log( ' TYPE = ', type );
			console.log( ' X_DA = ', X_DA );
			console.log( ' Y_DA = ', Y_DA );
//			console.log( ' X_CHAR = ', X_CHAR );
//			console.log( ' Y_CHAR = ', Y_CHAR );
//			console.log( ' VECTOR-0 = ', VECTOR_0 );
//			console.log( ' VEN-1 = ', VEN_1 );
		} // End if

	} // End of function SCREEN.


    // ***************
    // ***         ***
    // ***  ERASE  ***
    // ***         ***
    // ***************

	this.ERASE = function() {
        var imgd = canvasctx.getImageData(0, 0, width, height);
        var buffer = imgd.data.buffer;
        var buf8 = new Uint8ClampedArray(buffer);
        var data = new Uint32Array(buffer);
	
	    // Fill the screen bright green
	    for(let i = 0; i < data.length; i++) {
           // 31:24 = alpha
           // 23:16 = blue
           // 15:8  = green
           //  7:0  = red
           data[i] = 0xFF00FF00;
        }
        imgd.data.set(buf8);
        canvasctx.putImageData(imgd, 0, 0);
        
        // Blank the screen
        for(let i = 0; i < data.length; i++) {
           // 31:24 = alpha
           // 23:16 = blue
           // 15:8  = green
           //  7:0  = red
           data[i] = 0xFF000000;
        }
        imgd.data.set(buf8);
        
        // The DVST resets about 500 ms after the screen flash
        setTimeout(function(){
            canvasctx.putImageData(imgd, 0, 0);
            hw.displayReady();
            }, 500);	
	}

    
	this.dvst_emulate = function() {
	    var imgd = canvasctx.getImageData(0, 0, width, height);
        var buffer = imgd.data.buffer;
        var buf8 = new Uint8ClampedArray(buffer);
        var data = new Uint32Array(buffer);
	
	    for(let i = 0; i < data.length; i++) {
           // 31:24 = alpha
           // 23:16 = blue
           // 15:8  = green
           //  7:0  = red
            var pixel = (data[i] >> 8) & 0xFF;
            
            // If the pixel is bright enough for the DVST to store it
            // then it will stay that way. If the pixel brightness
            // is below the threshold for the DVST to store the pixel
            // then its brightness will decay to zero.
            if(pixel_store_inten > pixel) {
               data[i] = 0xFF000000; // Blank the pixel
            }
        }
        imgd.data.set(buf8);
        canvasctx.putImageData(imgd, 0, 0); 
	}

	
	this.COPY = function() {
        var link = document.createElement('a');
        link.download = "screen.png";
        link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");;
        link.click();
	
	}

	// Size of one pixel on the Tek Emulator display (1: fine; 2: course)
	this.setPixelSize = function( pxsize ) {

		if ( (pxsize>0) && (pxsize<4) ){

			switch (pxsize) {
				case 1:
					pxDotSize = 1;
					adotSize = 1;
					break;
				case 2:
					pxDotSize = 2;
					adotSize = 2;
					break;
				case 3:
					pxDotSize = 1;
					adotSize = 2;
					break;
				default:
					pxDotSize = 2;
					adotSize = 2;
		
			}
		}

//console.log("pxDot: ", pxDotSize, "aDot: ", adotSize);

		if (pxDotSize === 1) {
			pixel_store_inten  = 254;
			pixel_cursor_inten = 239;	
		}else{
			pixel_store_inten  = 240;
			pixel_cursor_inten = 200;
		}

	}

}
