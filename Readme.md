<img src="./docs/logo.png" alt="Cleanscript Logo" align="right" height="175"/>

# Cleanscript

> Cleanscript is an small, indent-based language that compiles to Javascript.

- Clean, indent-based grammar.
- Cleanscripts includes useful features such as advanced Pythonic indexes and Pythonic for loops.
- Compiles to Javascript for compatibility with browsers, NodeJS and Electron.
- Merges familiar syntax from Python and Javascript for an easy-to-learn, clean syntax.
- Cleanscript still allows you to utilise all the powerful built-in Javascript libraries, objects and prototypes.
- Mix-in Javascript at-will to access the maturity and power of pure Javascript.

[![Cleanscript NPM Version](https://img.shields.io/npm/v/cleanscript?color=green)](https://npmjs.com/package/cleanscript)
[![Cleanscript License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## Table of Contents

- [Overview](#Overview)
- [Installation](#Installation)
- [Usage](#Usage)
- [Example](#Example)
- [Documentation](#Documentation)
  - [Variable Assignment](#Variable%20Assignment)
  - [Equality Checking](#Equality%20Checking)
  - [Control Keywords](#Control%20Keywords)
  - [Indexing](#Indexing)
  - [If, Elif, Else](#If,%20Elif,%20Else)
  - [For Loops](#For%20Loops)
  - [While Loops](#While%20Loops)
  - [Functions](#Functions)
  - [Lambda Functions](#Lambda%20Functions)
  - [Classes](#Classes)
  - [Try, Catch, Else, Finally](#Try,%20Catch,%20Else,%20Finally)
  - [Strict Mode](Strict%20Mode)

## Overview

The syntax of Cleanscript is desgined to be a blend of syntax from Javascript and Python. Cleanscript mostly functions the same as standard Javascript, still allowing access to all the standard Javascript methods, prototypes and functions, however enforces (but more importanly allows) indent-based blocks and includes some useful features not present in ES5 or ES6 Javascript. Cleanscript is intended to have a low-overhead to learn and understand for Javascript users while maintaining extra, useful features and an indent-based syntax. Cleanscript is in an immature, early state, however can compile accurate Cleanscript stabily. Any pull-requests or issues would be apppreciated.

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

Once installed (at least globally) you can compile a file through the command line. The path provided can be relative or absolute:

```
cleanscript ./test.drg
```

You can also compile all the `.csc` files in a folder (and its sub-folders recursively), by targeting a folder when compiling:

```
cleanscript ./
```

You can also provide the `--watch` option, which, while running, will recompile its target when changes (like a save) occur. This works with individual files and folders.

```
cleanscript ./ --watch
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

"use strict";

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

## Documentation

### Variable Assignment

Variable assignment works the same as pure Javascript, with `const`, `let` and `var` types, and no type supported.

```
var a = "a";
let c = {};
const b = 1;
d = [1, 2, 3];
```

The above compiles to:

```js
var a = "a";
let c = {};
const b = 1;
d = [1, 2, 3];
```

### Equality Checking

When checking for equality, Cleanscript includes both `==` (equal to) and `!=` (not equal to) operators. These both compile to their strictly equal Javascript counterparts.

```
true == true
false != false
```

The above statements compile to:

```
true === true
false !== false
```

### Control Keywords

Cleanscript uses semantic, English control keywords instead of punctuation, as well as adding additional control keywords. `and` and `or` keywords are supported within Cleanscript:

```
true and true; // check if both are true
true or false; // check if at least one is true
```

Which compiles to:

```js
true && true;
true || false;
```

Cleanscript also includes an `in` control keywords, which checks in an element is within a target, with similar functionality to Python. The `in` keyword can check if an element is within a list, a string or an object.

```
var list = [1, 2, 3];
2 in list; // checks if 2 is in the list
```

The above compiles to the following Javascript:

```js
function $_in(val, obj) {
  if (obj instanceof Array || typeof obj === "string") {
    return obj.indexOf(val) !== -1;
  }
  return val in obj;
}

var list = [1, 2, 3];
$_in(2, list);
```

### Indexing

Cleanscript supports advanced indexing as well as standard indexes, such as `[1:]` and `[2:3]`. These indexes have the same functionality as they would within Python.

```
var list = [1, 2, 3, 4];

console.log(list[0]); // outputs "1"
console.log(list[1:]); // outputs "[ 2, 3, 4 ]"
console.log(list[:3]); // outputs "[ 1, 2, 3 ]"
console.log(list[1:2]); // outputs "[ 2 ]"
```

This compiles to the following Javascript:

```js
var list = [1, 2, 3, 4];

console.log(list[0]);
console.log(list.slice(1, list.length));
console.log(list.slice(0, 3));
console.log(list.slice(1, 2));
```

These indexes can also be assigned to with the same functionality as Python. For the following examples, we will presume the `list` variable resets to `[1, 2, 3, 4]` before each index assignment.

```js
list[0] = 10;                   // list becomes equal to "[ 10, 2, 3, 4 ]"
list[:2] = [100, 200];          // list becomes equal to "[ 100, 200, 3, 4 ]"
list[:2] = 50;                  // list becomes equal to "[ 50, 3, 4 ]"
list[2:] = [10, 11, 12];        // list becomes equal to "[ 1, 2, 10, 11, 12 ]"
list[1:2] = [10, 11];           // list becomes equal to "[ 1, 10, 11, 3, 4 ]"
```

These assignments compile to the following Javascript:

```js
[].splice.apply(list, [0, 2].concat([100, 200]));
[].splice.apply(list, [0, 2].concat(50));
[].splice.apply(list, [2, list.length - 2].concat([10, 11, 12]));
[].splice.apply(list, [1, 2 - 1].concat([10, 11, 12, 13]));
```

### If, Elif, Else

If, elif and else statements work similarly to Javascript, with minor differences in syntax. In Cleanscript, the else if keyword is `elif` not `else if`. The if and elif conditions don't need to be surrounded by parentheses.

```
if a == 1:
  console.log("Option 1");
elif a == 2:
  console.log("Option 2");
else:
  console.log("No Option");
```

These statements compile, as you would expect, to the following Javascript:

```js
if (a === 1) {
  console.log("Option 1");
} else if (a === 2) {
  console.log("Option 2");
} else {
  console.log("No Option");
}
```

### For Loops

Cleanscript implements Pythonic for loops. For loops can iterate over lists, sets, objects and strings.

```
var names = ["jeff", "tom", "john"];
for name in names:
  console.log(`I am friends with ${name}`);
```

The above for loop compiles to the following Javascript:

```js
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

var names = ["jeff", "tom", "john"];
var $_iterator = $_createIterable(names);
for (let $_forVar = 0; $_forVar < $_iterator.length; $_forVar++) {
  var name = $_iterator[$_forVar];
  console.log(`I am friends with ${name}`);
}
```

If you want to iterate over indexes of a list or numbers, the `range(start, end, step)` function is included to help. The `range()` function has the same functionality as the Python `range()` function:

```
var names = ["jeff", "tom", "john"];
for i in range(0, names.length):
  console.log(names[i]);

range(0, 10, 2); // generates list "[ 0, 2, 4, 6, 8 ]"
```

### While Loops

Cleanscript while loops are the same as plain Javascript, but use an indent-based syntax and does not require parentheses around the condition.

```
while true: console.log('a');
  console.log('b');
```

The above compiles to:

```js
while (true) {
  console.log("a");
  console.log("b");
}
```

### Functions

Functions can be synchronous or asynchronous. Cleanscript supports the usage of generators. You can use an unlimited amount of parameters, standard and wildcard, both of which can have defaults.

```
// no parameters
function main:
  console.log('function main');

// parameters
function params(a, b, *c):
  return a + b + c[0];

// default parameters
function defaults(a=1, *b=[1]):
  return a + b[0];

// asynchronous function
function async nonSyncFunction:
  return;

// generator
function* generatorFunction:
  yield 1;
```

These functions compile to the following Javascript:

```js
function main() {
  console.log("function main");
}

function params(a, b, ...c) {
  return a + b + c[0];
}

function defaults(a = 1, ...b) {
  b = b.length > 0 ? b : [1];
  return a + b[0];
}

async function nonSyncFunction() {
  return;
}

function* generatorFunction() {
  yield 1;
}
```

### Lambda Functions

Lambda functions are a clean, expressive way to create one-line functions with implicit returns. Lambda functions can have an unlimited amount of arguments or no arguments, however can only contain a one-line body. Lambda functions can be synchronous or asynchronous.

```
// lambda functions with no arguments
var randomUpto10 = lambda : Math.floor(Math.random() * 10);
var randomUpto20 = lambda () : Math.floor(Math.random() * 20);

// lambda function to double
var double = lambda (x) : x * 2;

// async lambda function with default parameter
var asyncLambda = lambda async (x=2) : x ** 3;
```

These functions compile to the following Javascript:

```js
var randomUpto10 = function () {
  return Math.floor(Math.random() * 10);
};

var randomUpto20 = function () {
  return Math.floor(Math.random() * 20);
};

var double = function (x) {
  return x * 2;
};

var asyncLambda = async function (x = 2) {
  return x ** 3;
};
```

### Classes

In cleanscript, you can declare a class like the following. The class' methods use the same syntax as regular functions, and have all the same features. The method with the name constructor will be used as the class' constructor, same as regular Javascript.

```
class Test:
  function constructor:
    this.name = 1;

  function greeting(word="hello"):
    console.log(word + " " + this.name);
```

The class above compiles to the following Javascript:

```js
class Test {
  constructor() {
    this.name = 1;
  }

  greeting(word = "hello") {
    console.log(word + " " + this.name);
  }
}
```

In Cleanscript, you can define class inheritance with similar syntax to Python's inheritance:

```
class Test(Main):
  function constructor:
    this.name = "tom";
```

Which compiles to the following Javascript:

```js
class Test extends Main {
  constructor() {
    this.name = "tom";
  }
}
```

### Try, Catch, Else, Finally

Cleanscript supports try, catch, else and finally branches. The else branch is only executed if catch is not executed. All other branches function the same as vanilla Javascript.

```
try:
  console.log('Trying...');
catch:
  console.error("An error occurred.");
else:
  // only run if catch isn't
  console.log("No catch required.");
finally:
  console.log('All Finished');
```

If you want to specify the error parameter for the catch block, you can do so like:

```
catch errorVar:
  console.error(errorVar);
```

### Strict Mode

Cleanscript by default enables strict mode. Strict mode helps to encourage better code and prevents common issues in Javascript code. If you don't want strict mode, you can disable it. To explicitly disable strict mode, put the statement `"unstrict";` before any other statement in your program, like so:

```
"unstrict";

// program contents
```

## Credit

Author: [Tom](https://github.com/TomPrograms)

## License

[MIT](LICENSE)
