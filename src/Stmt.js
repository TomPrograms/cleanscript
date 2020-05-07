class Stmt {
  accept(visitor) {}
}

class Expression extends Stmt {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  accept(visitor) {
    return visitor.visitExpressionStmt(this);
  }
}

class JSRAW extends Stmt {
  constructor(code) {
    super();
    this.code = code;
  }

  accept(visitor) {
    return visitor.visitJSRAWStmt(this);
  }
}

class Function extends Stmt {
  constructor(name, params, body, async, generator) {
    super();
    this.name = name;
    this.params = params;
    this.body = body;
    this.async = async;
    this.generator = generator;
  }

  accept(visitor) {
    return visitor.visitFunctionStmt(this);
  }
}

class Return extends Stmt {
  constructor(keyword, value) {
    super();
    this.keyword = keyword;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitReturnStmt(this);
  }
}

class Yield extends Stmt {
  constructor(keyword, value) {
    super();
    this.keyword = keyword;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitYieldStmt(this);
  }
}

class Throw extends Stmt {
  constructor(keyword, value) {
    super();
    this.keyword = keyword;
    this.value = value;
  }

  accept(visitor) {
    return visitor.visitThrowStmt(this);
  }
}

class Class extends Stmt {
  constructor(name, superclass, methods) {
    super();
    this.name = name;
    this.superclass = superclass;
    this.methods = methods;
  }

  accept(visitor) {
    return visitor.visitClassStmt(this);
  }
}

class Block extends Stmt {
  constructor(statements) {
    super();
    this.statements = statements;
  }

  accept(visitor) {
    return visitor.visitBlockStmt(this);
  }
}

class While extends Stmt {
  constructor(condition, body) {
    super();
    this.condition = condition;
    this.body = body;
  }

  accept(visitor) {
    return visitor.visitWhileStmt(this);
  }
}

class Do extends Stmt {
  constructor(body, condition) {
    super();
    this.body = body;
    this.condition = condition;
  }

  accept(visitor) {
    return visitor.visitDoStatement(this);
  }
}

class For extends Stmt {
  constructor(iterator, variable, body) {
    super();
    this.variable = variable;
    this.iterator = iterator;
    this.body = body;
  }

  accept(visitor) {
    return visitor.visitForStmt(this);
  }
}

class Try extends Stmt {
  constructor(tryBranch, catchBranch, elseBranch, finallyBranch) {
    super();
    this.tryBranch = tryBranch;
    this.catchBranch = catchBranch;
    this.elseBranch = elseBranch;
    this.finallyBranch = finallyBranch;
  }

  accept(visitor) {
    return visitor.visitTryStmt(this);
  }
}

class If extends Stmt {
  constructor(condition, thenBranch, elifBranches, elseBranch) {
    super();
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elifBranches = elifBranches;
    this.elseBranch = elseBranch;
  }

  accept(visitor) {
    return visitor.visitIfStmt(this);
  }
}

class Switch extends Stmt {
  constructor(condition, branches, defaultBranch) {
    super();
    this.condition = condition;
    this.branches = branches;
    this.defaultBranch = defaultBranch;
  }

  accept(visitor) {
    return visitor.visitSwitchStmt(this);
  }
}

class Break extends Stmt {
  constructor() {
    super();
  }

  accept(visitor) {
    return visitor.visitBreakStmt(this);
  }
}

class Continue extends Stmt {
  constructor() {
    super();
  }

  accept(visitor) {
    return visitor.visitContinueStmt(this);
  }
}

class Var extends Stmt {
  constructor(name, initializer) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept(visitor) {
    return visitor.visitVarStmt(this);
  }
}

class Let extends Stmt {
  constructor(name, initializer) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept(visitor) {
    return visitor.visitLetStmt(this);
  }
}

class Const extends Stmt {
  constructor(name, initializer) {
    super();
    this.name = name;
    this.initializer = initializer;
  }

  accept(visitor) {
    return visitor.visitConstStmt(this);
  }
}

module.exports = {
  Expression,
  Function,
  Return,
  Yield,
  Throw,
  Class,
  Block,
  While,
  Do,
  For,
  JSRAW,
  Try,
  If,
  Switch,
  Break,
  Continue,
  Var,
  Let,
  Const,
};
