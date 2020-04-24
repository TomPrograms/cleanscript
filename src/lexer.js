const tokenTypes = require("./tokenTypes.js");

const reservedWords = {
  and: tokenTypes.AND,
  in: tokenTypes.IN,
  class: tokenTypes.CLASS,
  else: tokenTypes.ELSE,
  false: tokenTypes.FALSE,
  for: tokenTypes.FOR,
  function: tokenTypes.FUNCTION,
  if: tokenTypes.IF,
  elif: tokenTypes.ELIF,
  then: tokenTypes.THEN,
  null: tokenTypes.NULL,
  undefined: tokenTypes.UNDEFINED,
  or: tokenTypes.OR,
  return: tokenTypes.RETURN,
  yield: tokenTypes.YIELD,
  throw: tokenTypes.THROW,
  true: tokenTypes.TRUE,
  var: tokenTypes.VAR,
  let: tokenTypes.LET,
  const: tokenTypes.CONST,
  new: tokenTypes.NEW,
  do: tokenTypes.DO,
  while: tokenTypes.WHILE,
  break: tokenTypes.BREAK,
  continue: tokenTypes.CONTINUE,
  switch: tokenTypes.SWITCH,
  case: tokenTypes.CASE,
  async: tokenTypes.ASYNC,
  default: tokenTypes.DEFAULT,
  extends: tokenTypes.EXTENDS,
  try: tokenTypes.TRY,
  catch: tokenTypes.CATCH,
  finally: tokenTypes.FINALLY,
  JSRAW: tokenTypes.JSRAW,
  lambda: tokenTypes.LAMBDA,
  await: tokenTypes.AWAIT,
};

class Stack {
  constructor(stack) {
    this.stack = stack || [];
  }

  get head() {
    return this.stack[this.stack.length - 1];
  }

  push(value) {
    this.stack.push(value);
  }

  pop() {
    this.stack.pop();
  }
}

class Token {
  constructor(type, lexeme, literal, line) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  toString() {
    return this.type + " " + this.lexeme + " " + this.literal;
  }
}

