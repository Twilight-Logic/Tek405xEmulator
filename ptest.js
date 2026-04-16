'use strict'
console.clear()

const powerOf = x => y => Math.pow(x, y)
const powerOfThree = powerOf(3)

function performanceCalc(fn, ...params) {
    const start = +new Date()
    const result = fn(...params)
    const end = +new Date()

    console.log(`Result: ${result}. Execution Time: ${end - start} ms`)
}

performanceCalc(powerOfThree, 2)
