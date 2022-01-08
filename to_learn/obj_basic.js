class Rectangle {
    constructor(height, width) {
      this.height = height;
      this.width = width;
    }
    // Getter
    get area() {
      return this.calcArea();
    }

    // Setter
    set name(nam) {
        if(nam == "Josh")
            this.first_name = "John"
        else this.first_name = nam
    }
    // Method
    calcArea() {
      return this.height * this.width;
    }
  }

  class Square extends Rectangle {
      constructor (side) {
          super(side, side)
      }
  }
  
  const square = new Rectangle(10, 10);
  
  console.log(square.area); // 100
  
  square.name = "Nik";

  console.log(square.first_name);

  square.name = "Josh";

  console.log(square.first_name);

  // You can add custom properties like in Python

  square.cool = true

  console.log(square.cool)

  // Inheritance
  realsquare = new Square(15)

  console.log(realsquare.area)

// Composition

const eat = function () {
    return {
        eat: () => { console.log('I am eating'); }
    }
}
const breathe = function () {
    return {
        breathe: () => { console.log('I am breathing'); }
    }
}
const swim = function () {
    return {
        swim: () => { console.log('I am swimming'); }
    }
}
const trick = function () {
    return {
        trick: () => { console.log('I am doing a trick'); }
    }
}

// This object has eat breathe and trick methods
// The object is 'composed' by these methods
const superMagician = ()=> {
 return Object.assign(
     {},
     eat(),
     breathe(),
     trick()
   );
}

// This object has eat breathe and swim methods
// The object is 'composed' by these methods
// Object.assign copies object property'values and
// puts them in another object 
const noviceMagician = () => {
 return Object.assign(
     {},
     eat(),
     breathe(),
     swim()
   );
}

let harry = superMagician();
let liv = noviceMagician();
