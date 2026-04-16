/*
 *
 * JSMSX - MSX Emulator in Javascript
 * Copyright (c) 2006 Marcus Granado <mrc.gran(@)gmail.com> 
 *
 * Portions of the initial code was inspired by the work of
 * Arnon Cardoso's Java MSX Emulator and
 * Adam Davidson & Andrew Pollard's Z80 class of the Spectrum Java Emulator 
 * after reading this thread: http://www.msx.org/forumtopic4176.html
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 * The full license is available at http://www.gnu.org/licenses/gpl.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * Completely revamped to support the hardware of the Tektronix 4051 by Dave Roberts.
 * Other contributors: Jon Stanley
 *
 */

//let GPIB = require('./GPIB');
//let RTC = require('./RTC');

function TEKTRONIX4051( windowObj, canvasObj, gpib ) {
    
    // Hardware components
    var display = new TekDisplay(this, canvasObj);
    var keyboard = new TekKeyboard(this, windowObj);
    var cpu = new TekCpu(this);
    var rom = new Tek4051Rom;
    var ram = new Array(32*1024);
    var romexp = new ROMexp;
    
    
console.log("GPIB Registry: ", gpib.deviceRegistry);


// var osc;
// var ctx;


    // MC6820 PIA notation
    //  * CRA = Control Register A
    //  * CRB = Control Register B
    //  * ORA = Output Register A
    //  * ORB = Output Register B
    //  * IRA = Input /Register A
    //  * IRB = Input Register B
    //  * DDRA = Data Direction Register A
    //  * DDRB = Data Direction Register B

    var PIA_U561_CRA  = 0x00;
    var PIA_U561_CRB  = 0x00;
    var PIA_U561_ORA  = 0x00;
    var PIA_U561_ORB  = 0x00;
    var PIA_U561_IRA  = 0x00;
    var PIA_U561_IRB  = 0x00;
    var PIA_U561_DDRA = 0x00;
    var PIA_U561_DDRB = 0x00;
    
    var PIA_U565_CRA  = 0x00;
    var PIA_U565_CRB  = 0x00;
    var PIA_U565_ORA  = 0x00;
    var PIA_U565_ORB  = 0x00;
    var PIA_U565_IRA  = 0x00;
    var PIA_U565_IRB  = 0x00;
    var PIA_U565_DDRA = 0x00;
    var PIA_U565_DDRB = 0x00;
    
    var PIA_U361_CRA  = 0x00;
    var PIA_U361_CRB  = 0x00;
    var PIA_U361_ORA  = 0x00;
    var PIA_U361_ORB  = 0x00;
    var PIA_U361_IRA  = 0x00;
    var PIA_U361_IRB  = 0x00;
    var PIA_U361_DDRA = 0x00;
    var PIA_U361_DDRB = 0x00;

    var PIA_U461_CRA  = 0x00;
    var PIA_U461_CRB  = 0x00;
    var PIA_U461_ORA  = 0x00;
    var PIA_U461_ORB  = 0x00;
    var PIA_U461_IRA  = 0x00;
    var PIA_U461_IRB  = 0x00;
    var PIA_U461_DDRA = 0x00;
    var PIA_U461_DDRB = 0x00;

    var PIA_U265_CRA  = 0x00;
    var PIA_U265_CRB  = 0x00;
    var PIA_U265_ORA  = 0x00;
    var PIA_U265_ORB  = 0x00;
    var PIA_U265_IRA  = 0x00;
    var PIA_U265_IRB  = 0x00;
    var PIA_U265_DDRA = 0x00;
    var PIA_U265_DDRB = 0x00;
    
    var GPIB_DATA_IN  = 0x00; // Data from GPIB to 4051.
    var GPIB_DATA_OUT = 0x00; // Data from 4051 to GPIB.
    
    var GPIB_TALK     = 0; // 4051 is talking on the GPIB.
    var GPIB_LISTEN   = 0; // 4051 is listening to the GPIB.
    var GPIB_EOI_OUT  = 0; // End Or Identify. [TALKER].
    var GPIB_IFC_OUT  = 0; // Interface Clear. [CONTROLLER].
    var GPIB_ATN_OUT  = 0; // Attention. [CONTROLLER].
    var GPIB_NRFD_OUT = 0; // Not Ready For Data. [LISTENERS].
    var GPIB_DAV_OUT  = 0; // Data Valid. [TALKER].
    var GPIB_NDAC_OUT = 0; // Not Data Accepted. [LISTENER].
        
    var GPIB_EOI_IN   = 0; // End Or Identify. [TALKER].
    var GPIB_NRFD_IN  = 0; // Not Ready For Data. [LISTENERS].
    var GPIB_SRQ_IN   = 0; // Service Request. [CONTROLLER].
    var GPIB_DAV_IN   = 0; // Data Valid. [TALKER].
    var GPIB_NDAC_IN  = 1; // Not Data Accepted. [LISTENER].
    
    var GPIB_REN_OUT  = 0; // Remote Enable. [CONTROLLER].
    
    this.exesbytes = []; // An empty array initially.
    this.sbyteslength = 0; // Initially no bytes stored in the empty array!
    this.sbytesindex = -1; // Initially no program has been stored.
    
    var GPIB_STATE = 0; // No file loaded.
    
//    var GPIB_RDTIME_STATE = 0;
//    var GPIB_RDTIME = "";
//    var GPIB_RDTIME_INDEX = 0;
    
//    var LAST_CMD = 0;
    var ADDR_PRIMARY = 0;
    var ADDR_SECONDARY = 0;

    var ADDR_TAPE = 5;  // Web storage "tape drive" address

//    var current_fnumstr = 0;
//    var bin_data_length = 0;
//    var bin_byte_cnt = 0;
//    var bin_data_type = 0;
    
//    var outBuffer = [];
    
    this.KBD_TTY_0   = 1;
    this.KBD_SHIFT_0 = 1;
    this.KBD_CTRL_0  = 1;
    
    // 0-disable; 1-enable
    var BANK_SWITCH_SELECTOR = 0;
    var BSX_ADDRESS = 0;
    
    var beep = new Audio( "beep.mp3" );
    
    var click = new Audio( "click.mp3" );
    
    this.audioOn = true;

    // Random number generator mod
    var RND_KC_BODGE0 = 0;
    var RND_KC_BODGE1 = 0;
    // Random number generator mod

    var kbsf = 35;

    // ***************
    // ***         ***
    // ***  print  ***
    // ***         ***
    // ***************

    this.print = function( str ) {

        console.print(str);

    } // End of function print.

    // *****************
    // ***           ***
    // ***  println  ***
    // ***           ***
    // *****************

    this.println = function( str ) {

    this.logbuf.textContent += str + "\n";

    } // End of function println.

    // ******************
    // ***            ***
    // ***  printHex  ***
    // ***            ***
    // ******************

    this.printHex1 = function( n ) {

      var nn = n & 0x000F; // Isolate the least significant 4 bits.

      switch( nn ) {
        case 0x0 : return '0';
        case 0x1 : return '1';
        case 0x2 : return '2';
        case 0x3 : return '3';
        case 0x4 : return '4';
        case 0x5 : return '5';
        case 0x6 : return '6';
        case 0x7 : return '7';
        case 0x8 : return '8';
        case 0x9 : return '9';
        case 0xA : return 'A';
        case 0xB : return 'B';
        case 0xC : return 'C';
        case 0xD : return 'D';
        case 0xE : return 'E';
        case 0xF : return 'F';
        default  : break;
      } // End switch nn.

    } // End of function printHex1.

    this.printHex2 = function( n ) {
        let byte = "";
        byte += this.printHex1( n >>> 4 ); // Hi nibble.
        byte += this.printHex1( n       ); // Lo nibble.
        return byte;
    } // End of function printHex2.

    this.printHex4 = function( n ) {
        let word = "";
        word += this.printHex2( n >>> 8 ); // Hi word.
        word += this.printHex2( n       ); // Lo word.
        return word;
    } // End of function printHex4.


    this.signalProgLoaded = function() {
        GPIB_STATE = 3; // File loaded and seen the correct primary and secondary GPIB addresses.               
        if( this.sbyteslength > 0 )
        this.sbytesindex = 0; // Start at the beginning of the desired 'program' to be loaded.
    }

/*
    function GPIBlog(tekobj) {
        var flagstr = "";
        var gpibstr = "";

        // GPIB signals
        GPIB_IFC_OUT ? signalProgLoadedflagstr += "IF " : flagstr += "-- ";
        GPIB_REN_OUT ? flagstr += "RN " : flagstr += "-- ";
        GPIB_ATN_OUT ? flagstr += "AT " : flagstr += "-- ";
        GPIB_SRQ_IN ? flagstr += "SQ " : flagstr += "-- ";
        (GPIB_EOI_OUT || GPIB_EOI_IN) ? flagstr += "EI " : flagstr += "-- ";
        (GPIB_DAV_OUT || GPIB_DAV_IN) ? flagstr += "DA " : flagstr += "-- ";
        (GPIB_NRFD_OUT || GPIB_NRFD_IN) ? flagstr += "NR " : flagstr += "-- ";
        (GPIB_NDAC_OUT || GPIB_NDAC_IN) ? flagstr += "ND " : flagstr += "  ";

        // GPIB comands
        if (GPIB_ATN_OUT) {
            if ((GPIB_DATA_OUT > 0x20) && (GPIB_DATA_OUT < 0x40)) {
                gpibstr = tekobj.printHex2(GPIB_DATA_OUT) + " MLA";
            }
            if ((GPIB_DATA_OUT > 0x40) && (GPIB_DATA_OUT < 0x60)) {
                gpibstr = tekobj.printHex2(GPIB_DATA_OUT) + " MTA";
            }else if ((GPIB_DATA_OUT > 0x5F) && (GPIB_DATA_OUT < 0x80)) {
                gpibstr = tekobj.printHex2(GPIB_DATA_OUT) + " MSA";
            }
        }else{
            if (GPIB_LISTEN && GPIB_DAV_IN) {
                gpibstr = tekobj.printHex2(GPIB_DATA_IN) + " data in";
            }
            if (GPIB_TALK && GPIB_DAV_OUT) {
                gpibstr = tekobj.printHex2(GPIB_DATA_OUT) + " data out";
            }
        }

        console.log(flagstr + gpibstr);

    }
*/

    // **********************
    // ***                ***
    // ***  PROCESS_GPIB  ***
    // ***                ***
    // **********************
    
    this.PROCESS_GPIB = function() {

//      GPIBlog(this);


        /*
        console.log( 'PROCESS_GPIB:' );

        if( GPIB_TALK   ) console.log( ' TALK   -' );
        if( GPIB_LISTEN ) console.log( ' LISTEN -' );
    
        console.log( ' IFC=' ); this.printHex1( GPIB_IFC_OUT );
        console.log( ' REN=' ); this.printHex1( GPIB_REN_OUT );
        console.log( ' ATN=' ); this.printHex1( GPIB_ATN_OUT );
        console.log( ' SRQ=' ); this.printHex1( GPIB_SRQ_IN  );

        if( GPIB_TALK ) {
        console.log( ' DATA=0x'  ); this.printHex2( GPIB_DATA_OUT );
        console.log( ' EOI='     ); this.printHex1( GPIB_EOI_OUT  );
        console.log( ' DAV='     ); this.printHex1( GPIB_DAV_OUT  );
        console.log( ' NRFD='    ); this.printHex1( GPIB_NRFD_IN  );
        console.log( ' NDAC='    ); this.printHex1( GPIB_NDAC_IN  );
        } // End if GPIB_TALK.

        if( GPIB_LISTEN ) {
        console.log( ' DATA=0x'  ); this.printHex2( GPIB_DATA_IN );
        console.log( ' EOI='     ); this.printHex1( GPIB_EOI_IN   );
        console.log( ' DAV='     ); this.printHex1( GPIB_DAV_IN   );
        console.log( ' NRFD='    ); this.printHex1( GPIB_NRFD_OUT );
        console.log( ' NDAC='    ); this.printHex1( GPIB_NDAC_OUT );
        } */ // End if GPIB_LISTEN.
        
        // Process data from the 4051 to the GPIB.
        if( GPIB_TALK ) {
        
            if( (GPIB_DAV_OUT == 1) && (GPIB_NDAC_IN == 1) ) {

/*
                if ( GPIB_EOI_OUT == 1 ) {
                    console.log( "EOI signalled! (" + this.printHex2(GPIB_DATA_OUT) + ")" );
                }
*/

/* PROBABLY NOT REQUIRED
                // WRITE has no CR or EOI terminator so we complete the process here
                if (ADDR_SECONDARY == 0x6F) {
                    gpib.call(ADDR_PRIMARY, ADDR_SECONDARY);
                    gpib.clearOutputBuffer();
                }
*/
            
                // Some GPIB command data for me to process.

                if( GPIB_ATN_OUT == 1 ) {

                    // Its a PRIMARY listen (LAD) or talk (TAD) address
                    if ( (GPIB_DATA_OUT > 0x20) && (GPIB_DATA_OUT < 0x60) ) {

                        ADDR_PRIMARY = GPIB_DATA_OUT;

                        if ( GPIB_DATA_OUT == 0x5F ) { // 0x5F == 95 == UNTALK.

                            if( GPIB_STATE == 0 ) {
                        
                                // Ignore as no file loaded.
                            
                            } else {
                        
                                GPIB_STATE = 1; // Force to 'waiting for the correct GPIB Primary Address'.
                            
                            } // End if.

                            ADDR_PRIMARY = 0;
                            ADDR_SECONDARY = 0;
                        
                        } // End if looking for GPIB 'UNTALK' command.


                    // Its a SECONDARY address command
                    }else if ( (GPIB_DATA_OUT > 0x5F) && (GPIB_DATA_OUT < 0x80) ) { // Secondary address

                        ADDR_SECONDARY = GPIB_DATA_OUT;

                        if (ADDR_PRIMARY && ADDR_SECONDARY) {
                        
                            if (ADDR_PRIMARY>0x20 && ADDR_PRIMARY<0x3F){    // Device listen
                                
                                // Clear output buffer ready for sending data
                                gpib.clearOutputBuffer();
                            
                            }

                            if (ADDR_PRIMARY>0x40 && ADDR_PRIMARY<0x5F){    // Device talk
                            
                                // Call the primary address with the relevant command
                                gpib.call(ADDR_PRIMARY, ADDR_SECONDARY);

                            }

                        } // ADDR_PRIMARY && ADDR_SECONDARY


                        //console.log( 'PROCESS_GPIB: COMMAND=0x' ); this.printHex2( GPIB_DATA_OUT ); this.println('');

                    }   // End decoding GPIB byte during ATN


                } // End GPIB_ATN_OUT = 1

                // Send some parameter or data
                if( GPIB_ATN_OUT == 0 ) {

                    if ( ADDR_PRIMARY && ADDR_SECONDARY) {
                    
                    
                        if (ADDR_SECONDARY == 0x6F) {
//                          gpib.append = GPIB_DATA_OUT;
                            gpib.sendByte = GPIB_DATA_OUT;
                            gpib.call(ADDR_PRIMARY, ADDR_SECONDARY);
                        }else{
                            gpib.append = GPIB_DATA_OUT;
                            if (GPIB_EOI_OUT) {
                                gpib.call(ADDR_PRIMARY, ADDR_SECONDARY);
                                gpib.clearOutputBuffer();
                            }                       
                        }

                    } // END of ADDR_PRIMARY && ADDR_SECONDARY

                } // End of GPIB_ATN_OUT = 0


            } // End GPIB_DAV_OUT / GPIB_NDAC_IN (outbound data to process).

            GPIB_NDAC_IN = GPIB_DAV_OUT ^ 0x01; // Invert before return.                
        
        } // End of GPIB_TALK.
        

        if( GPIB_LISTEN ) {

            if( GPIB_ATN_OUT == 0 ) {

                if ( ADDR_PRIMARY && ADDR_SECONDARY ) {
                
                    // Ready to read the GPIB buffer
                    GPIB_STATE = 10;

                } // End of ADDR_PRIMARY && ADDR_SECONDARY

            } // End of GPIB_ATN_OUT = 0

        } // End of GPIB_LISTEN.
        
//      GPIB_NDAC_IN = GPIB_DAV_OUT ^ 0x01; // Invert before return.

    } // End of function PROCESS_GPIB.

    // *******************
    // ***             ***
    // ***  POLL_GPIB  ***
    // ***             ***
    // *******************
    
    this.POLL_GPIB = function() {
    
        if( GPIB_LISTEN ) {
        
            if( (GPIB_NDAC_OUT == 0) && (GPIB_NRFD_OUT == 1) && (GPIB_DAV_IN == 0) && (GPIB_STATE == 10) ) {
//console.log("Data:", GPIB_DATA_IN);
                [GPIB_DATA_IN, GPIB_EOI_IN] = gpib.poll;
                if (GPIB_EOI_IN === 1) {
                    GPIB_STATE = 0;
                    gpib.clearInputBuffer();
                }               
                GPIB_DAV_IN = 1;
                
            } else if( (GPIB_NDAC_OUT == 1) && (GPIB_DAV_IN == 1) ) {

                GPIB_DAV_IN = 0; // Clear the data available flag.

                GPIB_EOI_IN = 0; // Clear the EOI flag. WARNING: This needs to be here to permit a <BREAK> to occur when commanded by the human!
                
                //console.log( 'GPIB: >>>>>>>>>>>>>>>>>>>>>>>>>> Cleared the EOI and DAV flag...' );
                
            } else {
            
                // TODO:
            
            } // End if.
            
        } // End if GPIB_LISTEN.
        
    } // End of function POLL_GPIB.
    
    // ***************
    // ***         ***
    // ***  PEEKB  ***
    // ***         ***
    // ***************

    this.peekb = function( address ) {

        // Is this a read from an I/O device?
        if( (address >= 0x8780) && (address <= 0x87FF) ) {
        
            // YES
            
            switch( address ) {
            
                // ********************************
                // ***  U561 - Display (Y Axis) ***
                // ********************************
                
                case 0x878C :   if( PIA_U561_CRA & 0x04 ) {
                                    PIA_U561_CRA &= 0x3F; // Clear both interrupt bits.
                                    display.SCREEN( 'SOT' );
                                    return (PIA_U561_IRA & (PIA_U561_DDRA ^ 0xFF)) | (PIA_U561_ORA & PIA_U561_DDRA);
                                } else
                                    return PIA_U561_DDRA;
                                break;
                                
                case 0x878D :   return PIA_U561_CRA;
                                break;
                                
                case 0x878E :   if( PIA_U561_CRB & 0x04 ) {
                                    PIA_U561_CRB &= 0x3F; // Clear both interrupt bits.
                                    return (PIA_U561_IRB & (PIA_U561_DDRB ^ 0xFF)) | (PIA_U561_ORB & PIA_U561_DDRB);
                                } else
                                    return PIA_U561_DDRB;
                                break;
                                
                case 0x878F :   return PIA_U561_CRB;
                                break;
                                
                // ********************************
                // ***  U565 - Display (X Axis) ***
                // ********************************
                
                case 0x8794 :   if( PIA_U565_CRA & 0x04 ) {
                                    PIA_U565_CRA &= 0x3F; // Clear both interrupt bits.
                                    // 0x8794 must be XXXX01XX VPULSE-1 = '0', DRBUSY-0 = '1'.
                                    display.SCREEN( 'ADOT' );
                                    return (PIA_U565_IRA & (PIA_U565_DDRA ^ 0xFF)) | (PIA_U565_ORA & PIA_U565_DDRA);
                                } else
                                    return PIA_U565_DDRA;
                                break;
                                
                case 0x8795 :   return PIA_U565_CRA;
                                break;
                                
                case 0x8796 :   if( PIA_U565_CRB & 0x04 ) {
                                    PIA_U565_CRB &= 0x3F; // Clear both interrupt bits.
                                    return (PIA_U565_IRB & (PIA_U565_DDRB ^ 0xFF)) | (PIA_U565_ORB & PIA_U565_DDRB);
                                } else
                                    return PIA_U565_DDRB;
                                break;
                                
                case 0x8797 :   return PIA_U565_CRB;
                                break;
                                
                // ****************************
                // ***  U361 - Tape monitor ***
                // ****************************
                
                case 0x8798 :   if( PIA_U361_CRA & 0x04 ) {
                                    PIA_U361_CRA &= 0x3F; // Clear both interrupt bits.
                                    return (PIA_U361_IRA & (PIA_U361_DDRA ^ 0xFF)) | (PIA_U361_ORA & PIA_U361_DDRA);
                                } else
                                    return PIA_U361_DDRA;
                                break;
                                
                case 0x8799 :   return PIA_U361_CRA;
                                break;
                                
                case 0x879A :   if( PIA_U361_CRB & 0x04 ) {
                                    PIA_U361_CRB &= 0x3F; // Clear both interrupt bits.
                                    return (PIA_U361_IRB & (PIA_U361_DDRB ^ 0xFF)) | (PIA_U361_ORB & PIA_U361_DDRB);
                                } else
                                    return PIA_U361_DDRB;
                                break;
                                
                case 0x879B :   return PIA_U361_CRB;
                                break;
                                
                // ***********************
                // ***  U461 - Keybard ***
                // ***********************

/***** Random number generator mod              
                case 0x87A8 :   if( PIA_U461_CRA & 0x04 ) {
                                    PIA_U461_CRA &= 0x3F; // Clear both interrupt bits.
                                    // this.print('Reading U461 DRA value='); this.printHex2( (PIA_U461_IRA & (PIA_U461_DDRA ^ 0xFF)) | (PIA_U461_ORA & PIA_U461_DDRA) ); this.println('');
                                    // PIA_U461_IRA &= 0x7F; // TTY-0 = 0
                                    return (PIA_U461_IRA & (PIA_U461_DDRA ^ 0xFF)) | (PIA_U461_ORA & PIA_U461_DDRA);
                                } else
                                    return PIA_U461_DDRA;
                                break;
*/
// Random number generator mod
                case 0x87A8 :   if( PIA_U461_CRA & 0x04 ) {
                                    PIA_U461_CRA &= 0x3F; // Clear both interrupt bits.
                                    if( cpu.getLastPC() == 0x9716 ) {
                                        if( RND_KC_BODGE1 > 0 ) {
                                            RND_KC_BODGE1 = (RND_KC_BODGE1 - 1) & 0x3F; // Decrement if a count in progress.
                                        } else {
                                            RND_KC_BODGE1 = RND_KC_BODGE0; // Take a snapshot.
                                        } // End if.
                                        return RND_KC_BODGE1; // The result of the random keyboard counter is...
                                    } else
                                        return (PIA_U461_IRA & (PIA_U461_DDRA ^ 0xFF)) | (PIA_U461_ORA & PIA_U461_DDRA);
                                } else
                                    return PIA_U461_DDRA;
                                break;
// Random number generator mod
                                
                case 0x87A9 :   // this.print('Reading U461 CRA value='); this.printHex2( PIA_U461_CRA ); this.println('');
                                return PIA_U461_CRA;
                                break;
                                
                case 0x87AA :   if( PIA_U461_CRB & 0x04 ) {
                                    PIA_U461_CRB &= 0x3F; // Clear both interrupt bits.
                                    // 0x87AA must be XXXX1XXX LOAD-0 = '1'.
                                    // 0x87AA must be XXXX1X11 LOAD-0 = '1', CTRL-0 = '1', SHIFT-0 = '1'.
                                    PIA_U461_IRB  = 0x08 | ((this.KBD_CTRL_0 & 0x01) << 1) | ((this.KBD_SHIFT_0 & 0x01) << 0);
                                    PIA_U461_IRB &= 0xEF; // Clear out EOI-1 input (PB4).
                                    PIA_U461_IRB |= ((GPIB_EOI_IN & 0x01) << 4); // Merge in EOI-1 input on PB4.
                                    return (PIA_U461_IRB & (PIA_U461_DDRB ^ 0xFF)) | (PIA_U461_ORB & PIA_U461_DDRB);
                                } else
                                    return PIA_U461_DDRB;
                                break;
                                
                case 0x87AB :   return PIA_U461_CRB;
                                break;
                                
                // ********************
                // ***  U265 - GPIB ***
                // ********************

                case 0x87B0 :   if( PIA_U265_CRA & 0x04 ) {
                                    PIA_U265_CRA &= 0x3F; // Clear both interrupt bits.
                                    PIA_U265_IRA = GPIB_DATA_IN;
                                    // this.print( 'DER: TEKTRONIX4051.js -' );
                                    // this.print( ' GPIB Data input = 0x' );
                                    // this.printHex2( (PIA_U265_IRA & (PIA_U265_DDRA ^ 0xFF)) | (PIA_U265_ORA & PIA_U265_DDRA) );
                                    // this.println('');
                                    return (PIA_U265_IRA & (PIA_U265_DDRA ^ 0xFF)) | (PIA_U265_ORA & PIA_U265_DDRA);
                                } else
                                    return PIA_U265_DDRA;
                                break;
                                
                case 0x87B1 :   return PIA_U265_CRA;
                                break;
                                
                case 0x87B2 :   if( PIA_U265_CRB & 0x04 ) {
                                    PIA_U265_CRB &= 0x3F; // Clear both interrupt bits.
                                    this.POLL_GPIB();
                                    PIA_U265_IRB = ( (GPIB_NDAC_IN & 1) << 7 ) |
                                                        ( (GPIB_DAV_IN  & 1) << 6 ) |
                                                        ( (GPIB_SRQ_IN  & 1) << 5 ) |
                                                        ( (GPIB_NRFD_IN & 1) << 4 ) ; // PB3..PB0 are outputs.
                                    // this.print( 'DER: TEKTRONIX4051.js -' );
                                    // this.print( ' GPIB Control input = 0x' );
                                    // this.printHex2( (PIA_U265_IRB & (PIA_U265_DDRB ^ 0xFF)) | (PIA_U265_ORB & PIA_U265_DDRB) );
                                    // this.println('');
                                    return (PIA_U265_IRB & (PIA_U265_DDRB ^ 0xFF)) | (PIA_U265_ORB & PIA_U265_DDRB);
                                } else
                                    return PIA_U265_DDRB;
                                break;
                                
                case 0x87B3 :   return PIA_U265_CRB;
                                break;
                                
                // **************
                // ***  ELSE  ***
                // **************
                                                
                default :       return 0x00;
                                break;
                
            } // End of switch address.
            
            // !!! WE SHOULD NEVER GET HERE !!!
                /*      
            if(        (address >= 0x878C) && (address <= 0x878F) ) {
               this.print( 'DER: TEKTRONIX4051.js - Reading from PIA Y-AXIS/TAPE address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
               return 0xFF;
            } else if( (address >= 0x8794) && (address <= 0x8797) ) { 
               this.print( 'DER: TEKTRONIX4051.js - Reading from PIA X-AXIS address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
               // 0x8794 must be XXXX01XX VPULSE-1 = '0', DRBUSY-0 = '1'.
               if( address == 0x8794 ) return 0x04;
               return 0x00;
            } else if( (address >= 0x8798) && (address <= 0x879B) ) { 
               this.print( 'DER: TEKTRONIX4051.js - Reading from PIA TAPE/JOYSTICK address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
            } else if( (address >= 0x87A8) && (address <= 0x87AB) ) { 
               this.print( 'DER: TEKTRONIX4051.js - Reading from PIA KEYBOARD/STATUS LAMPS address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
               // 0x87AA must be XXXX1XXX LOAD-0 = '1'
               if( address == 0x87AA ) return 0x08;
               return 0x00;
            } else if( (address >= 0x87B0) && (address <= 0x87B3) ) {
               this.print( 'DER: TEKTRONIX4051.js - Reading from PIA GPIB address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
            } else { 
               this.print( 'DER: TEKTRONIX4051.js - Reading from an unidentified I/O address ' );
               this.printHex4( address );
               this.print( ' from the instruction at address ' );
               this.printHex4( this.last_PC );
               this.println( '' );
            } // End if
            */
            return 0x00; // BODGE
        
        // Is this a read from ROM?
        } else if( (address >= 0x8000) && (address <= 0xFFFF) ) {
                    
            // Check for bank switching being enabled...
            if( (address >= 0x8800) && (address < 0xA800) && (BANK_SWITCH_SELECTOR > 0) ) {
//console.log("Addr: " +  this.printHex4(address), "Bank switch enabled.");
                // BANK SWITCH ENABLED and not the default 4051 ROM set.
                switch(BANK_SWITCH_SELECTOR) {
                    case 1 :
                        // Overflow ROM U101/U1 (747)
                        if( (address >= 0x8800) && (address < 0x9000) ) return rom.ROM747[ address - 0x8800 ];
                        // Overflow ROM U201/U11 (748)
                        if( (address >= 0x9000) && (address < 0x9800) ) return rom.ROM748[ address - 0x9000 ];
                        break;
                    case 2 :
                        // Ignore
                        break;
                    case 3 :
                        // Ignore
                        break;
                    case 4 :
                        // Rom Backpack Left Slot
                        if( (address >= 0x8800) && (address < 0xA800) ) return rom.DERROML[ address - 0x8800 ];
                        break;
                    case 5 :
                        // ROM Backpack Right Slot
                        if( (address >= 0x8800) && (address < 0xA800) ) return rom.DERROMR[ address - 0x8800 ];
                        break;
                    case 6 :
                        // 4051 ROM Expander Left Bank
//console.log("Addr: " +  this.printHex4(address), "Bank switch: " + BANK_SWITCH_SELECTOR, "BSXaddr: " + BSX_ADDRESS);
                        if( (address >= 0x8800) && (address < 0xA800) ) return romexp.RomExpLeftBank(address, BSX_ADDRESS);
                        break;
                    case 7 :
                        // 4051 ROM Expander Right Bank
//console.log("Addr: " +  this.printHex4(address), "Bank switch: " + BANK_SWITCH_SELECTOR, "BSXaddr: " + BSX_ADDRESS);
                        if( (address >= 0x8800) && (address < 0xA800) ) return romexp.RomExpRightBank(address, BSX_ADDRESS);
                        break;
                    default :
                        // Unknown bank switch mapping.
                        return 0x00;
                }


    
                // BANK SWITCH ENABLED and not the default 4051 ROM set.
/*              
                if( (address >= 0x8800) && (address < 0x9000) && (BANK_SWITCH_SELECTOR == 1) ) {
console.log("Addr: " + this.printHex4(address), "Bank switch = " + 1);              
                    // U101/U1 (747)
                    return rom.ROM747[ address - 0x8800 ];
                    
                } else if( (address >= 0x9000) && (address < 0x9800) && (BANK_SWITCH_SELECTOR == 1) ) {
console.log("Addr: " + this.printHex4(address), "Bank switch = " + 1);
                    // U201/U11 (748)
                    return rom.ROM748[ address - 0x9000 ];
                } else if( (address >= 0x8800) && (address < 0xA800) && (BANK_SWITCH_SELECTOR == 4) ) {
console.log("Addr: " + this.printHex4(address), "Bank switch = " + 4);
                    // My ROM BS(L).
                    return rom.DERROM[ address - 0x8800 ];
                } else {
console.log("Addr: " + this.printHex4(address), "Bank switch = unknown");
                    // Unknown bank switch mapping.
                    return 0x00;
                }
*/
            } 
            else {
                return rom.ROM[ address - 0x8000 ];
            }
        }
        // This is a read from RAM
        else {
            return ram[ address ];
        }
            
    } // End of function peekb.
    
    // ***************
    // ***         ***
    // ***  POKEB  ***
    // ***         ***
    // ***************

    this.pokeb = function( address, value ) {

        // Is this a write to an I/O device?
        if( (address >= 0x8780) && (address <= 0x87FF) ) {
        
            // YES

            switch( address ) {
            
                // ****************************************************
                // ***  U561 - Display (Y Axis), Tape control (CB1) ***
                // ****************************************************
                
                case 0x878C :   if( PIA_U561_CRA & 0x04 ) {
                                    // PIAHY
                                    PIA_U561_ORA = value;
                                } else
                                    PIA_U561_DDRA = value;
                                break;
                                
                case 0x878D :   PIA_U561_CRA = value & 0x3F;
                                // this.print('U561 CRA = '); this.printHex2(value);this.println('');
                                break;
                                
                case 0x878E :   if( PIA_U561_CRB & 0x04 ) {
                                    // PIALY
                                    PIA_U561_ORB = value;
                                } else
                                    PIA_U561_DDRB = value;
                                break;
                                
                case 0x878F :   PIA_U561_CRB = value & 0x3F;
                                // this.print('U561 CRB = '); this.printHex2(value);this.println('');
                                break;
                                
                // *********************************
                // ***  U565 - Display (X Axis)  ***
                // *********************************
                
                case 0x8794 :   if( PIA_U565_CRA & 0x04 ) {
                                    // PIAHX
                                    if( ((value & 0x10) == 0) && ((PIA_U565_ORA & 0x10) != 0) ) {
                                        //this.println( 'DER: TEKTRONIX4051.js - ERASE CRT' );
                                        // Assert DRBUSY-O bit active low so CPU knows display is busy erasing
                                        PIA_U565_IRA &= 0xFB;
                                        display.ERASE();
                                    } // End if
                                    if( ((value & 0x20) == 0) && ((PIA_U565_ORA & 0x20) != 0) ) {
                                        //this.println( 'DER: TEKTRONIX4051.js - COPY CRT' ); 
                                        display.COPY();
                                    } // End if
                                    PIA_U565_ORA = value;
                                } else
                                    PIA_U565_DDRA = value;
                                break;
                                
                case 0x8795 :   PIA_U565_CRA = value & 0x3F;
                                // this.print('U565 CRA = '); this.printHex2(value);this.println('');
                                break;
                                
                case 0x8796 :   if( PIA_U565_CRB & 0x04 ) {
                                    // PIALX
                                    PIA_U565_ORB = value;
                                    display.SCREEN( 'BUFCLK' );
                                } else
                                    PIA_U565_DDRB = value;
                                break;
                                
                case 0x8797 :   PIA_U565_CRB = value & 0x3F;
                                // this.print('U565 CRB = '); this.printHex2(value);this.println('');
                                break;
                                
                // *******************************************
                // ***  U361 - Tape control, Status lights ***
                // *******************************************
                
                case 0x8798 :   if( PIA_U361_CRA & 0x04 ) {
                                    PIA_U361_ORA = value;
                                } else
                                    PIA_U361_DDRA = value;
                                break;
                                
                case 0x8799 :   PIA_U361_CRA = value & 0x3F;
                                break;
                                
                case 0x879A :   if( PIA_U361_CRB & 0x04 ) {
                                    PIA_U361_ORB = value;
                                } else
                                    PIA_U361_DDRB = value;
                                break;
                                
                case 0x879B :   PIA_U361_CRB = value & 0x3F;
                                break;
                                
                // **************************************************
                // ***  U461 - Keyboard, Speaker, GPIB (EOI, REN) ***
                // **************************************************
                
                case 0x87A8 :   if( PIA_U461_CRA & 0x04 ) {
                                    PIA_U461_ORA = value;
                                } else
                                    PIA_U461_DDRA = value;
                                break;
                                
                case 0x87A9 :   PIA_U461_CRA = value & 0x3F;
                                break;
                                
                case 0x87AA :   if( PIA_U461_CRB & 0x04 ) {
                                    var opb7 = (PIA_U461_ORB >>> 7) & 0x01;     // Last bit of previous value
                                    var npb7 = (value        >>> 7) & 0x01;     // Last bit of current value
                                    if( opb7 != npb7 ) {    // If its changed since last iteration
                                        if (this.audioOn) beep.play(); // This works - but not too well!
                                    } // End if.
/*
                                    var spb7 = (value >>> 7) & 1;
                                    if (spb7 == 1) {
                                        startOsc();
                                    }else{
                                        stopOsc();
                                    }
*/
                                    PIA_U461_ORB = value;
                                    GPIB_EOI_OUT = (PIA_U461_ORB >>> 4) & 0x01;
                                    GPIB_REN_OUT = (PIA_U461_ORB >>> 7) & 0x01;
                                    // BUSY indicator
                                    if ((PIA_U461_ORB >>> 7) & 0x01) {
                                        document.getElementById('status_busy').style.color = "#00EE00";
                                    }
                                    else {
                                        document.getElementById('status_busy').style.color = "#005500";
                                    }
                                    // I/O indicator
                                    if ((PIA_U461_ORB >>> 6) & 0x01) {
                                        document.getElementById('status_io').style.color = "#00EE00";
                                    }
                                    else {
                                        document.getElementById('status_io').style.color = "#005500";
                                    }
                                    // BREAK indicator
                                    if ((PIA_U461_ORB >>> 5) & 0x01) {
                                        document.getElementById('status_break').style.color = "#00EE00";
                                    }
                                    else {
                                        document.getElementById('status_break').style.color = "#005500";
                                    }
                                    //@@@ this.print( ' REN-1 = '   ); this.print( (PIA_U461_ORB >>> 7) & 0x01 );
                                } else
                                    PIA_U461_DDRB = value;
                                break;
                                
                case 0x87AB :   PIA_U461_CRB = value & 0x3F;
                                break;
                                
                // ********************
                // ***  U265 - GPIB ***
                // ********************

                case 0x87B0 :   if( PIA_U265_CRA & 0x04 ) {                                 
                                    PIA_U265_ORA = value;
                                    GPIB_DATA_OUT = PIA_U265_ORA;
                                } else
                                    PIA_U265_DDRA = value;
                                break;
                                
                case 0x87B1 :   PIA_U265_CRA = value & 0x3F;
                                switch( (PIA_U265_CRA >>> 0) & 0x03 ) { // CA1 control.
                                  case 0 : /* this.println( 'U265: CA1 - Input Masked.'  ); */ break;
                                  case 1 : /* this.println( 'U265: CA1 - Input Lo edge.' ); */ break;
                                  case 2 : /* this.println( 'U265: CA1 - Input Masked.'  ); */ break;
                                  case 3 : /* this.println( 'U265: CA1 - Input Hi edge.' ); */ break;
                                } // End of switch.
                                switch( (PIA_U265_CRA >>> 3) & 0x07 ) { // CA2 control.
                                  case 0 : /* this.println( 'U265: CA2 - Input Masked.'  ); */ break;
                                  case 1 : /* this.println( 'U265: CA2 - Input Lo edge.' ); */ break;
                                  case 2 : /* this.println( 'U265: CA2 - Input Masked.'  ); */ break;
                                  case 3 : /* this.println( 'U265: CA2 - Input Hi edge.' ); */ break;
                                  case 4 : /* this.println( 'U265: CA2 - Output H/S#1.'  ); */ break;
                                  case 5 : /* this.println( 'U265: CA2 - Output H/S#2.'  ); */ break;
                                  case 6 : GPIB_DAV_OUT = 0; this.PROCESS_GPIB(); break;
                                  case 7 : GPIB_DAV_OUT = 1; this.PROCESS_GPIB(); break;
                                } // End of switch.
                                break;
                                
                case 0x87B2 :   if( PIA_U265_CRB & 0x04 ) {
                                    PIA_U265_ORB = value;
                                    GPIB_NDAC_OUT =   (PIA_U265_ORB >>> 7) & 0x01;
                                    GPIB_NRFD_OUT =   (PIA_U265_ORB >>> 4) & 0x01;
                                    GPIB_ATN_OUT  = ( (PIA_U265_ORB >>> 3) & 0x01 ) ^ 0x01; // Active low signal.
                                    GPIB_IFC_OUT  =   (PIA_U265_ORB >>> 1) & 0x01;
                                    GPIB_EOI_OUT  =   (PIA_U265_ORB >>> 0) & 0x01;
                                    this.PROCESS_GPIB();
                                } else
                                    PIA_U265_DDRB = value;
                                break;
                                
                case 0x87B3 :   PIA_U265_CRB = value & 0x3F;
                                switch( (PIA_U265_CRB >>> 0) & 0x03 ) { // CB1 control.
                                  case 0 : /* this.println( 'U265: CB1 - Input Masked.'  ); */ break;
                                  case 1 : /* this.println( 'U265: CB1 - Input Lo edge.' ); */ break;
                                  case 2 : /* this.println( 'U265: CB1 - Input Masked.'  ); */ break;
                                  case 3 : /* this.println( 'U265: CB1 - Input Hi edge.' ); */ break;
                                } // End of switch.
                                switch( (PIA_U265_CRB >>> 3) & 0x07 ) { // CB2 control.
                                  case 0 : /* this.println( 'U265: CB2 - Input Masked.'  ); */ break;
                                  case 1 : /* this.println( 'U265: CB2 - Input Lo edge.' ); */ break;
                                  case 2 : /* this.println( 'U265: CB2 - Input Masked.'  ); */ break;
                                  case 3 : /* this.println( 'U265: CB2 - Input Hi edge.' ); */ break;
                                  case 4 : /* this.println( 'U265: CB2 - Output H/S#1.'  ); */ break;
                                  case 5 : /* this.println( 'U265: CB2 - Output H/S#2.'  ); */ break;
                                  case 6 : GPIB_TALK = 0; GPIB_LISTEN = 1; this.PROCESS_GPIB(); break;
                                  case 7 : GPIB_TALK = 1; GPIB_LISTEN = 0; this.PROCESS_GPIB(); break;
                                } // End of switch.
                                break;
                    
                // ******************************
                // ***  BANK SWITCH SELECTOR  ***
                // ******************************

                case 0x87C0 :   BSX_ADDRESS = value & 0x07; 
                                BANK_SWITCH_SELECTOR = (value >>> 3) & 0x07; 
                                break;
                            
                // **************
                // ***  ELSE  ***
                // **************
                                                
                default :       break;
                
            } // End of switch address.
            
            // No going passed here!
            //
            return;
            /*
            if(        (address >= 0x878C) && (address <= 0x878F) ) {
                this.print( 'DER: TEKTRONIX4051.js - Writing to   PIA Y-AXIS/TAPE address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } else if( (address >= 0x8794) && (address <= 0x8797) ) { 
                this.print( 'DER: TEKTRONIX4051.js - Writing to   PIA X-AXIS address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } else if( (address >= 0x8798) && (address <= 0x879B) ) { 
                this.print( 'DER: TEKTRONIX4051.js - Writing to   PIA TAPE/JOYSTICK address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } else if( (address >= 0x87A8) && (address <= 0x87AB) ) { 
                this.print( 'DER: TEKTRONIX4051.js - Writing to   PIA KEYBOARD/STATUS LAMPS address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } else if( (address >= 0x87B0) && (address <= 0x87B3) ) {
                this.print( 'DER: TEKTRONIX4051.js - Writing to   PIA GPIB address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } else { 
                this.print( 'DER: TEKTRONIX4051.js - Writing to an unidentified I/O address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
            } // End if
            */
        } else {
        
            // NO - must be RAM or ROM then...
            
            // Check for a stupid write to the ROM!
            if( address >= 0x8000 ) {

                // ********************************************
                // ***                                      ***
                // ***  DUMB - Why are you writing to ROM?  ***
                // ***                                      ***
                // ********************************************
                //
                /*
                this.print( 'DER: TEKTRONIX4051.js - Writing to ROM at address ' );
                this.printHex4( address );
                this.print( ' of ' ); 
                this.printHex2( value );
                this.print( ' from the instruction at address ' );
                this.printHex4( this.last_PC );
                this.println( '' );
                */
            } else {
            
                ram[ address ] = value;
                
            } // End if.
            
        } // End if.
        
    } // End of function pokeb.
    
    // ***************
    // ***         ***
    // ***  @@@@@  ***
    // ***         ***
    // ***************
    
    
    this.getDisplayControl = function() {
        let X_CHAR = (PIA_U561_ORA >>> 5) & 0x07;
        let Y_CHAR = (PIA_U561_ORA >>> 2) & 0x07;
        
        let VECTOR_0 = (PIA_U565_ORA >>> 6) & 1;
        let VEN_1    = (PIA_U565_ORA >>> 7) & 1;
            
        let new_X = ((PIA_U565_ORA & 0x03) << 8) | PIA_U565_ORB;
        let new_Y = ((PIA_U561_ORA & 0x03) << 8) | PIA_U561_ORB;
        
        return [X_CHAR, Y_CHAR, VECTOR_0, VEN_1, new_X, new_Y];
    }
    
    this.displayReady = function() {
        // Deassert DRBUSY-O bit active low
        PIA_U565_IRA |= 0x04;
    }

/*    
    this.keyboardData = function(type, key) {
        switch( type ) {
            case 'PRESS' :
                PIA_U461_IRA  = ((this.KBD_TTY_0 & 0x01) << 7) | (key & 0x7F);
                if (this.audioOn) click.play(); // This works - but not too well!
                break;
            case 'RELEASE' :
                PIA_U461_IRA  = 0x80 | (this.KBD_TTY_0 & 0x01) << 7; // Just the TTY-0 signal.
                break;
            default :
                break;
        }
    }
*/
    
    this.keyboardPress = function(key) {
        // Set or unset shift bit
//      (this.KBD_SHIFT_0 & 0x01) ? (PIA_U461_IRB |= 0x01) : (PIA_U461_IRB &= ~0x01);
//      console.log("Key: ", key);
        // Set CapsLock and key value
        PIA_U461_IRA  = ((this.KBD_TTY_0 & 0x01) << 7) | (key & 0x7F) ;
        if (this.audioOn) click.play(); // This works - but not too well!
    }


    this. keyboardRelease = function() {
        PIA_U461_IRA  = 0x80 | (this.KBD_TTY_0 & 0x01) << 7; // Just the TTY-0 signal.
    }


    // For some reason, asserting the interrupt on an actual keyboard event
    // does not produce an immediate response in emulation so the latency
    // to detect a press is unacceptably long, so we just fire the keyboard
    // interrupt on a regular refresh interval
    function keyboardInterrupt() {
        PIA_U461_CRA |= 0x80; // KEY-I feeds into CA1 to set IRQA1.
        // Random number generator mod
        RND_KC_BODGE0 = (RND_KC_BODGE0 + 1) & 0x3F;
        // Random number generator mod
    }
 
    this.checkIRQ = function() {
        return  (PIA_U461_CRA & 0xC0) | (PIA_U461_CRB & 0xC0) |
                (PIA_U565_CRA & 0xC0) | (PIA_U565_CRB & 0xC0) |
                (PIA_U265_CRA & 0xC0) | (PIA_U265_CRB & 0xC0) ;
    }
    
    this.checkNMI = function() {
        return  (PIA_U561_CRA & 0xC0) | (PIA_U561_CRB & 0xC0) |
                (PIA_U361_CRA & 0xC0) | (PIA_U361_CRB & 0xC0) ;
    }
    
    var exec_interval;
    var key_interval;
    var dvst_emulate_interval;

    this.execute_start = function() {
        
        exec_interval = setInterval( cpu.execute, 10 ); // 100 intervals per second
        key_interval = setInterval( keyboardInterrupt, 10 ); // 100 intervals per second
        dvst_emulate_interval = setInterval( display.dvst_emulate, 100 );

        
        // Deassert DRBUSY-O bit active low so display is ready immediately for CPU to use
        PIA_U565_IRA |= 0x04;
    }

/* Original keyCode version
    this.execute_fcnkey = function(keyCode, press) {
        if (press) {
            var ev = new KeyboardEvent('keydown', {'keyCode':keyCode,'which':keyCode});
        }else{
            var ev = new KeyboardEvent('keyup', {'keyCode':keyCode,'which':keyCode});
        }
        windowObj.dispatchEvent(ev);
//      keyboard.FcnKey( keyCode , press );
    }
*/


    this.fcnkey_action = async function(keyVal){
        function wait4key(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        var ev = new CustomEvent('kdbePress', { detail: {'scancode': keyVal, 'type': 'keydown' } });
        windowObj.dispatchEvent(ev);
        await wait4key(kbsf);
        ev = new CustomEvent('kdbeRelease', { detail: {'scancode': keyVal, 'type': 'keyup' } });
        await wait4key(kbsf);
        windowObj.dispatchEvent(ev);
    }


    this.fcnkey_press = function(keyCode) {
        var ev = new CustomEvent('kdbePress', { detail: {'scancode': keyCode, 'type': 'keydown' } });
        windowObj.dispatchEvent(ev);
    }


    this.fcnkey_release = function(keyCode) {
      var ev = new CustomEvent('kdbeRelease', { detail: {'scancode': keyCode, 'type': 'keyup' } });
      windowObj.dispatchEvent(ev);
    }


    this.autoload = async function(){
        
        // Autoload command sequence: FIND @5:1 <CR> OLD@5: <CR> RUN <CR>
        let cmd = new Array(0x46,0x49,0x4E,0x44,0x40,0x35,0x3A,0x31,0x0D,
                            0x4F,0x4C,0x44,0x40,0x35,0x3A,0x0D,
                            0x52,0x55,0x4E,0x0D);
//        console.log("Cmdlen: ",cmd.length);
//        console.log("Cmd: ", cmd);

        for (let i=0; i<cmd.length; i++){
            await this.fcnkey_action(cmd[i]);
        }

/*
        await this.fcnkey_action(cmd[0]);
        await sleepUntil(50);
        await this.fcnkey_action(cmd[1]);
        await sleepUntil(50);
        await this.fcnkey_action(cmd[2]);
        await sleepUntil(50);
        await this.fcnkey_action(cmd[3]);
        await sleepUntil(50);
*/

    }


    this.execute_copy = function() {
        display.COPY();
    }
    
    this.execute_stop = function() {
        clearInterval( exec_interval );
        clearInterval( key_interval );
        clearInterval( dvst_emulate_interval );
    }
    
    this.execute_reset = function() {
        cpu.reset();
        display.ERASE();
//        interruptCounter = 0;
    }
    
    this.execute_load = function( bytes ) {
    
        // Find program loader
        let loader;
        for (let i=0; i<gpib.deviceRegistry.length; i++) {
            let classname = gpib.deviceRegistry[i][1].constructor.name;
            if (classname === 'Loader') loader = gpib.deviceRegistry[i][1];
        }

        loader.loadFrom(bytes);
                    
        GPIB_STATE = 1; // File loaded.
        
    } // End of function execute_load.
    
    
    // Set the speed factor
    this.set_CPU_speed = function( sf ) {
        cpu.setIPI(sf);
        kbsf = 35 + (sf * 3);
    }
    

	this.set_disp_granularity = function(val) {
		if ( (val>0) && (val<4) ) {
			display.setPixelSize(val);
		}
	}

    // Local constructor
    {
        this.execute_reset();
    } // End of local constructor.

/*
    function startOsc(){
        if (this.audioOn) {
//        window.AudioContext = window.AudioContext || window.webkitAudioContext;
            ctx = new AudioContext();
            osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = 261.63;
            osc.start(0);
            osc.connect(ctx.destination);
        }
    }


    function stopOsc(){
        if (this.audioOn) {
            osc.stop(0);
        }
    }
*/

} // End of function TEKTRONIX4051.

// *********************
// ***               ***
// ***  END OF FILE  ***
// ***               ***
// *********************
