const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
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

function compileCode(code) {
  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);

  const parser = new Parser();
  const AST = parser.parse(tokens);

  const compiler = new Compiler();
  const js = compiler.compile(AST);

  return js;
}

function compileFile(filepath, options = {}) {
  let { prettify, minimise } = options;
  let pathData = path.parse(filepath);
  let filename = pathData.name;
  let directory = pathData.dir;

  let js = fs.readFileSync(filepath).toString();

  var newPath = path.join(directory, filename + ".js");
  const compiled = compileCode(js);

  fs.writeFileSync(newPath, compiled);
}

function compileDir(dirpath, options = {}) {
  let { prettify, minimise } = options;
  let files = findFilesInDir(dirpath, "csc");

  files.forEach((file) => {
    compileFile(file, { prettify, minimise });
  });
}

function isDir(path) {
  try {
    let stat = fs.lstatSync(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function compile(target, options = {}) {
  let { prettify, minimise } = options;
  if (isDir(target)) compileDir(target, { prettify, minimise });
  else compileFile(target, { prettify, minimise });
}

function watch(target, options = {}) {
  let { prettify, minimise } = options;
  if (isDir(target)) target = path.join(target, "/**/*.csc");

  const watcher = chokidar.watch(target);
  watcher.on("change", (path) => compile(path, { prettify, minimise }));
}

module.exports.compileCode = compileCode;
module.exports.compile = compile;
module.exports.compileFile = compileFile;
module.exports.compileDir = compileDir;
module.exports.watch = watch;