module.exports = class Lexer {
  errorMessage(line, where, message) {
    this.hadError = true;
    console.error(`[Line: ${line}] Error${where}: ${message}`);
  }

  isDigit(c) {
    return c >= "0" && c <= "9";
  }

  isAlpha(c) {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_";
  }

  isAlphaNumeric(c) {
    return this.isDigit(c) || this.isAlpha(c);
  }

  endOfCode() {
    return this.current >= this.code.length;
  }

  advance() {
    this.current += 1;
    return this.code[this.current - 1];
  }

  addToken(type, literal = null) {
    const text = this.code.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  match(expected) {
    if (this.endOfCode()) {
      return false;
    }

    if (this.code[this.current] !== expected) {
      return false;
    }

    this.current += 1;
    return true;
  }

  peek() {
    if (this.endOfCode()) return "\0";
    return this.code.charAt(this.current);
  }

  peekNext() {
    if (this.current + 1 >= this.code.length) return "\0";
    return this.code.charAt(this.current + 1);
  }

  previous() {
    return this.code.charAt(this.current - 1);
  }

  parseString(stringChar = '"') {
    while (this.peek() !== stringChar && !this.endOfCode()) {
      if (this.peek() === "\n") this.line += 1;
      this.advance();
    }

    if (this.endOfCode()) {
      this.errorMessage(
        this.line,
        ` at ${this.previous()}`,
        "Unterminated string."
      );
      return;
    }

    this.advance();

    let value = this.code.substring(this.start + 1, this.current - 1);
    this.addToken(tokenTypes.STRING, value);
  }

  parseNumber() {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() == "." && this.isDigit(this.peekNext())) {
      this.advance();

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const fullNumber = this.code.substring(this.start, this.current);
    this.addToken(tokenTypes.NUMBER, parseFloat(fullNumber));
  }

  identifyKeyword() {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const c = this.code.substring(this.start, this.current);

    let type;
    if (c === "constructor") type = tokenTypes.IDENTIFIER;
    else type = c in reservedWords ? reservedWords[c] : tokenTypes.IDENTIFIER;

    this.addToken(type);
  }

  scanToken() {
    const char = this.advance();

    switch (char) {
      case "[":
        this.addToken(tokenTypes.LEFT_SQUARE_BRACKET);
        break;
      case "]":
        this.addToken(tokenTypes.RIGHT_SQUARE_BRACKET);
        break;
      case "(":
        this.addToken(tokenTypes.LEFT_PAREN);
        break;
      case ")":
        this.addToken(tokenTypes.RIGHT_PAREN);
        break;
      case "{":
        this.addToken(tokenTypes.LEFT_BRACE);
        break;
      case "}":
        this.addToken(tokenTypes.RIGHT_BRACE);
        break;
      case ",":
        this.addToken(tokenTypes.COMMA);
        break;
      case ".":
        this.addToken(tokenTypes.DOT);
        break;
      case "-":
        this.addToken(tokenTypes.MINUS);
        break;
      case "+":
        this.addToken(tokenTypes.PLUS);
        break;
      case ":":
        this.addToken(tokenTypes.COLON);
        break;
      case ";":
        this.addToken(tokenTypes.SEMICOLON);
        break;
      case "%":
        this.addToken(tokenTypes.MODULUS);
        break;
      case "*":
        if (this.peek() === "*") {
          this.advance();
          this.addToken(tokenTypes.STAR_STAR);
          break;
        }
        this.addToken(tokenTypes.STAR);
        break;
      case "!":
        this.addToken(
          this.match("=") ? tokenTypes.BANG_EQUAL : tokenTypes.BANG
        );
        break;
      case "=":
        this.addToken(
          this.match("=") ? tokenTypes.EQUAL_EQUAL : tokenTypes.EQUAL
        );
        break;

      case "&":
        this.addToken(tokenTypes.BIT_AND);
        break;

      case "~":
        this.addToken(tokenTypes.BIT_NOT);
        break;

      case "|":
        this.addToken(tokenTypes.BIT_OR);
        break;

      case "^":
        this.addToken(tokenTypes.BIT_XOR);
        break;

      case "<":
        if (this.match("=")) {
          this.addToken(tokenTypes.LESS_EQUAL);
        } else if (this.match("<")) {
          this.addToken(tokenTypes.LESSER_LESSER);
        } else {
          this.addToken(tokenTypes.LESS);
        }
        break;

      case ">":
        if (this.match("=")) {
          this.addToken(tokenTypes.GREATER_EQUAL);
        } else if (this.match(">")) {
          this.addToken(tokenTypes.GREATER_GREATER);
        } else {
          this.addToken(tokenTypes.GREATER);
        }
        break;

      case "/":
        if (this.match("/")) {
          this.addToken(tokenTypes.SLASH_SLASH);
        } else {
          this.addToken(tokenTypes.SLASH);
        }

        break;

      case "#":
        // block comment
        if (this.match("*")) {
          while (!(this.peek() === "*" && this.peekNext() === "#")) {
            this.advance();
          }

          this.advance();
          this.advance();
        }

        // single comment
        else {
          while (this.peek() !== "\n" && !this.endOfCode()) this.advance();
        }

        break;

      case "\n":
        this.line += 1;

        let indentStart = this.current;
        do {
          if (this.peek() === "\r") return;
          if (this.peek() === "\n") return;
        } while (this.match(" "));
        let indentSize = this.current - indentStart;

        if (indentSize > this.indentStack.head) {
          this.indentStack.push(indentSize);
          this.tokens.push(new Token(tokenTypes.INDENT, null, null, this.line));
        } else if (indentSize < this.indentStack.head) {
          while (indentSize < this.indentStack.head) {
            this.indentStack.pop();
            this.tokens.push(
              new Token(tokenTypes.DEDENT, null, null, this.line)
            );
          }
        }

        break;

      case '"':
        this.parseString('"');
        break;

      case "`":
        this.parseString("`");

      case " ":
      case "\r":
      case "\t":
        // Ignore whitespace.
        break;

      case "'":
        this.parseString("'");
        break;

      default:
        if (this.isDigit(char)) this.parseNumber();
        else if (this.isAlpha(char)) this.identifyKeyword();
        else {
          this.errorMessage(
            this.line,
            ` at "${char}"`,
            "Unexpected character."
          );
        }
    }
  }

  tokenize(code) {
    this.code = code;

    this.current = 0;
    this.start = 0;
    this.line = 1;
    this.hadError = false;

    this.indentStack = new Stack([0]);
    this.tokens = [];

    while (!this.endOfCode()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push(new Token(tokenTypes.EOF, "", null, this.line));
    return this.tokens;
  }
};
