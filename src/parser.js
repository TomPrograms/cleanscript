const tokenTypes = require("./tokenTypes.js");
const Expr = require("./Expr.js");
const Stmt = require("./Stmt.js");

module.exports = class Parser {
  synchronize() {
    if (this.peek().type === tokenTypes.SEMICOLON) return;

    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === tokenTypes.SEMICOLON) return;

      switch (this.peek().type) {
        case tokenTypes.CLASS:
        case tokenTypes.FUNCTION:
        case tokenTypes.VAR:
        case tokenTypes.FOR:
        case tokenTypes.IF:
        case tokenTypes.WHILE:
        case tokenTypes.PRINT:
        case tokenTypes.RETURN:
          return;
      }

      this.advance();
    }
  }

  error(token, message) {
    if (token.type === tokenTypes.EOF) {
      console.error(`[Line: ${token.line}] Error at end: ${message}`);
    } else {
      console.error(
        `[Line: ${token.line}] Error${
          token.lexeme ? ` at "${token.lexeme}"` : ``
        }: ${message}`
      );
    }
    this.hadError = true;
    this.synchronize();
  }

  consume(type, errorMessage) {
    if (this.check(type)) return this.advance();
    else this.error(this.peek(), errorMessage);
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  checkNext(type) {
    if (this.isAtEnd()) return false;
    return this.tokens[this.current + 1].type === type;
  }

  peek() {
    return this.tokens[this.current];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  isAtEnd() {
    return this.peek().type == tokenTypes.EOF;
  }

  advance() {
    if (!this.isAtEnd()) this.current += 1;
    return this.previous();
  }

  match(...args) {
    for (let i = 0; i < args.length; i++) {
      let currentType = args[i];
      if (this.check(currentType)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  primary() {
    if (this.match(tokenTypes.LEFT_SQUARE_BRACKET)) {
      let values = [];
      if (this.match(tokenTypes.RIGHT_SQUARE_BRACKET)) {
        return new Expr.Array([]);
      }
      while (!this.match(tokenTypes.RIGHT_SQUARE_BRACKET)) {
        let value = this.assignment();
        values.push(value);
        if (this.peek().type !== tokenTypes.RIGHT_SQUARE_BRACKET) {
          this.consume(
            tokenTypes.COMMA,
            "Expected a comma before the next expression."
          );
        }
      }
      return new Expr.Array(values);
    }
    if (this.match(tokenTypes.LEFT_BRACE)) {
      let keys = [];
      let values = [];
      if (this.match(tokenTypes.RIGHT_BRACE)) {
        return new Expr.Dictionary([], []);
      }
      while (!this.match(tokenTypes.RIGHT_BRACE)) {
        while (this.match(tokenTypes.INDENT) || this.match(tokenTypes.DEDENT)) {
          continue;
        }

        let key = this.assignment();
        if (this.match(tokenTypes.COMMA)) {
          keys.push(key);
          values.push(key);
          continue;
        } else if (this.match(tokenTypes.RIGHT_BRACE)) {
          keys.push(key);
          values.push(key);
          break;
        }

        this.consume(
          tokenTypes.COLON,
          "Expected a colon between key and value."
        );

        let value = this.assignment();

        keys.push(key);
        values.push(value);

        while (this.match(tokenTypes.INDENT) || this.match(tokenTypes.DEDENT)) {
          continue;
        }
        if (this.peek().type !== tokenTypes.RIGHT_BRACE) {
          this.consume(
            tokenTypes.COMMA,
            "Expected a comma before the next expression."
          );
        }
      }
      return new Expr.Dictionary(keys, values);
    }
    if (this.match(tokenTypes.FALSE)) return new Expr.Literal(false);
    if (this.match(tokenTypes.TRUE)) return new Expr.Literal(true);
    if (this.match(tokenTypes.NULL)) return new Expr.Literal(null);
    if (this.match(tokenTypes.UNDEFINED)) return new Expr.Literal(undefined);

    // parse regex and bytes declarations
    if (
      this.check(tokenTypes.IDENTIFIER) &&
      this.checkNext(tokenTypes.STRING)
    ) {
      if (this.peek().lexeme === "r") {
        this.consume(tokenTypes.IDENTIFIER, null);
        let value = this.consume(tokenTypes.STRING, null).literal;

        // parse regex
        let flags, pattern, regex;
        try {
          flags = value.replace(/.*\/([gimy]*)$/, "$1");
          pattern = value.replace(new RegExp("^/(.*?)/" + flags + "$"), "$1");
          regex = new RegExp(pattern, flags);
        } catch (error) {
          this.error(
            this.peek(),
            `Invalid regex pattern provided - ${error.message}.`
          );
          return;
        }

        return new Expr.Literal(regex);
      }
    }

    // async and sync lambda expressions
    if (this.match(tokenTypes.ASYNC)) {
      if (this.match(tokenTypes.LAMBDA)) return this.lambdaExpression(true);
      this.error(
        this.peek(),
        "Expected 'lambda' keyword after 'async' keyword."
      );
      return;
    }
    if (this.match(tokenTypes.LAMBDA)) return this.lambdaExpression();

    if (this.match(tokenTypes.NUMBER)) {
      return new Expr.Literal(this.previous().literal);
    }

    if (this.match(tokenTypes.STRING)) {
      let token = this.previous();
      return new Expr.Literal(token.literal, token.lexeme);
    }

    if (this.match(tokenTypes.IDENTIFIER)) {
      return new Expr.Variable(this.previous());
    }

    if (this.match(tokenTypes.LEFT_PAREN)) {
      let expr = this.expression();
      this.consume(tokenTypes.RIGHT_PAREN, "Expect ')' after expression.");
      return new Expr.Grouping(expr);
    }

    this.error(this.peek(), "Expect expression.");
  }

  parseParameters() {
    let parameters = [];

    do {
      let paramObj = {
        type: null,
        castFunc: null,
        name: null,
        default: null,
      };

      if (this.checkNext(tokenTypes.ARROW)) {
        paramObj["castFunc"] = this.consume(
          tokenTypes.IDENTIFIER,
          "Expected identifier for function to cast parameter to."
        );
        this.consume(tokenTypes.ARROW, null);
      }

      if (this.peek().type === tokenTypes.STAR) {
        this.consume(tokenTypes.STAR, null);
        paramObj["type"] = "wildcard";
      } else {
        paramObj["type"] = "standard";
      }

      paramObj["name"] = this.consume(
        tokenTypes.IDENTIFIER,
        "Expect parameter name."
      );

      if (this.match(tokenTypes.EQUAL)) {
        paramObj["default"] = this.primary();
      }

      parameters.push(paramObj);

      // wildcards should be the last parameter
      if (paramObj["type"] === "wildcard") break;
    } while (this.match(tokenTypes.COMMA));

    return parameters;
  }

  lambdaExpression(asyncFlag = false) {
    // parse parameters
    let parameters = [];
    if (!this.match(tokenTypes.COLON)) {
      parameters = this.parseParameters();
      this.match(tokenTypes.COLON, "Expected ':' after lambda arguments.");
    }

    // parse body
    let body = this.expression();

    return new Expr.Lambda(parameters, body, asyncFlag);
  }

  finishCall(callee) {
    let args = [];
    if (!this.check(tokenTypes.RIGHT_PAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(tokenTypes.COMMA));
    }

    let paren = this.consume(
      tokenTypes.RIGHT_PAREN,
      "Expect ')' after arguments."
    );

    return new Expr.Call(callee, paren, args);
  }

  keywords() {
    if (this.match(tokenTypes.NEW)) return new Expr.New(this.keywords());
    if (this.match(tokenTypes.AWAIT)) return new Expr.Await(this.keywords());
    if (this.match(tokenTypes.TYPEOF)) return new Expr.Typeof(this.keywords());
    return this.primary();
  }

  call() {
    let expr = this.keywords();

    while (true) {
      if (this.match(tokenTypes.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(tokenTypes.DOT)) {
        let name;
        if (this.check(tokenTypes.THEN)) {
          name = this.consume(tokenTypes.THEN, null);
        } else {
          name = this.consume(
            tokenTypes.IDENTIFIER,
            "Expected property name after '.'."
          );
        }
        expr = new Expr.Get(expr, name);
      } else if (this.match(tokenTypes.LEFT_SQUARE_BRACKET)) {
        let index = {
          leftValue: undefined,
          colon: false,
          rightValue: undefined,
        };

        if (this.match(tokenTypes.COLON)) {
          index.colon = true;
          index.rightValue = this.expression();
        } else {
          index.leftValue = this.expression();
          if (this.match(tokenTypes.COLON)) {
            index.colon = true;
            if (!this.check(tokenTypes.RIGHT_SQUARE_BRACKET))
              index.rightValue = this.expression();
          }
        }

        let closeBracket = this.consume(
          tokenTypes.RIGHT_SQUARE_BRACKET,
          "Expected ']' after subscript index."
        );
        expr = new Expr.Subscript(expr, index, closeBracket);
      } else {
        break;
      }
    }

    return expr;
  }

  unary() {
    if (
      this.match(
        tokenTypes.NOT,
        tokenTypes.BANG,
        tokenTypes.MINUS,
        tokenTypes.BIT_NOT
      )
    ) {
      let operator = this.previous();
      let right = this.unary();
      return new Expr.Unary(operator, right);
    }

    return this.call();
  }

  exponent() {
    let expr = this.unary();

    while (this.match(tokenTypes.STAR_STAR)) {
      let operator = this.previous();
      let right = this.unary();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  multiplication() {
    let expr = this.exponent();

    while (
      this.match(
        tokenTypes.SLASH,
        tokenTypes.SLASH_SLASH,
        tokenTypes.STAR,
        tokenTypes.MODULUS
      )
    ) {
      let operator = this.previous();
      let right = this.exponent();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  addition() {
    let expr = this.multiplication();

    while (this.match(tokenTypes.MINUS, tokenTypes.PLUS)) {
      let operator = this.previous();
      let right = this.multiplication();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  bitFill() {
    let expr = this.addition();

    while (this.match(tokenTypes.LESSER_LESSER, tokenTypes.GREATER_GREATER)) {
      let operator = this.previous();
      let right = this.addition();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  bitAnd() {
    let expr = this.bitFill();

    while (this.match(tokenTypes.BIT_AND)) {
      let operator = this.previous();
      let right = this.bitFill();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  bitOr() {
    let expr = this.bitAnd();

    while (this.match(tokenTypes.BIT_OR, tokenTypes.BIT_XOR)) {
      let operator = this.previous();
      let right = this.bitAnd();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  comparison() {
    let expr = this.bitOr();

    while (
      this.match(
        tokenTypes.GREATER,
        tokenTypes.GREATER_EQUAL,
        tokenTypes.LESS,
        tokenTypes.LESS_EQUAL
      )
    ) {
      let operator = this.previous();
      let right = this.bitOr();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  equality() {
    let expr = this.comparison();

    while (this.match(tokenTypes.BANG_EQUAL, tokenTypes.EQUAL_EQUAL)) {
      let operator = this.previous();
      let right = this.comparison();
      expr = new Expr.Binary(expr, operator, right);
    }

    return expr;
  }

  ternary() {
    let expr = this.equality();

    while (this.match(tokenTypes.THEN)) {
      let thenBranch = this.equality();

      let elseBranch = null;
      if (this.match(tokenTypes.ELSE)) {
        elseBranch = this.equality();
      }

      expr = new Expr.Ternary(expr, thenBranch, elseBranch);
    }

    return expr;
  }

  in() {
    let expr = this.ternary();

    while (this.match(tokenTypes.IN)) {
      let operator = this.previous();
      let right = this.equality();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  and() {
    let expr = this.in();

    while (this.match(tokenTypes.AND)) {
      let operator = this.previous();
      let right = this.in();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  or() {
    let expr = this.and();

    while (this.match(tokenTypes.OR)) {
      let operator = this.previous();
      let right = this.and();
      expr = new Expr.Logical(expr, operator, right);
    }

    return expr;
  }

  assignment() {
    let expr = this.or();

    if (this.match(tokenTypes.EQUAL)) {
      let equals = this.previous();
      let value = this.assignment();

      if (expr instanceof Expr.Variable) {
        let name = expr.name;
        return new Expr.Assign(name, value);
      } else if (expr instanceof Expr.Get) {
        let get = expr;
        return new Expr.Set(get.object, get.name, value);
      } else if (expr instanceof Expr.Subscript) {
        return new Expr.Assignsubscript(expr.callee, expr.index, value);
      }
      this.error(equals, "Invalid assignment target");
    }

    return expr;
  }

  expression() {
    return this.assignment();
  }

  expressionStatement() {
    let expr = this.expression();
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after expression.");
    return new Stmt.Expression(expr);
  }

  continueStatement() {
    this.consume(
      tokenTypes.SEMICOLON,
      "Expected ';' after 'continue' statement."
    );
    return new Stmt.Continue();
  }

  breakStatement() {
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after 'break' statement.");
    return new Stmt.Break();
  }

  throwStatement() {
    let keyword = this.previous();

    let value = this.expression();
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after 'throw' statement.");

    return new Stmt.Throw(keyword, value);
  }

  returnStatement() {
    let keyword = this.previous();
    let value = null;

    if (!this.check(tokenTypes.SEMICOLON) && !this.isAtEnd()) {
      value = this.expression();
    }

    this.consume(tokenTypes.SEMICOLON, "Expected ';' after return.");
    return new Stmt.Return(keyword, value);
  }

  yieldStatement() {
    let keyword = this.previous();
    let value = null;

    if (!this.check(tokenTypes.SEMICOLON) && !this.isAtEnd()) {
      value = this.expression();
    }

    this.consume(tokenTypes.SEMICOLON, "Expected ';' after return.");
    return new Stmt.Yield(keyword, value);
  }

  ifStatement() {
    function parseBody() {
      let body = [];
      if (this.match(tokenTypes.INDENT)) {
        body = this.block();
      } else {
        body.push(this.declaration());
        if (this.match(tokenTypes.INDENT)) {
          body = body.concat(this.block());
        }
      }
      return new Stmt.Block(body);
    }

    let condition = this.expression();
    this.consume(tokenTypes.COLON, "Expected ':' after if statement.");
    let thenBranch = parseBody.apply(this);

    let elifBranches = [];
    while (this.match(tokenTypes.ELIF)) {
      let elifCondition = this.expression();
      this.consume(tokenTypes.COLON, "Expected ':' after elif statement.");
      let body = parseBody.apply(this);

      elifBranches.push({
        condition: elifCondition,
        branch: body,
      });
    }

    let elseBranch = null;
    if (this.match(tokenTypes.ELSE)) {
      this.consume(tokenTypes.COLON, "Expected ':' after else statement.");
      elseBranch = parseBody.apply(this);
    }

    return new Stmt.If(condition, thenBranch, elifBranches, elseBranch);
  }

  forStatement() {
    let variable = this.consume(
      tokenTypes.IDENTIFIER,
      "Expected variable name."
    );

    this.consume(tokenTypes.IN, "Expected 'in' keyword.");

    let iterator = this.expression();

    this.consume(tokenTypes.COLON, "Expected colon after for statement.");

    let body = [];
    if (this.match(tokenTypes.INDENT)) {
      body = this.block();
    } else {
      body.push(this.declaration());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }
    body = new Stmt.Block(body);

    return new Stmt.For(iterator, variable, body);
  }

  whileStatement() {
    let condition = this.expression();
    this.consume(tokenTypes.COLON, "Expected ':' after if statement.");

    let body = [];
    if (this.match(tokenTypes.INDENT)) {
      body = this.block();
    } else {
      body.push(this.declaration());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }
    body = new Stmt.Block(body);

    return new Stmt.While(condition, body);
  }

  doStatement() {
    this.consume(tokenTypes.COLON, "Expected ':' after do statement.");

    let body = [];
    if (this.match(tokenTypes.INDENT)) {
      body = this.block();
    } else {
      body.push(this.declaration());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }
    body = new Stmt.Block(body);

    let condition;
    if (this.match(tokenTypes.WHILE)) {
      condition = this.expression();
      this.consume(
        tokenTypes.SEMICOLON,
        "Expected semi-colon after while condition."
      );
    }

    return new Stmt.Do(body, condition);
  }

  switchStatement() {
    let condition = this.expression();
    this.consume(tokenTypes.COLON, "Expected ':' after switch statement.");

    function parseBody() {
      let body = [];
      if (this.match(tokenTypes.INDENT)) {
        body = this.block();
      } else {
        body.push(this.declaration());
        if (this.match(tokenTypes.INDENT)) {
          body = body.concat(this.block());
        }
      }
      return new Stmt.Block(body);
    }

    this.consume(tokenTypes.INDENT, "Expected indent after switch statement.");

    let branches = [];
    let defaultBranch = null;
    while (!this.match(tokenTypes.DEDENT) && !this.isAtEnd()) {
      if (this.match(tokenTypes.CASE)) {
        let condition = this.expression();
        this.consume(tokenTypes.COLON, "Expected ':' after case statement.");

        let branch = parseBody.call(this);
        branches.push({ branch, condition });
      } else if (this.match(tokenTypes.DEFAULT)) {
        this.consume(tokenTypes.COLON, "Expected ':' after case statement.");

        let branch = parseBody.call(this);
        defaultBranch = { branch, condition };
      }
    }

    return new Stmt.Switch(condition, branches, defaultBranch);
  }

  tryStatement() {
    const parseBody = () => {
      let body = [];
      if (this.match(tokenTypes.INDENT)) {
        body = this.block();
      } else {
        body.push(this.declaration());
        if (this.match(tokenTypes.INDENT)) {
          body = body.concat(this.block());
        }
      }
      return new Stmt.Block(body);
    };

    this.consume(tokenTypes.COLON, "Expected ':' after try statement.");
    let tryBlock = parseBody();

    let catchBlock = null;
    if (this.match(tokenTypes.CATCH)) {
      let catchValue = null;
      if (this.check(tokenTypes.IDENTIFIER)) {
        catchValue = this.consume(
          tokenTypes.IDENTIFIER,
          "Expected function name."
        );
      }

      this.consume(tokenTypes.COLON, "Expected ':' after catch statement.");

      catchBlock = {
        block: parseBody(),
        catchVar: catchValue,
      };
    }

    let elseBlock = null;
    if (this.match(tokenTypes.ELSE)) {
      this.consume(tokenTypes.COLON, "Expected ':' after else statement.");

      elseBlock = parseBody();
    }

    let finallyBlock = null;
    if (this.match(tokenTypes.FINALLY)) {
      this.consume(tokenTypes.COLON, "Expected ':' after finally statement.");

      finallyBlock = parseBody();
    }

    return new Stmt.Try(tryBlock, catchBlock, elseBlock, finallyBlock);
  }

  statement() {
    if (this.match(tokenTypes.TRY)) return this.tryStatement();
    if (this.match(tokenTypes.SWITCH)) return this.switchStatement();
    if (this.match(tokenTypes.RETURN)) return this.returnStatement();
    if (this.match(tokenTypes.THROW)) return this.throwStatement();
    if (this.match(tokenTypes.YIELD)) return this.yieldStatement();
    if (this.match(tokenTypes.CONTINUE)) return this.continueStatement();
    if (this.match(tokenTypes.BREAK)) return this.breakStatement();
    if (this.match(tokenTypes.FOR)) return this.forStatement();
    if (this.match(tokenTypes.WHILE)) return this.whileStatement();
    if (this.match(tokenTypes.DO)) return this.doStatement();
    if (this.match(tokenTypes.IF)) return this.ifStatement();

    return this.expressionStatement();
  }

  block() {
    let statements = [];

    while (!this.check(tokenTypes.DEDENT) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }

    if (!this.isAtEnd()) this.consume(tokenTypes.DEDENT, "Expected dedent.");
    return statements;
  }

  varDeclaration() {
    let name = this.consume(tokenTypes.IDENTIFIER, "Expect variable name.");
    let initializer = null;

    if (this.match(tokenTypes.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(
      tokenTypes.SEMICOLON,
      "Expect ';' after variable declaration."
    );
    return new Stmt.Var(name, initializer);
  }

  constDeclaration() {
    let name = this.consume(tokenTypes.IDENTIFIER, "Expect variable name.");

    this.consume(tokenTypes.EQUAL, "Expected '=' after const declaration.");

    let initializer = this.expression();

    this.consume(
      tokenTypes.SEMICOLON,
      "Expect ';' after variable declaration."
    );
    return new Stmt.Const(name, initializer);
  }

  letDeclaration() {
    let name = this.consume(tokenTypes.IDENTIFIER, "Expect variable name.");
    let initializer = null;
    if (this.match(tokenTypes.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(
      tokenTypes.SEMICOLON,
      "Expect ';' after variable declaration."
    );
    return new Stmt.Let(name, initializer);
  }

  functionBody() {
    let name = this.consume(tokenTypes.IDENTIFIER, "Expected function name.");

    // parse parameters
    let parameters = [];
    if (this.match(tokenTypes.LEFT_PAREN)) {
      if (!this.check(tokenTypes.RIGHT_PAREN)) {
        parameters = this.parseParameters();
      }
      this.match(tokenTypes.RIGHT_PAREN, "Expected ')' after arguments.");
    }

    this.consume(
      tokenTypes.COLON,
      "Expected colon after function name or parameters."
    );

    // parse body
    let body = [];

    if (this.match(tokenTypes.INDENT)) {
      body = this.block();
    } else {
      body.push(this.declaration());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }

    body = new Stmt.Block(body);

    return { name, body, parameters };
  }

  functionDeclaration(asyncFlag = false) {
    let generator = false;
    if (this.match(tokenTypes.STAR)) generator = true;

    const { name, body, parameters } = this.functionBody();
    return new Stmt.Function(name, parameters, body, asyncFlag, generator);
  }

  JSRAWDeclaration() {
    let code = this.consume(
      tokenTypes.STRING,
      "Expected string containing Javascript code."
    );
    this.consume(tokenTypes.SEMICOLON, "Expected semi-colon after JSRAW code.");
    return new Stmt.JSRAW(code);
  }

  classDeclaration() {
    let name = this.consume(tokenTypes.IDENTIFIER, "Expected class name.");

    let superclassName = null;
    if (this.match(tokenTypes.LEFT_PAREN)) {
      if (this.check(tokenTypes.IDENTIFIER)) {
        superclassName = this.consume(tokenTypes.IDENTIFIER, null);
      }
      this.consume(tokenTypes.RIGHT_PAREN, "Expected ')' after class '('.");
    }

    this.consume(tokenTypes.COLON, "Expected colon after class declaration.");
    this.consume(tokenTypes.INDENT, "Expected indent after class declaration.");

    let methods = [];
    while (this.check(tokenTypes.ASYNC) || this.check(tokenTypes.FUNCTION)) {
      let asyncFlag = false;
      if (this.match(tokenTypes.ASYNC)) asyncFlag = true;

      this.consume(tokenTypes.FUNCTION, "Expected 'function' keyword.");

      methods.push(this.functionDeclaration(asyncFlag));
    }

    if (!this.isAtEnd())
      this.consume(tokenTypes.DEDENT, "Expected dedent after class.");

    return new Stmt.Class(name, superclassName, methods);
  }

  declaration() {
    if (this.match(tokenTypes.ASYNC)) {
      if (this.match(tokenTypes.FUNCTION))
        return this.functionDeclaration(true);
    }
    if (this.match(tokenTypes.FUNCTION)) return this.functionDeclaration();
    if (this.match(tokenTypes.CLASS)) return this.classDeclaration();
    if (this.match(tokenTypes.VAR)) return this.varDeclaration();
    if (this.match(tokenTypes.CONST)) return this.constDeclaration();
    if (this.match(tokenTypes.LET)) return this.letDeclaration();
    if (this.match(tokenTypes.JSRAW)) return this.JSRAWDeclaration();

    return this.statement();
  }

  parse(tokens) {
    this.tokens = tokens;
    this.current = 0;
    this.hadError = false;

    this.statements = [];
    while (!this.isAtEnd()) {
      this.statements.push(this.declaration());
    }

    return this.statements;
  }
};
