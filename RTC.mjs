
export class RTC {

    get read() {

        let d = new Date();

        let m = [ "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC" ];

	    let timeNow = "";

        timeNow += String(d.getDate()).padStart(2,'0');
		timeNow += "-";

	    timeNow += m[ d.getMonth() ];
		timeNow += "-";

		timeNow += String(d.getFullYear() % 100);
		timeNow += " ";

        timeNow += String(d.getHours()).padStart(2,'0');
	    timeNow += ":";

        timeNow += String(d.getMinutes()).padStart(2,'0');
		timeNow += ":";

        timeNow += String(d.getSeconds()).padStart(2,'0');

        return timeNow;
    }

}


