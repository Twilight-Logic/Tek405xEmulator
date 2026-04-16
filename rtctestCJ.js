// CommonJS module example

let rtc1 = require('./RTC');    // Requires RTC.js file

let clock = new(rtc1);

console.log("Time via CJ: " + clock.read);


