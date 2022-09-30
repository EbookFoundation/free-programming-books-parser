/**
 * Check if an object is `null`.
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isNull(o) {
  return o === null;
}

/**
 * Check if an object is not `null`.
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isNotNull(o) {
  return !isNull(o);
}

/**
 * Check if an object not is `undefined`.
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isDefined(o) {
  return !isUndefined(o);
}

/**
 * Check if an object is `undefined`.
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isUndefined(o) {
  return o === void 0;
}

/**
 * Check if an object is nullish (`null` or `undefined`).
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isNullOrUndefined(o) {
  return o === null || o === void 0;
}

/**
 * Check if an object is not nullish (`null` or `undefined`).
 * @param {any} o - the object to test
 * @returns {boolean} `true` if condition matches
 */
function isNotNullOrUndefined(o) {
  return !isNullOrUndefined(o);
}

/**
 * To string
 * @param {any} o - the object to get it text representation
 * @returns {string} the `o` as string
 */
function toString(o) {
  if (isNullOrUndefined(o)) return o;
  // is string
  if (typeof o === "string") return o;
  // has a toString function in their prototype
  if (typeof o.toString === "function") return o.toString();
  // as string in the latest intent
  return String(o);
}

module.exports = {
  isNull,
  isNotNull,
  isDefined,
  isUndefined,
  isNullOrUndefined,
  isNotNullOrUndefined,
  toString,
};
