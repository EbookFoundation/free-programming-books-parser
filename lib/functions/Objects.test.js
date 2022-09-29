const {
  isNull,
  isNotNull,
  isDefined,
  isUndefined,
  isNullOrUndefined,
  isNotNullOrUndefined,
  toString,
} = require("./Objects");

describe("🧪 'Objects.isNull' utility", () => {
  const cases = [
    { args: [], expected: false },
    { args: [null], expected: true },
    { args: [void 0], expected: false },
    { args: [0], expected: false },
    { args: [NaN], expected: false },
    { args: [[]], expected: false },
    { args: [{}], expected: false },
    { args: [false], expected: false },
    { args: [""], expected: false },
    { args: ["foo"], expected: false },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isNull.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.isNotNull' utility", () => {
  const cases = [
    { args: [], expected: true },
    { args: [null], expected: false },
    { args: [void 0], expected: true },
    { args: [0], expected: true },
    { args: [NaN], expected: true },
    { args: [[]], expected: true },
    { args: [{}], expected: true },
    { args: [false], expected: true },
    { args: [""], expected: true },
    { args: ["foo"], expected: true },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isNotNull.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.isDefined' utility", () => {
  const cases = [
    { args: [], expected: false },
    { args: [null], expected: true },
    { args: [void 0], expected: false },
    { args: [0], expected: true },
    { args: [NaN], expected: true },
    { args: [[]], expected: true },
    { args: [{}], expected: true },
    { args: [false], expected: true },
    { args: [""], expected: true },
    { args: ["foo"], expected: true },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isDefined.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.isUndefined' utility", () => {
  const cases = [
    { args: [], expected: true },
    { args: [null], expected: false },
    { args: [void 0], expected: true },
    { args: [0], expected: false },
    { args: [NaN], expected: false },
    { args: [[]], expected: false },
    { args: [{}], expected: false },
    { args: [false], expected: false },
    { args: [""], expected: false },
    { args: ["foo"], expected: false },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isUndefined.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.isNullOrUndefined' utility", () => {
  const cases = [
    { args: [], expected: true },
    { args: [null], expected: true },
    { args: [void 0], expected: true },
    { args: [0], expected: false },
    { args: [NaN], expected: false },
    { args: [[]], expected: false },
    { args: [{}], expected: false },
    { args: [false], expected: false },
    { args: [""], expected: false },
    { args: ["foo"], expected: false },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isNullOrUndefined.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.isNotNullOrUndefined' utility", () => {
  const cases = [
    { args: [], expected: false },
    { args: [null], expected: false },
    { args: [void 0], expected: false },
    { args: [0], expected: true },
    { args: [NaN], expected: true },
    { args: [[]], expected: true },
    { args: [{}], expected: true },
    { args: [false], expected: true },
    { args: [""], expected: true },
    { args: ["foo"], expected: true },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = isNotNullOrUndefined.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Objects.toString' utility", () => {
  const cases = [
    { args: [], expected: void 0 },
    { args: [void 0], expected: void 0 },
    { args: [null], expected: null },
    { args: ["null"], expected: "null" },
    { args: ["foobar"], expected: "foobar" },
    { args: [false], expected: "false" },
    { args: [0], expected: "0" },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = toString.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});
