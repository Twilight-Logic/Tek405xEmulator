// ES6 module example

import { RTC } from "./RTC.mjs";    // Requires RTC.mjs file

let clock = new(RTC);

console.log("Time via ES: " + clock.read);


