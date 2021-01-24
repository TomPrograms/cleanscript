const path = require("path");
const fs = require("fs");

const chokidar = require("chokidar");
const Terser = require("terser");
const prettier = require("prettier");

const Lexer = require("./src/lexer.js");
const Parser = require("./src/parser.js");
const Compiler = require("./src/compiler.js");

function findFilesInDir(base, extension, recursive = true) {
  function recursiveFind(base, files, result = []) {
    files = files || fs.readdirSync(base);

    files.forEach(function (file) {
      let newBasePath = path.join(base, file);
      if (fs.statSync(newBasePath).isDirectory()) {
        result = recursiveFind(
          newBasePath,
          fs.readdirSync(newBasePath),
          result
        );
      } else {
        if (file.split(".").pop() === extension) result.push(newBasePath);
      }
    });
    return result;
  }

  function nonRecursiveFind(base) {
    let files = fs.readdirSync(base);
    let result = [];
    files.forEach((file) => {
      if (file.split(".").pop() === extension) result.push(file);
    });
    return result;
  }

  return (recursive ? recursiveFind : nonRecursiveFind)(base);
}

function compileCode(code, options) {
  let { prettify, minify, mangle } = options;

  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);

  if (lexer.hadError) return false;

  const parser = new Parser();
  const AST = parser.parse(tokens);

  if (parser.hadError) return false;

  const compiler = new Compiler();
  let js = compiler.compile(AST);

  if (minify === true) {
    let minified = Terser.minify(js, {
      mangle: mangle ? { toplevel: true } : undefined,
      output: {
        indent_level: 2,
      },
    }).code;

    if (minified !== undefined) js = minified;
    else console.error("Couldn't minify JS due to issue parsing compiled JS.");
  }

  if (prettify === true) {
    try {
      js = prettier.format(js, { parser: "babel" });
    } catch {
      console.error("Couldn't prettify JS due to issue parsing compiled JS.");
    }
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
  let extension = pathData.ext;

  let js = fs.readFileSync(filepath).toString();

  var newPath = path.join(directory, filename + ".js");
  const compiled = compileCode(js, { prettify, minify, mangle });

  if (compiled !== false) {
    fs.writeFileSync(newPath, compiled);

    console.log(
      `Cleanscript: Compiled "${filename + extension}" to "${
        filename + ".js"
      }".`
    );
  }
}

function compileDir(dirpath, options = {}) {
  let { prettify, minify, mangle, recursive } = options;
  let files = findFilesInDir(dirpath, "csc", recursive);

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
  let { prettify, minify, mangle, recursive } = options;
  if (isDir(target))
    compileDir(target, { prettify, minify, mangle, recursive });
  else compileFile(target, { prettify, minify, mangle });
}

function watch(target, options = {}) {
  let { prettify, minify, mangle, recursive } = options;
  if (isDir(target) && recursive) {
    target = path.join(target, "/**/*.csc");
  } else if (isDir(target) && !recursive) {
    target = path.join(target, "/*.csc");
  }

  const watcher = chokidar.watch(target);
  watcher.on("change", (path) => compile(path, { prettify, minify, mangle }));
}

module.exports.compileCode = compileCode;
module.exports.compile = compile;
module.exports.compileFile = compileFile;
module.exports.compileDir = compileDir;
module.exports.watch = watch;
