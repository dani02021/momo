// 1. Catch exception
try {
    noObj.doSomething()
} catch(e) {
    if (e instanceof ReferenceError) {
        console.log("reference error caught");
    }
}

// 2. Throw exception

try {
    throw new SyntaxError("You noob!");
} finally {
    console.log('idc');

    // 3. Assert

    console.assert(15 / 0 == -Infinity, {errorMsg: "Not quite right!"});
}