class Expr {
  accept(visitor) {}
}

class Assign extends Expr {
  constructor(name, value) {
    super();
    this.name = name;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitAssignExpr(this);
  }
}

class Binary extends Expr {
  constructor(left, operator, right) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitBinaryExpr(this);
  }
}

class Ternary extends Expr {
  constructor(condition, thenBranch, elseBranch) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  accept(visitor) {
    return visitor.visitTernaryExpr(this);
  }
}

class Lambda extends Expr {
  constructor(params, body, async) {
    super();
    this.params = params;
    this.body = body;
    this.async = async;
  }

  accept(visitor) {
    return visitor.visitLambdaExpr(this);
  }
}

class Call extends Expr {
  constructor(callee, paren, args) {
    super();
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }

  accept(visitor) {
    return visitor.visitCallExpr(this);
  }
}

class Get extends Expr {
  constructor(object, name) {
    super();
    this.object = object;
    this.name = name;
  }

  accept(visitor) {
    return visitor.visitGetExpr(this);
  }
}

class Grouping extends Expr {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  accept(visitor) {
    return visitor.visitGroupingExpr(this);
  }
}

class Literal extends Expr {
  constructor(value, lexeme) {
    super();
    this.value = value;
    this.lexeme = lexeme;
  }

  accept(visitor) {
    return visitor.visitLiteralExpr(this);
  }
}

class Array extends Expr {
  constructor(values) {
    super();
    this.values = values;
  }

  accept(visitor) {
    return visitor.visitArrayExpr(this);
  }
}

class Dictionary extends Expr {
  constructor(keys, values) {
    super();
    this.keys = keys;
    this.values = values;
  }

  accept(visitor) {
    return visitor.visitDictionaryExpr(this);
  }
}

class Subscript extends Expr {
  constructor(callee, index, closeBracket) {
    super();
    this.callee = callee;
    this.index = index;
    this.closeBracket = closeBracket;
  }

  accept(visitor) {
    return visitor.visitSubscriptExpr(this);
  }
}

class Assignsubscript extends Expr {
  constructor(object, index, value) {
    super();
    this.object = object;
    this.index = index;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitAssignsubscriptExpr(this);
  }
}

class Logical extends Expr {
  constructor(left, operator, right) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitLogicalExpr(this);
  }
}

class Set extends Expr {
  constructor(object, name, value) {
    super();
    this.object = object;
    this.name = name;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitSetExpr(this);
  }
}

class Unary extends Expr {
  constructor(operator, right) {
    super();
    this.operator = operator;
    this.right = right;
  }

  accept(visitor) {
    return visitor.visitUnaryExpr(this);
  }
}

class PostfixIncrement extends Expr {
  constructor(subject, operator) {
    super();
    this.subject = subject;
    this.operator = operator;
  }

  accept(visitor) {
    return visitor.visitPostfixIncrementExpr(this);
  }
}

class PrefixIncrement extends Expr {
  constructor(subject, operator) {
    super();
    this.subject = subject;
    this.operator = operator;
  }

  accept(visitor) {
    return visitor.visitPrefixIncrementExpr(this);
  }
}

class Variable extends Expr {
  constructor(name) {
    super();
    this.name = name;
  }

  accept(visitor) {
    return visitor.visitVariableExpr(this);
  }
}

class Await extends Expr {
  constructor(object) {
    super();
    this.object = object;
  }

  accept(visitor) {
    return visitor.visitAwaitExpr(this);
  }
}

class New extends Expr {
  constructor(object) {
    super();
    this.object = object;
  }

  accept(visitor) {
    return visitor.visitNewExpr(this);
  }
}

class Typeof extends Expr {
  constructor(object) {
    super();
    this.object = object;
  }

  accept(visitor) {
    return visitor.visitTypeofExpr(this);
  }
}

class Void extends Expr {
  constructor(object) {
    super();
    this.object = object;
  }

  accept(visitor) {
    return visitor.visitVoidExpr(this);
  }
}

class Delete extends Expr {
  constructor(object) {
    super();
    this.object = object;
  }

  accept(visitor) {
    return visitor.visitDeleteExpr(this);
  }
}

module.exports = {
  Assign,
  Binary,
  Ternary,
  Function,
  Call,
  Get,
  Grouping,
  Literal,
  Array,
  Dictionary,
  Subscript,
  Assignsubscript,
  Logical,
  Set,
  Unary,
  PostfixIncrement,
  PrefixIncrement,
  Variable,
  Lambda,
  New,
  Await,
  Typeof,
  Void,
  Delete,
};
