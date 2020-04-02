const Lexer = require("./src/lexer.js");
const Parser = require("./src/parser.js")
const Compiler = require("./src/compiler.js");

const code = `

function asynctest:
  return Promise.resolve();

function handlepromise(x):
  console.log(x);

asynctest().then(handlepromise);
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
