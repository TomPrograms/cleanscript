const path = require("path");
const fs = require("fs");
const Lexer = require("./src/lexer.js");
const Parser = require("./src/parser.js");
const Compiler = require("./src/compiler.js");

function findFilesInDir(base, ext, files, result) {
  files = files || fs.readdirSync(base);
  result = result || [];

  files.forEach(function (file) {
    var newbase = path.join(base, file);
    if (fs.statSync(newbase).isDirectory()) {
      result = findFilesInDir(newbase, ext, fs.readdirSync(newbase), result);
    } else {
      if (file.substr(-1 * (ext.length + 1)) == "." + ext) {
        result.push(newbase);
      }
    }
  });
  return result;
}

function convertCode(code) {
  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);

  const parser = new Parser();
  const AST = parser.parse(tokens);

  const compiler = new Compiler();
  const js = compiler.compile(AST);

  return js;
}

function compileFile(filepath, { prettify, minimise }) {
  let pathData = path.parse(filepath);
  let filename = pathData.name;
  let directory = pathData.dir;

  let js = fs.readFileSync(filepath).toString();

  var newPath = path.join(directory, filename + ".js");
  const compiled = convertCode(js);

  fs.writeFileSync(newPath, compiled);
}

function compileDir(dirpath, { prettify, minimise }) {
  let files = findFilesInDir(dirpath, "csc");

  files.forEach((file) => {
    compileFile(file, { prettify, minimise });
  });
}

module.exports.convertCode = convertCode;
module.exports.compileFile = compileFile;
module.exports.compileDir = compileDir;
