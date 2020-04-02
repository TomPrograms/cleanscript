const Lexer = require("./src/lexer.js");
const Parser = require("./src/parser.js")
const Compiler = require("./src/compiler.js");

const code = `
// function checkInScore(val, list):
//   function promiseInternal(resolve, reject):
//     resolve(val in list);

//   return new Promise(promiseInternal);

// var list = [1, 2, 3];
// var double = lambda (x, i) : list[i] = x * 2;
// list.forEach(double);

// const handlePromise = lambda (x) : console.log(x);
// checkInScore(4, list).then(handlePromise);

function checkValInVals(val=1, *vals=[1]):
  return val in vals;

checkValInVals(); // true
checkValInVals(2); // false
checkValInVals(2, [2,3]); // true
`;

const lexer = new Lexer();
const tokens = lexer.tokenize(code);

console.log(tokens);

const parser = new Parser();
const AST = parser.parse(tokens);

console.log(AST);
const compiler = new Compiler();
const js = compiler.compile(AST);

console.log(js);
