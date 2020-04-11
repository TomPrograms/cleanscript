const tokenTypes = require("./tokenTypes.js");
const Stmt = require("./Stmt.js");
const Expr = require("./Expr.js");

var inFunctionCode = `function $_in(val, obj) {if (obj instanceof Array || typeof obj === "string") {return obj.indexOf(val) !== -1;}return val in obj;};`;
var createIterableCode = `function $_createIterable(object) { if (object.constructor === [].constructor || object.constructor === "".constructor){return object;}else if (Set && object.constructor === Set) {return Array.from(object);}return Object.keys(object);}`;
var rangeFunctionCode = `function range(start, end=0, step=1) {if (arguments.length === 1) {end = start;start = 0;}let arr = [];for (;(end - start)* step > 0; start += step) arr.push(start);return arr;}`;

function renderParamsString(params) {
  let paramsString = "";
  let wildcardDefault = null;
  params.forEach((param, i) => {
    let { name, type } = param;
    let defaultValue = param.default;
    let currentParamString = "";

    currentParamString += name.lexeme;

    if (type === "wildcard") {
      currentParamString = "..." + currentParamString;
      if (defaultValue) {
        // a wildcard default requires code in body, so save it for later
        wildcardDefault = {
          name: name.lexeme,
          value: defaultValue.accept(this),
        };
      }
    } else {
      if (defaultValue) {
        currentParamString += `=${defaultValue.accept(this)}`;
      }
    }

    if (i < params.length - 1) currentParamString += ",";
    paramsString += currentParamString;
  });

  // support wildcard defaults
  let wildcardDefaultCode = "";
  if (wildcardDefault) {
    wildcardDefaultCode = `${wildcardDefault.name} = ${wildcardDefault.name}.length > 0 ? ${wildcardDefault.name} : ${wildcardDefault.value};`;
  }

  return { paramsString, wildcardDefaultCode };
};

