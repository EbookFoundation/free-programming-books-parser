const { isNullOrUndefined } = require("./Objects");

/**
 * Strip wrapped parenthesis from a string.
 * @param {string} s - the string to process
 * @returns {string} the stripped string if parens found, the input string if don't
 */
function stripParens(s) {
  if (isNullOrUndefined(s)) return s;
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
  if (isNullOrUndefined(template)) return template;
  // replaceAll using a replacer function
  return template.replace(
    /{{([^{}]+)}}/g, // {{key}}
    (matchedText, key) => (key in context ? context[key] : matchedText)
  );
}

/**
 * Wraps a string between other that acts as token.
 * @param {string} s - the text to wrap
 * @param {string} token - the text to wrap with between
 * @returns a string in the form `${token}${s}${token}`
 */
function wrap(s, token = "") {
  if (isNullOrUndefined(s)) return s;
  // avoid mix concatenate/sum string/numbers using array join hack
  //return `${token}${s}${token}`;
  return [token, token].join(s);
}

module.exports = {
  stripParens,
  templater,
  wrap,
};
