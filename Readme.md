<img src="./docs/logo.png" alt="Cleanscript Logo" align="right" height="175"/>

# Cleanscript

> Cleanscript is an small, indent-based language that compiles to Javascript.

- Clean, indent-based grammar.
- Compiles to Javascript for compatibility with browsers, NodeJS and Electron.
- Merges familiar syntax from Python and Javascript for a clean look.
- Still utilise all the powerful built-in Javascript libraries, objects and prototypes.
- Mix-in Javascript at-will to access the maturity and power of pure Javascript.

[![Cleanscript NPM Version](https://img.shields.io/npm/v/cleanscript?color=green)](https://npmjs.com/package/cleanscript)
[![Cleanscript License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Installation

For global installation to compile from the command line:

```
npm i -g cleanscript
```

For programmatic compilation within projects:

```
npm i cleanscript
```

## Usage

Once installed (at least globally) you can compile a file through the command line. The path provided should be relative to the command line's current execution location:

```
cleanscript ./test.drg
```

You can also compile all the `.csc` files in a folder (and its sub-folders recursively), by targeting a folder when compiling:

```
cleanscript ./
```

You can also provide the `--watch` option, which, while running, will recompile its target when changes (like a save) occur. This works with individual files and folders.

```
cleanscript ./
```

You can also provide other flags, relevant to Cleanscript through the command line:

```
--no-minify       This will stop Cleanscript from minifying the output.
--no-mangle       If minifying, this will stop variable names from being mangled.
--prettify        This will prettify the Cleanscript output.
--no-recursive    This stops recursive compilation of folders.
```

## Example

For example, the following Cleanscript code:

```
function checkValInVals(flag=false, *vals=[3]):
  // python style for loops
  for val in vals:
    if val == 3 and flag == true:
      return true;
  return false;

var print = lambda (val) : console.log(val);

try:
  print(checkValInVals()); // false
  print(checkValInVals(true)); // true
  print(checkValInVals(true, 2)); // false
  print(checkValInVals(true, 2, 3)); // true
  print(checkValInVals(false, 2, 3)); // false
catch error:
  console.error(error);
else:
  // only runs if catch doesn't
  console.log('No errors!');
```

Compiles to the following Javascript (when using the `--no-minify` and `--prettify` flags):

```js
/* Compiled by Cleanscript */

function $_createIterable(object) {
  if (
    object.constructor === [].constructor ||
    object.constructor === "".constructor
  ) {
    return object;
  } else if (Set && object.constructor === Set) {
    return Array.from(object);
  }
  return Object.keys(object);
}

function checkValInVals(flag = false, ...vals) {
  vals = vals.length > 0 ? vals : [3];
  var $_iterator = $_createIterable(vals);
  for (let $_forVar = 0; $_forVar < $_iterator.length; $_forVar++) {
    var val = $_iterator[$_forVar];
    if (val === 3 && flag === true) {
      return true;
    }
  }
  return false;
}

var print = function (val) {
  return console.log(val);
};

try {
  let $_successful = true;
  try {
    print(checkValInVals());
    print(checkValInVals(true));
    print(checkValInVals(true, 2));
    print(checkValInVals(true, 2, 3));
    print(checkValInVals(false, 2, 3));
  } catch (error) {
    $_successful = false;
    console.error(error);
  }
  if ($_successful) {
    console.log("No errors!");
  }
} finally {
}
```

## Credit

Author: [Tom](https://github.com/TomPrograms)

## License

[MIT](LICENSE)
