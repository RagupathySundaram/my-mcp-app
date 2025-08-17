console.log("Hello from sample script!");

function greet(name) {
  return `Hello, ${name}!`;
}

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);

console.log(`Sum of numbers: ${sum}`);
console.log(greet("User"));