module.exports = class Compiler {
  visitWhileStmt(stmt) {
    return `while(${stmt.condition.accept(this)}){${stmt.body.accept(this)}};`;
  }

  visitForStmt(stmt) {
    this.flags.includeCreateIterableFlag = true;
    let varName = stmt.variable.lexeme;
    let iterator = stmt.iterator.accept(this);
    return `var $_iterator = $_createIterable(${iterator});for (let $_forVar = 0; $_forVar < $_iterator.length; $_forVar++) {var ${varName} = $_iterator[$_forVar];${stmt.body.accept(this)}}`;
  }

  visitSwitchStmt(stmt) {
    let branchString = "";
    stmt.branches.forEach((branch) => {
      branchString += `case ${branch.condition.accept(this)}: ${branch.branch.accept(this)}`;
    });
    let defaultString = `default: ${stmt.defaultBranch.branch.accept(this)}`;
    return `switch(${stmt.condition.accept(this)}){${branchString}${defaultString}}`;
  }

  visitTryStmt(stmt) {
    if (stmt.elseBranch) {
      let tryBranch = `try{${stmt.tryBranch.accept(this)}}`;
      let catchBranch = stmt.catchBranch ? `catch${stmt.catchBranch.catchVar ? `(${stmt.catchBranch.catchVar.lexeme})` : ""} {$_successful=false;${stmt.catchBranch.block.accept(this)}}` : "catch{}";
      let finallyBranch = stmt.finallyBranch ? `finally{${stmt.finallyBranch.accept(this)}}` : "finally{}";
      let elseBranch = stmt.elseBranch ? `if ($_successful) {${stmt.elseBranch.accept(this)}}` : "";
      return `try {let $_successful=true;${tryBranch}${catchBranch}${elseBranch}}${finallyBranch}`;
    } else {
      let tryBranch = `try{${stmt.tryBranch.accept(this)}}`;
      let catchBranch = stmt.catchBranch ? `catch${stmt.catchBranch.catchVar ? `(${stmt.catchBranch.catchVar.lexeme})` : ""} {${stmt.catchBranch.block.accept(this)}}` : "catch{}";
      let finallyBranch = stmt.finallyBranch ? `finally{${stmt.finallyBranch.accept(this)}}` : "";
      return `${tryBranch}${catchBranch}${finallyBranch}`;
    }
  }

  visitFunctionStmt(stmt) {
    const asyncDeclaration = stmt.async ? "async" : "";
    const functionKeyword = stmt.generator ? "function*" : "function";
    const { paramsString, wildcardDefaultCode } = renderParamsString.bind(this)(stmt.params);
    return `${asyncDeclaration} ${functionKeyword} ${stmt.name.lexeme}(${paramsString}) {${wildcardDefaultCode}${stmt.body.accept(this)}};`;
  }

  visitClassStmt(stmt) {
    let methods = "";
    stmt.methods.forEach((method) => {
      const { paramsString, wildcardDefaultCode } = renderParamsString.bind(this)(method.func.parameters);
      const asyncDeclaration = method.async ? "async" : "";
      methods += `${asyncDeclaration} ${method.func.name.lexeme}(${paramsString}) {${wildcardDefaultCode}${method.func.body.accept(this)}};`;
    });

    const extendString = stmt.superclass ? `extends ${stmt.superclass.lexeme}` : "";
    return `class ${stmt.name.lexeme} ${extendString} {${methods}}`;
  }

  visitBlockStmt(stmt) {
    for (let i = 0; i < stmt.statements.length; i++) {
      stmt.statements[i] = stmt.statements[i].accept(this);
    }
    return stmt.statements.join("");
  }

  visitNewStmt(stmt) {
    return `new ${stmt.object.accept(this)}`;
  }

  visitAwaitStmt(stmt) {
    return `await ${stmt.object.accept(this)}`;
  }

  visitIfStmt(stmt) {
    let mainBranch = `if(${stmt.condition.accept(this)}){${stmt.thenBranch.accept(this)}}`;
    let elifBranches = "";
    stmt.elifBranches.forEach((branch) => {
      elifBranches += `else if(${branch.condition.accept(this)}){${branch.branch.accept(this)}}`;
    });
    let elseBranch = stmt.elseBranch ? `else{${stmt.elseBranch.accept(this)}}` : "";
    return `${mainBranch}${elifBranches}${elseBranch}`;
  }

  visitBreakStmt(stmt) {
    return `break;`;
  }

  visitContinueStmt(stmt) {
    return `continue;`;
  }

  visitExpressionStmt(stmt) {
    return `${stmt.expression.accept(this)};`;
  }

  visitReturnStmt(stmt) {
    let value = stmt.value ? stmt.value.accept(this) : "";
    return `return ${value};`;
  }

  visitThrowStmt(stmt) {
    return `throw ${stmt.value.accept(this)};`;
  }

  visitYieldStmt(stmt) {
    return `yield ${stmt.value.accept(this)};`;
  }

  visitVarStmt(stmt) {
    if (stmt.initializer) {
      return `var ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`;
    } else {
      return `var ${stmt.name.lexeme};`
    }
  }

  visitConstStmt(stmt) {
    return `const ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`; 
  }

  visitLetStmt(stmt) {
    if (stmt.initializer) {
      return `let ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`;
    } else {
      return `let ${stmt.name.lexeme};`
    }
  }

  visitAssignExpr(expr) {
    return `${expr.name.lexeme} = ${expr.value.accept(this)}`;
  }

  visitLambdaExpr(expr) {
    const asyncDeclaration = expr.async ? "async" : "";
    const { paramsString, wildcardDefaultCode } = renderParamsString.bind(this)(expr.params);
    return `${asyncDeclaration} function (${paramsString}) {${wildcardDefaultCode}return ${expr.body.accept(this)}}`;
  }

  visitCallExpr(expr) {
    expr.args.forEach((arg, i) => {
      expr.args[i] = arg.accept(this);
    });
    const argsString = expr.args.join(", ");
    const functionName = expr.callee.accept(this);

    if (functionName === "range") {
      this.flags.includeRangeFlag = true;
    }

    return `${functionName}(${argsString})`;
  }

  visitUnaryExpr(expr) {
    let right = expr.right.accept(this);

    switch (expr.operator.type) {
      case tokenTypes.MINUS:
        return `-${right}`;
      case tokenTypes.BANG:
        return `!${right}`;
      case tokenTypes.BIT_NOT:
        return `~${right}`;
    }
  }

  visitLogicalExpr(expr) {
    function convertOperator(operator) {
      switch (operator) {
        case "OR":
          return "||";
        case "AND":
          return "&&";
      }
    }
    let operator = expr.operator.type;
    if (operator === "OR" || operator === "AND") {
      return `${expr.left.accept(this)}${convertOperator(operator)}${expr.right.accept(this)}`;
    } else if (operator === "IN") {
      this.flags.includeInFunctionFlag = true;
      return `$_in(${expr.left.accept(this)},${expr.right.accept(this)})`;
    }
  }

  visitVariableExpr(expr) {
    return `${expr.name.lexeme}`;
  }

  visitBinaryExpr(expr) {
    let operator = expr.operator.lexeme;

    // always use strictly equals
    if (operator === "==") operator = "===";
    if (operator === "!=") operator = "!==";

    return `${expr.left.accept(this)}${operator}${expr.right.accept(this)}`;
  }

  visitLiteralExpr(expr) {
    let value = expr.value;
    if (typeof value === "string") {
      return JSON.stringify(expr.value);
    } else if (typeof value === "number") {
      return `${value}`;
    } else if (value === true) return true;
    else if (value === false) return false;
    else if (value === null) return null;
    else if (value === undefined) return undefined;
  }

  visitGetExpr(expr) {
    return `${expr.object.accept(this)}.${expr.name.lexeme}`;
  }

  visitSetExpr(expr) {
    let object = expr.object.accept(this);
    let callee = expr.name.lexeme;
    let value = expr.value.accept(this);
    return `${object}.${callee} = ${value}`;
  }

  visitSubscriptExpr(expr) {
    let callee = expr.callee.accept(this);
    let indexData = expr.index;

    if (!indexData.colon) {
      return `${callee}[${indexData.leftValue.accept(this)}]`;
    }

    if (indexData.leftValue) {
      // [a:b] indexes
      if (indexData.rightValue) {
        return `${callee}.slice(${indexData.leftValue.accept(this)}, ${indexData.rightValue.accept(this)})`;
      }

      // [a:] indexes
      else {
        return `${callee}.slice(${indexData.leftValue.accept(this)}, ${callee}.length)`;
      }
    } else {
      // [:a] indexes
      return `${callee}.slice(0, ${indexData.rightValue.accept(this)})`;
    }
  }

  visitAssignsubscriptExpr(expr) {
    let object = expr.object.accept(this);
    let value = expr.value.accept(this);
    let indexData = expr.index;

    if (indexData.leftValue) indexData.leftValue = indexData.leftValue.accept(this);
    if (indexData.rightValue) indexData.rightValue = indexData.rightValue.accept(this);

    if (indexData.leftValue) {
      // [a:b] indexes
      if (indexData.rightValue) {
        return `[].splice.apply(${object}, [${indexData.leftValue}, ${indexData.rightValue} - ${indexData.leftValue}].concat(${value}))`;
      }

      // [a:] indexes
      else {
        return `[].splice.apply(${object}, [${indexData.leftValue}, ${object}.length - ${indexData.leftValue}].concat('a'))`;
      }
    } else {
      // [:a] indexes
      return `[].splice.apply(${object}, [0, ${indexData.rightValue}].concat(${value}))`;
    }
  }

  visitJSRAWStmt(expr) {
    return expr.code.literal;
  }

  visitDictionaryExpr(expr) {
    let dictionaryContents = "";
    expr.keys.forEach((key, i) => {
      dictionaryContents += `${key.accept(this)}:${expr.values[i].accept(this)},`;
    });
    return `{${dictionaryContents}}`;
  }

  visitGroupingExpr(expr) {
    return `(${expr.expression.accept(this)})`;
  }

  visitArrayExpr(expr) {
    let values = expr.values;
    values.forEach((value, i) => {
      values[i] = value.accept(this);
    });
    return `[${expr.values.join(",")}]`;
  }

  compile(ast) {
    // set default flags
    this.flags = {
      includeInFunctionFlag: false,
      includeCreateIterableFlag: false,
      includeRangeFlag: false,
      strictFlag: true,
    };

    // check for "unstrict" flag
    if (ast[0]) {
      if (ast[0] instanceof Stmt.Expression) {
        if (ast[0].expression && ast[0].expression instanceof Expr.Literal) {
          if (ast[0].expression.value === "unstrict") {
            this.flags.strictFlag = false;
            delete ast[0];
          } else if (ast[0].expression.value === "use strict") {
            delete ast[0];
          }
        }
      }
    }

    // compile statements
    let compiled = "";
    ast.forEach((stmt) => {
      compiled += stmt.accept(this);
    });

    // flag behaviour
    if (this.flags.includeInFunctionFlag) {
      compiled = inFunctionCode + compiled;
    }

    if (this.flags.includeCreateIterableFlag) {
      compiled = createIterableCode + compiled;
    }

    if (this.flags.includeRangeFlag) {
      compiled = rangeFunctionCode + compiled;
    }

    if (this.flags.strictFlag) {
      compiled = '"use strict";' + compiled;
    }

    return compiled;
  }
};
