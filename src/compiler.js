const tokenTypes = require("./tokenTypes.js");
const Stmt = require("./Stmt.js");
const Expr = require("./Expr.js");
const includedFunctions = require("./includedFunctions.js");

function getIncludedFunction(key) {
  return includedFunctions[key].toString();
}

module.exports = class Compiler {
  renderParams(params) {
    let renderedParams = [];
    let castParams = [];
    let wildcardDefault = null;
    params.forEach((param) => {
      let { name, type } = param;
      let defaultValue = param.default;
      let currentParam = "";

      currentParam += name.lexeme;

      if (param.castFunc) {
        castParams.push({
          paramName: name.lexeme,
          castFuncName: param.castFunc.lexeme,
        });
      }

      if (type === "wildcard") {
        currentParam = "..." + currentParam;
        if (defaultValue) {
          wildcardDefault = {
            name: name.lexeme,
            value: defaultValue.accept(this),
          };
        }
      } else {
        if (defaultValue) currentParam += `=${defaultValue.accept(this)}`;
      }

      renderedParams.push(currentParam);
    });

    let integratedCode = [];

    // render code for default wildcard parameters
    if (wildcardDefault) {
      integratedCode.push(`${wildcardDefault.name} = ${wildcardDefault.name}.length > 0 ? ${wildcardDefault.name} : ${wildcardDefault.value};`);
    }

    // render code for casting parameters
    castParams.forEach((castParam) => {
      integratedCode.push(`${castParam.paramName} = ${castParam.castFuncName}(${castParam.paramName});`);
    });

    return {
      paramsString: renderedParams.join(","),
      integratedCode: integratedCode.join(""),
    };
  }

  visitWhileStmt(stmt) {
    return `while(${stmt.condition.accept(this)}){${stmt.body.accept(this)}};`;
  }

  visitDoStatement(stmt) {
    const body = stmt.body.accept(this);
    const condition = stmt.condition ? stmt.condition.accept(this) : "false";
    return `do {${body}} while (${condition})`;
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
    let defaultString = stmt.defaultBranch ? `default: ${stmt.defaultBranch.branch.accept(this)}` : "";
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
    const { paramsString, integratedCode } = this.renderParams(stmt.params);
    return `${asyncDeclaration} ${functionKeyword} ${stmt.name.lexeme}(${paramsString}) {${integratedCode}${stmt.body.accept(this)}};`;
  }

  visitClassStmt(stmt) {
    let methods = "";
    stmt.methods.forEach((method) => {
      const { paramsString, integratedCode } = this.renderParams(method.params);
      const generatorDeclaration = method.generator ? "*" : "";
      const asyncDeclaration = method.async ? "async" : "";
      methods += `${asyncDeclaration} ${generatorDeclaration}${method.name.lexeme}(${paramsString}) {${integratedCode}${method.body.accept(this)}};`;
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

  visitNewExpr(expr) {
    return `new ${expr.object.accept(this)}`;
  }

  visitAwaitExpr(expr) {
    return `await ${expr.object.accept(this)}`;
  }

  visitTypeofExpr(expr) {
    return `typeof ${expr.object.accept(this)}`;
  }

  visitVoidExpr(expr) {
    return `void ${expr.object.accept(this)}`;
  }

  visitDeleteExpr(expr) {
    return `delete ${expr.object.accept(this)}`;
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
    let value = stmt.value ? stmt.value.accept(this) : "";
    return `yield ${value};`;
  }

  visitVarStmt(stmt) {
    if (stmt.initializer) {
      return `var ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`;
    } else {
      return `var ${stmt.name.lexeme};`;
    }
  }

  visitConstStmt(stmt) {
    return `const ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`;
  }

  visitLetStmt(stmt) {
    if (stmt.initializer) {
      return `let ${stmt.name.lexeme} = ${stmt.initializer.accept(this)};`;
    } else {
      return `let ${stmt.name.lexeme};`;
    }
  }

  visitAssignExpr(expr) {
    return `${expr.name.lexeme} = ${expr.value.accept(this)}`;
  }

  visitLambdaExpr(expr) {
    const asyncDeclaration = expr.async ? "async" : "";
    const { paramsString, integratedCode } = this.renderParams(expr.params);
    return `${asyncDeclaration} function (${paramsString}) {${integratedCode}return ${expr.body.accept(this)}}`;
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
    let operator = expr.operator.type;
    let right = expr.right.accept(this);

    switch (operator) {
      case tokenTypes.MINUS:
        return `-${right}`;
      case tokenTypes.BANG:
      case tokenTypes.NOT:
        return `!${right}`;
      case tokenTypes.BIT_NOT:
        return `~${right}`;
    }
  }

  visitPostfixIncrementExpr(expr) {
    let operator = expr.operator.type;
    let subject = expr.subject.accept(this);

    switch (operator) {
      case tokenTypes.PLUS_PLUS:
        return `${subject}++`;
      case tokenTypes.MINUS_MINUS:
        return `${subject}--`;
    }
  }

  visitPrefixIncrementExpr(expr) {
    let operator = expr.operator.type;
    let subject = expr.subject.accept(this);

    switch (operator) {
      case tokenTypes.PLUS_PLUS:
        return `++${subject}`;
      case tokenTypes.MINUS_MINUS:
        return `--${subject}`;
    }
  }

  visitLogicalExpr(expr) {
    let left = expr.left.accept(this);
    let right = expr.right.accept(this);
    let operator = expr.operator.type;
    switch (operator) {
      case "OR":
        return `${left}||${right}`;

      case "AND":
        return `${left}&&${right}`;

      case "IN":
        this.flags.includeInFunctionFlag = true;
        return `$_in(${left},${right})`;
    }
  }

  visitVariableExpr(expr) {
    return `${expr.name.lexeme}`;
  }

  visitBinaryExpr(expr) {
    let operator = expr.operator.lexeme;
    let left = expr.left.accept(this);
    let right = expr.right.accept(this);

    const renderEqualsStatement = (negate) => {
      const isObject = (expr) => !(expr instanceof Expr.Literal);

      let needsDeepEquals = isObject(expr.left) && isObject(expr.right);
      if (needsDeepEquals) {
        this.flags.includeDeepEqualsFlag = true;
        return `${negate ? "!" : ""}$_deepEquals(${left}, ${right})`;
      } else {
        return negate ? `${left}!==${right}` : `${left}===${right}`;
      }
    };

    switch (operator) {
      case "==":
        return renderEqualsStatement(false);

      case "!=":
        return renderEqualsStatement(true);

      case "//":
        return `Math.floor(${left}/${right})`;

      default:
        return `${left}${operator}${right}`;
    }
  }

  visitLiteralExpr(expr) {
    let value = expr.value;
    if (typeof value === "string") return expr.lexeme || JSON.parse(expr.literal);
    else if (typeof value === "number") return `${value}`;
    else if (value && value.constructor === RegExp) return value;

    return value;
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

    if (!indexData.colon) {
      return `${object}[${indexData.leftValue}] = ${value}`;
    }

    if (indexData.leftValue) {
      // [a:b] indexes
      if (indexData.rightValue) {
        return `[].splice.apply(${object}, [${indexData.leftValue}, ${indexData.rightValue} - ${indexData.leftValue}].concat(${value}))`;
      }

      // [a:] indexes
      else {
        return `[].splice.apply(${object}, [${indexData.leftValue}, ${object}.length - ${indexData.leftValue}].concat(${value}))`;
      }
    } else {
      // [:a] indexes
      return `[].splice.apply(${object}, [0, ${indexData.rightValue}].concat(${value}))`;
    }
  }

  visitJSRAWStmt(expr) {
    return expr.code.literal + ";";
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

  visitTernaryExpr(expr) {
    let condition = expr.condition.accept(this);
    let thenBranch = expr.thenBranch.accept(this);
    let elseBranch = expr.elseBranch ? expr.elseBranch.accept(this) : "undefined";

    return `${condition} ? ${thenBranch} : ${elseBranch}`;
  }

  compile(ast) {
    // set default flags
    this.flags = {
      includeInFunctionFlag: false,
      includeCreateIterableFlag: false,
      includeRangeFlag: false,
      includeDeepEqualsFlag: false,
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

    function addIncludedFunction(code, flag, functionName) {
      if (!flag) return code;
      return getIncludedFunction(functionName) + code;
    }

    compiled = addIncludedFunction(compiled, this.flags.includeInFunctionFlag, "inFunction");
    compiled = addIncludedFunction(compiled, this.flags.includeCreateIterableFlag, "inFunction");
    compiled = addIncludedFunction(compiled, this.flags.includeRangeFlag, "createIterable");
    compiled = addIncludedFunction(compiled, this.flags.includeDeepEqualsFlag, "deepEqualsFunction");

    if (this.flags.strictFlag) {
      compiled = '"use strict";' + compiled;
    }

    return compiled;
  }
};
