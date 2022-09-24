/**
 * To string
 * @param {any} o - the object to get it text representation
 * @returns {string} the `o` as string
 */
function toString(o) {
  // null or undefined
  if (o === null || o === void 0) return o;
  // is string
  if (typeof o === "string") return o;
  // has a toString function in their prototype
  if (typeof o.toString === "function") return o.toString();
  // as string in the latest intent
  return String(o);
}

module.exports = {
  toString,
};
