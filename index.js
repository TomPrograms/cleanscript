const path = require("path");
const fs = require("fs");

const chokidar = require("chokidar");
const Terser = require("terser");
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
  let { prettify, minify, mangle } = options;

  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);

  if (lexer.hadError) return;

  const parser = new Parser();
  const AST = parser.parse(tokens);

  if (parser.hadError) return;

  const compiler = new Compiler();
  let js = compiler.compile(AST);

  if (minify === true) {
    js = Terser.minify(js, {
      mangle: mangle ? { toplevel: true } : undefined,
      output: {
        indent_level: 2,
      },
    }).code;
  }

  if (prettify === true) {
    js = prettier.format(js, { parser: "babel" });
  }

  // add cleanscript preamble
  js = "/* Compiled by Cleanscript */\n\n" + js;

  return js;
}

function compileFile(filepath, options = {}) {
  let { prettify, minify, mangle } = options;
  let pathData = path.parse(filepath);
  let filename = pathData.name;
  let directory = pathData.dir;

  let js = fs.readFileSync(filepath).toString();

  var newPath = path.join(directory, filename + ".js");
  const compiled = compileCode(js, { prettify, minify, mangle });

  fs.writeFileSync(newPath, compiled);
}

function compileDir(dirpath, options = {}) {
  let { prettify, minify, mangle } = options;
  let files = findFilesInDir(dirpath, "csc");

  files.forEach((file) => {
    compileFile(file, { prettify, minify, mangle });
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
  let { prettify, minify, mangle } = options;
  if (isDir(target)) compileDir(target, { prettify, minify, mangle });
  else compileFile(target, { prettify, minify, mangle });
}

function watch(target, options = {}) {
  let { prettify, minify, mangle } = options;
  if (isDir(target)) target = path.join(target, "/**/*.csc");

  const watcher = chokidar.watch(target);
  watcher.on("change", (path) => compile(path, { prettify, minify, mangle }));
}

module.exports.compileCode = compileCode;
module.exports.compile = compile;
module.exports.compileFile = compileFile;
module.exports.compileDir = compileDir;
module.exports.watch = watch;
