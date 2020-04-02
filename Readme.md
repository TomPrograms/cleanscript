<img src="./docs/logo.png" alt="Cleanscript Logo" align="right" height="175"/>

# Cleanscript

> Cleanscript is an small, indent-based language that compiles to Javascript.

- Clean, indent-based grammar.
- Compiles to Javascript for compatibility with browsers, NodeJS and Electron.
- Merges familiar syntax from Python and Javascript for a clean look.
- Cleanscript still allows you to leverage all the powerful built-in Javascript libraries, objects and prototypes.
- Mix-in Javascript at-will to access the maturity and power of pure Javascript.

[![Cleanscript NPM Version](https://img.shields.io/npm/v/cleanscript?color=green)](https://npmjs.com/package/cleanscript)
[![Cleanscript License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Example

For example, the following Cleanscript code:

```
function checkValInVals(val=1, *vals=[1]):
  return val in vals;

var print = lambda (val) : console.log(val);

try:
  print(checkValInVals()); // true
  print(checkValInVals(2)); // false
  print(checkValInVals(2, 2, 3)); // true
catch error:
  console.error(error);
else:
  // only runs if catch doesn't
  console.log('No errors!');
finally:
  // runs at the end
  console.log("Everything finished here!");
```

Compiles to the following Javascript:

```js
function $_in(val, obj) {
  if (obj instanceof Array || typeof obj === "string") {
    return obj.indexOf(val) !== -1;
  }
  return val in obj;
}

function checkValInVals(val = 1, ...vals) {
  vals = vals.length > 0 ? vals : [1];
  return $_in(val, vals);
}

var print = function (val) {
  return console.log(val);
};

try {
  let $_successful = true;
  try {
    print(checkValInVals());
    print(checkValInVals(2));
    print(checkValInVals(2, 2, 3));
  } catch (error) {
    $_successful = false;
    console.error(error);
  }
  if ($_successful) {
    console.log("No errors!");
  }
} finally {
  console.log("Everything finished here!");
}
```
