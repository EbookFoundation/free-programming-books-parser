/**
 * Function factory that builds a string case-insensitive predicate
 *
 * @param {string} str - the value to search
 * @return {Predicate<string>} a Predicate function that receives a
 *    string `value` which compare with and returns the comparing result
 *    as boolean type, `true` if matches.
 */
function stringEqualsCaseInsensitivePredicate(str) {
  return (/** @type string | null | undefined */ value) =>
    value === str || // both raw same
    // nullish-safe
    (value !== null && // both not null
      str !== null &&
      value !== void 0 && // both defined
      str !== void 0 &&
      // both case-insensitive same
      value.toLowerCase() === str.toLowerCase());
}

/**
 * Function factory that builds a optional case-(in)sensitive comparator
 * over a string or string object properties
 *
 * @param {string} propName - the property name to use as projection
 * @param {boolean} caseInsensitive - if string comparision should be case insensitive.
 *    Default: `false`
 * @param {boolean} nullsFirst - if comparision should sort nullish values first.
 *    Default: `true`
 * @return {Comparator<T>} a Comparator function that receives two
 *    string `value`s to compare with and returns the comparing result
 *    as number type, `0` if both matches.
 */
function stringComparatorBy(
  propName,
  caseInsensitive = false,
  nullsFirst = false
) {
  // handle overloaded functions...
  if (typeof propName === "boolean") {
    // ... stringComparatorBy(caseInsensitive)
    if (arguments.length === 1) {
      caseInsensitive = propName;
      propName = void 0;
    } // ... stringComparatorBy(caseInsensitive, nullsFirst)
    else if (arguments.length >= 2) {
      nullsFirst = caseInsensitive;
      caseInsensitive = propName;
      propName = void 0;
    }
  }
  return (
    /** @type T | null | undefined */ a,
    /** @type T | null | undefined */ b
  ) => {
    // resolve property value
    let va = propName ? a[propName] : a,
      vb = propName ? b[propName] : b;
    // compare values
    if (va === vb) return 0; // both raw same
    // sort nullish values (`null` or `undefined`) first if desired
    if (va === null || va === void 0) {
      return nullsFirst ? 1 : -1;
    } else if (vb === null || vb === void 0) {
      return nullsFirst ? -1 : 1;
    }
    // here is nullish-safe, so apply string comparator
    if (caseInsensitive) {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
    }
    return va.localeCompare(vb);
  };
}

module.exports = {
  stringEqualsCaseInsensitivePredicate,
  stringComparatorBy,
};
