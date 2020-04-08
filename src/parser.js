const tokenTypes = require("./tokenTypes.js");
const Expr = require("./Expr.js");
const Stmt = require("./Stmt.js");

module.exports = class Parser {
  synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type == tokenTypes.SEMICOLON) return;

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
        if (this.check(tokenTypes.INDENT)) this.consume(tokenTypes.INDENT); 

        let key = this.assignment();
        this.consume(
          tokenTypes.COLON,
          "Expected a colon between key and value."
        );
        let value = this.assignment();

        keys.push(key);
        values.push(value);

        if (this.check(tokenTypes.DEDENT)) this.consume(tokenTypes.DEDENT); 
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
    if (this.match(tokenTypes.LAMBDA)) return this.lambdaExpression();

    if (this.match(tokenTypes.NUMBER, tokenTypes.STRING)) {
      return new Expr.Literal(this.previous().literal);
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

  lambdaExpression() {
    let async = false;
    if (this.match(tokenTypes.ASYNC)) async = true;

    // parse parameters
    let parameters = [];
    if (this.match(tokenTypes.LEFT_PAREN)) {
      if (!this.check(tokenTypes.RIGHT_PAREN)) {
        do {
          if (parameters.length >= 255) {
            this.error(this.peek(), "Cannot have more than 255 parameters.");
          }

          let paramObj = {};

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
      }
      this.match(tokenTypes.RIGHT_PAREN, "Expected ')' after arguments.");
    }

    this.consume(
      tokenTypes.COLON,
      "Expected colon after function name or parameters."
    );

    // parse body
    let body = this.expression();

    return new Expr.Lambda(parameters, body, async);
  }

  finishCall(callee) {
    let args = [];
    if (!this.check(tokenTypes.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          error(this.peek(), "Cannot have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(tokenTypes.COMMA));
    }

    let paren = this.consume(
      tokenTypes.RIGHT_PAREN,
      "Expect ')' after arguments."
    );

    return new Expr.Call(callee, paren, args);
  }

  call() {
    let expr = this.primary();

    while (true) {
      if (this.match(tokenTypes.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(tokenTypes.DOT)) {
        let name = this.consume(
          tokenTypes.IDENTIFIER,
          "Expected property name after '.'."
        );
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
    if (this.match(tokenTypes.BANG, tokenTypes.MINUS, tokenTypes.BIT_NOT)) {
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

    while (this.match(tokenTypes.SLASH, tokenTypes.STAR, tokenTypes.MODULUS)) {
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

  in() {
    let expr = this.equality();

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
    if (this.match(tokenTypes.NEW)) return this.newStatement();
    if (this.match(tokenTypes.AWAIT)) return this.awaitStatement();
    return this.assignment();
  }

  expressionStatement() {
    let expr = this.expression();
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after expression.");
    return new Stmt.Expression(expr);
  }

  continueStatement() {
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after 'continue'.");
    return new Stmt.Continue();
  }

  breakStatement() {
    this.consume(tokenTypes.SEMICOLON, "Expected ';' after 'break'.");
    return new Stmt.Break();
  }

  returnStatement() {
    let keyword = this.previous();
    let value = null;

    if (!this.check(tokenTypes.SEMICOLON)) {
      value = this.expression();
    }

    this.consume(tokenTypes.SEMICOLON, "Expected ';' after return.");
    return new Stmt.Return(keyword, value);
  }

  yieldStatement() {
    let keyword = this.previous();
    let value = null;

    if (!this.check(tokenTypes.SEMICOLON)) {
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
        body.push(this.statement());
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

  newStatement() {
    return new Stmt.New(this.expression());
  }

  awaitStatement() {
    return new Stmt.Await(this.expression());
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
      body.push(this.statement());
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
      body.push(this.statement());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }
    body = new Stmt.Block(body);

    return new Stmt.While(condition, body);
  }

  switchStatement() {
    let condition = this.expression();
    this.consume(tokenTypes.COLON, "Expected ':' after switch statement.");

    function parseBody() {
      let body = [];
      if (this.match(tokenTypes.INDENT)) {
        body = this.block();
      } else {
        body.push(this.statement());
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
        body.push(this.statement());
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
    if (this.match(tokenTypes.YIELD)) return this.yieldStatement();
    if (this.match(tokenTypes.CONTINUE)) return this.continueStatement();
    if (this.match(tokenTypes.BREAK)) return this.breakStatement();
    if (this.match(tokenTypes.FOR)) return this.forStatement();
    if (this.match(tokenTypes.WHILE)) return this.whileStatement();
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
    let initializer = null;
    if (this.match(tokenTypes.EQUAL)) {
      initializer = this.expression();
    }

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
        do {
          if (parameters.length >= 255) {
            this.error(this.peek(), "Cannot have more than 255 parameters.");
          }

          let paramObj = {};

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
      body.push(this.statement());
      if (this.match(tokenTypes.INDENT)) {
        body = body.concat(this.block());
      }
    }

    body = new Stmt.Block(body);

    return { name, body, parameters };
  }

  functionDeclaration() {
    let generator = false;
    if (this.match(tokenTypes.STAR)) generator = true;

    let async = false;
    if (this.match(tokenTypes.ASYNC)) async = true;

    const { name, body, parameters } = this.functionBody();
    return new Stmt.Function(name, parameters, body, async, generator);
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
    while (this.match(tokenTypes.FUNCTION)) {
      let async = false;
      if (this.match(tokenTypes.ASYNC)) async = true;
      let func = this.functionBody();
      methods.push({
        async,
        func,
      });
    }

    if (!this.isAtEnd())
      this.consume(tokenTypes.DEDENT, "Expected dedent after class.");

    return new Stmt.Class(name, superclassName, methods);
  }

  declaration() {
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
