module.exports.inFunction = function $_in(val, obj) {
  if (obj instanceof Array || typeof obj === "string") {
    return obj.indexOf(val) !== -1;
  }
  return val in obj;
};

module.exports.createIterable = function $_createIterable(object) {
  if (
    object.constructor === [].constructor ||
    object.constructor === "".constructor
  ) {
    return object;
  } else if (Set && object.constructor === Set) {
    return Array.from(object);
  }
  return Object.keys(object);
};

module.exports.rangeFunction = function range(start, end = 0, step = 1) {
  if (arguments.length === 1) {
    end = start;
    start = 0;
  }
  let arr = [];
  for (; (end - start) * step > 0; start += step) arr.push(start);
  return arr;
};

module.exports.deepEqualsFunction = function $_deepEquals(x, y) {
  if (x === y) return true;
  if (x === undefined || x === null || y === undefined || y === null)
    return false;
  if (x.constructor !== y.constructor) return false;
  if (Array.isArray(x)) {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) {
      if (!$_deepEquals(x[i], y[i])) return false;
    }
    return true;
  } else if (x.constructor === Object) {
    let xKeys = Object.keys(x);
    let yKeys = Object.keys(y);
    if (xKeys.length !== yKeys.length) return false;

    for (let i = 0; i < xKeys.length; i++) {
      let key = xKeys[i];
      if (!$_deepEquals(x[key], y[key])) return false;
    }

    return true;
  } else if (Set && x.constructor === Set) {
    if (x.size !== y.size) return false;
    for (let property of x) {
      if (!y.has(property)) return false;
    }
    return true;
  } else if (Map && x.constructor === Map) {
    if (x.size !== y.size) return false;
    for (let [key, value] of x) {
      let otherValue = y.get(key);
      if (
        !$_deepEquals(value, otherValue) ||
        (otherValue === undefined && !y.has(key))
      ) {
        return false;
      }
    }
    return true;
  } else if (x.constructor === Date) {
    return x.getTime() === y.getTime();
  } else if (typeof x === "function") {
    return x.toString() === y.toString();
  }

  return false;
};
