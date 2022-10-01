// MARC Code List for Relators
// https://loc.gov/marc/relators/relaterm.html

const {
  stringEqualsCaseInsensitivePredicate,
  stringComparatorBy,
} = require("../functions/Functors");
/*
MarcRelatorTerm map entry definition (sorted by name)

code: {
  code: string
  name: string
  note: string
  uf?: [ alias_name ]
  use?: string
}
*/
const data = require("./data.json");

/**
 * Get the MARC Relator term by its unique `code` field
 * @param {string} code - a String representing the MARC relator term `code`
 * @returns {MarcRelatorTerm | null} The relator term item. `null` if not found
 */
function findByCode(code) {
  if (Object.prototype.hasOwnProperty.call(data, code)) {
    return data[code];
  }
  return null; // not found
}

/**
 * Get the MARC Relator term by its unique name or it aliases (used for)
 * @param {string} name - a String representing the MARC relator term `name` or each `uf`
 * @returns {MarcRelatorTerm | null} The relator term item. `null` if not found
 */
function findByName(name) {
  const predicate = stringEqualsCaseInsensitivePredicate(name);
  // iterate over object entries
  for (const [_key, value] of Object.entries(data)) {
    // over the field: `name`
    if (predicate(value.name)) return value;
    // over the field: `use-for` alias names
    if (value.uf && value.uf.findIndex(predicate) !== -1) return value;
  }
  return null; // not found
}

function listAll() {
  const list = [];
  for (const value of Object.values(data)) {
    list.push({ ...value }); // add shallow/weak clone
    // convert `use-for` fields to `use` fields
    if (value.uf) {
      for (const use of value.uf) {
        const item = { ...value }; // shallow/weak clone
        item.name = use;
        item.use = value.name;
        delete item.uf; // `uf` and `use` fields are exclusive
        list.push(item); // add
      }
    }
  }
  // sort by name
  list.sort(stringComparatorBy("name", true, true));
  return list;
}

(function init() {
  console.log(
    "MARC Relator Terms registry: " +
      Object.keys(data).length +
      " entries / " +
      listAll().length +
      " items."
  );
  /* Tests
  console.log("listAllMarcRelators()", listAll());

  console.log("findMarcRelatorByCode() = ", findByCode());
  console.log("findMarcRelatorByCode(null) = ", findByCode(null));
  console.log("findMarcRelatorByCode('trl') = ", findByCode("trl"));
  console.log("findMarcRelatorByCode('wit') = ", findByCode("wit"));

  console.log("findMarcRelatorByName() = ", findByName());
  console.log("findMarcRelatorByName(null) = ", findByName(null));
  console.log(
    "findMarcRelatorByName('Translator') = ",
    findByName("Translator")
  );
  console.log("findMarcRelatorByName('Witness') = ", findByName("Witness"));
  console.log("findMarcRelatorByName('witness') = ", findByName("witness"));
  console.log("findMarcRelatorByName('Observer') = ", findByName("Observer"));
  console.log("findMarcRelatorByName('observer') = ", findByName("observer"));
  */
})();

module.exports = {
  findByCode,
  findByName,
  listAll,
};
