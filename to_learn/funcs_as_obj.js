/*
Functions in JS are quite complex! There are many things which you can do
with functions. Functions are first-class objects like in Python.
They can have properties and methods inside them
*/

// 1. Functions passed to a function
function apply_func(v, f) {
    console.log( f(v) )
}

apply_func(-15, Math.abs)

// 2. Function as variable

// Anonymous function
var myFuncAnon = function() {
    console.log("my func!");
}

// Non anon function
var myFunc = function coolFunc() {
    console.log("my func!");
}

myFunc();

// 3. IIFE (Immediately invoked function expression)
(function(){
    console.log("What the f is IIFE?")
})();

// 4. Generator functions

function* myGenerator() {
    console.log("Magic!!!");
    yield 10;
    console.log("No Magic, its just iterator...");
    yield 15;
}

// generators are objects, so first you should initialize them
var gen = myGenerator()
console.log(gen.next()) // First yield
console.log(gen.next()) // Second yield
console.log(gen.next()) // Third yield? -> generator is done now

// Nested yield
function* anotherGenerator(i) {
    yield i + 1;
    yield i + 2;
    yield i + 3;
}
  
function* generator(i) {
    yield i;
    yield* anotherGenerator(i);
    yield i + 10;
}
  
var gen = generator(10);

console.log(gen.next().value); // 10
console.log(gen.next().value); // 11
console.log(gen.next().value); // 12
console.log(gen.next().value); // 13
console.log(gen.next().value); // 20

// Pass values into generators
function* passGenerator() {
    console.log(0);
    console.log(1, yield);
    console.log(2, yield);
    console.log(3, yield);
}

var gen = passGenerator()
gen.next()
gen.next('what')
gen.next('is')
gen.next('happening')

// => expression (lambda expression)

// The function is anonymous but we have pointer arrowFunc to call it!
let arrowFunc = (name, age) => {
    console.log(name + " is " + age + " years old.");
}

arrowFunc('Josh', 15)

// 5. Default values
function defval(ag = 14, consent = 18) {
    return ag < consent
}

console.log(defval())