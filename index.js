const path = require("path");
const fs = require("fs");

const chokidar = require("chokidar");
const prettier = require("prettier");

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

function compileCode(code, options) {
  let { prettify } = options;

  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);

  if (lexer.hadError) return;

  const parser = new Parser();
  const AST = parser.parse(tokens);

  if (parser.hadError) return;

  const compiler = new Compiler();
  let js = compiler.compile(AST);

  if (prettify) {
    js = prettier.format(js, { parser: "babel" });
  }

  return js;
}

function compileFile(filepath, options = {}) {
  let { prettify } = options;
  let pathData = path.parse(filepath);
  let filename = pathData.name;
  let directory = pathData.dir;

  let js = fs.readFileSync(filepath).toString();

  var newPath = path.join(directory, filename + ".js");
  const compiled = compileCode(js, { prettify });

  fs.writeFileSync(newPath, compiled);
}

function compileDir(dirpath, options = {}) {
  let { prettify } = options;
  let files = findFilesInDir(dirpath, "csc");

  files.forEach((file) => {
    compileFile(file, { prettify });
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
  let { prettify } = options;
  if (isDir(target)) compileDir(target, { prettify });
  else compileFile(target, { prettify });
}

function watch(target, options = {}) {
  let { prettify } = options;
  if (isDir(target)) target = path.join(target, "/**/*.csc");

  const watcher = chokidar.watch(target);
  watcher.on("change", (path) => compile(path, { prettify }));
}

module.exports.compileCode = compileCode;
module.exports.compile = compile;
module.exports.compileFile = compileFile;
module.exports.compileDir = compileDir;
module.exports.watch = watch;
