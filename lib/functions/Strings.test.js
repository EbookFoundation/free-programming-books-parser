const { stripParens, templater, wrap } = require("./Strings");

describe("🧪 'Strings.stripParens' utility", () => {
  const cases = [
    { args: [], expected: void 0 },
    { args: [void 0], expected: void 0 },
    { args: [null], expected: null },
    { args: [""], expected: "" },
    { args: ["   "], expected: "   " },
    { args: ["(foo)"], expected: "foo" },
    { args: ["bar(FOO)bar"], expected: "bar(FOO)bar" },
    { args: ["  (aBc)  "], expected: "  (aBc)  " },
    { args: ["(aBc"], expected: "(aBc" },
    { args: ["aBc)"], expected: "aBc)" },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = stripParens.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Strings.templater' utility", () => {
  const cases = [
    { args: [], expected: void 0 },
    { args: [void 0], expected: void 0 },
    { args: [null], expected: null },
    { args: [""], expected: "" },
    { args: ["foo bar"], expected: "foo bar" },
    { args: ["{{1}}bar", { 1: "foo" }], expected: "foobar" },
    { args: ["{{foo}} bar", { foo: "abc" }], expected: "abc bar" },
    { args: ["{{foo}} bar", { 1: "foo" }], expected: "{{foo}} bar" },
    { args: ["{{foo}} bar", { foo: false }], expected: "false bar" },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = templater.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});

describe("🧪 'Strings.wrap' utility", () => {
  const cases = [
    { args: [], expected: void 0 },
    { args: [void 0], expected: void 0 },
    { args: [null], expected: null },
    { args: ["foo"], expected: "foo" },
    { args: [void 0, void 0], expected: void 0 },
    { args: [void 0, null], expected: void 0 },
    { args: [null, null], expected: null },
    { args: [null, void 0], expected: null },
    { args: ["bar", null], expected: "bar" },
    { args: ["foobar", void 0], expected: "foobar" },
    { args: ["foo", "`"], expected: "`foo`" },
    { args: ["foo", 5], expected: "5foo5" },
    { args: ["b", ""], expected: "b" },
    { args: ["a", "  "], expected: "  a  " },
    { args: [5, 4], expected: "454" },
  ];
  test.each(cases)(
    "should returns $expected when input arguments are: $args",
    ({ args, expected }) => {
      const result = wrap.apply(null, args);
      expect(result).toEqual(expected);
    }
  );
});
