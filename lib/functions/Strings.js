/**
 * Strip wrapped parenthesis from a string.
 * @param {string} s - the string to process
 * @returns {string} the stripped string if parens found, the input string if don't
 */
function stripParens(s) {
  // null or undefined
  if (s === null || s === void 0) return s;
  // is wrapped by ( and )?, then unwrap
  if (s.slice(0, 1) === "(" && s.slice(-1) === ")") return s.slice(1, -1);
  // leave as it is
  return s;
}

/**
 * Replaces a data tokens in a template string.
 * @param {string} template - the template string
 * @param {object} context - the data used to replace the tokens with
 * @returns string replace
 */
function templater(template, context = {}) {
  // replaceAll using a replacer function
  return template.replace(
    /{{([^{}]+)}}/g, // {{key}}
    (matchedText, key) => context[key] || ""
  );
}

/**
 * To string
 * @param {any} o - the object to get it text representation
 * @returns {string} the `o` as string
 */
function toString(o) {
  // null or undefined
  if (o === null || o === void 0) return o;
  if (typeof o === "string") return o;
  // has a toString function in their prototype
  if (typeof o.toString === "function") return o.toString();
  // as string in the latest intent
  return String(o);
}

/**
 * Wraps a string between other that acts as token.
 * @param {string} s - the text to wrap
 * @param {string} token - the text to wrap with between
 * @returns a string in the form `${token}${s}${token}`
 */
function wrap(s, token = "") {
  // avoid mix concatenate/sum string/numbers using array join hack
  //return `${token}${s}${token}`;
  return [token, token].join(s);
}

module.exports = {
  stripParens,
  templater,
  toString,
  wrap,
};
