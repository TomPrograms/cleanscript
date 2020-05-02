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
