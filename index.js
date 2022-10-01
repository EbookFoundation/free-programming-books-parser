#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const remark = require("remark");
const { Objects, Strings } = require("./lib/functions");
const languages = require("./languages");
const { findByCode: findMarcRelatorByCode } = require("./lib/marcrelators");
const commandLineArgs = require("command-line-args");

const optionDefinitions = [
  {
    name: "input",
    multiple: true,
    defaultValue: ["./fpb/books", "./fpb/casts", "./fpb/courses", "./fpb/more"],
  },
  { name: "output", defaultValue: "./parser/fpb.json" },
];

const excludes = [
  "README.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SUMMARY.md",
];

/**
 * Parses the contents of a heading from remark-parse into a readable format.
 *
 * @param {Array<Object>} children - an array of AST items defined by remark-parse for
 *        the content of headings (H1..H7)
 *
 * @returns {string} an string with the name of the section related with the input heading
 */
function getSectionNameFromHeadingContent(children) {
  // visit nodes in depth
  const walk = (children, depth) =>
    children.reduce((text, node, index) => {
      if (!node || !node.type) return text; // not AST, maybe plain text
      switch (node.type) {
        //
        // meaningfull nodes
        //
        case "emphasis":
        case "strong":
          text += Strings.templater(remarkTokenAST(node), {
            text: walk(node.children, depth + 1),
          });
          break;
        case "inlineCode":
        case "text":
          text += Strings.templater(remarkTokenAST(node), {
            text: node.value,
          });
          break;
        //
        // skipped nodes
        //
        case "heading":
        case "html":
        case "link":
        case "list":
        case "paragraph":
        default:
          break;
      }
      return text;
    }, "");

  return walk(children, 0);
}

/**
 * Parses the contents of a link from remark-parse into a readable format.
 *
 * @param {Array<Object>} children - an array of AST items defined by remark-parse for
 *        the content of a link (A)
 *
 * @returns {string} an string with the text of the related input link
 */
function getLinkTextFromLinkNodes(children) {
  // visit nodes in depth
  const walk = (children, depth) => {
    // not AST, maybe plain text
    if (!Array.isArray(children)) return Objects.toString(children);
    // AST children array nodes
    return children.reduce((text, node, index) => {
      if (!node || !node.type) return text; // not AST, maybe plain text
      switch (node.type) {
        //
        // rebuild meaningfull nodes
        //
        case "image":
          text += Strings.templater(remarkTokenAST(node), {
            text: node.alt || node.title,
            url: node.url,
          });
          break;
        case "inlineCode":
        case "text":
          text += Strings.templater(remarkTokenAST(node), {
            text: node.value,
          });
          break;
        case "emphasis":
        case "strong":
          text += Strings.templater(remarkTokenAST(node), {
            text: walk(node.children, depth + 1),
          });
          break;
        //
        // skipped nodes
        //
        default:
          console.log(
            "getLinkTextFromLinkNodes::skipped",
            depth,
            node.type,
            node
          );
          break;
      }
      return text;
    }, "");
  };

  return walk(children, 0);
}

/**
 * Gets the template related with AST remark-parse node.
 * @param {Object} node - AST node defined by remark-parse
 * @returns {string} - the template string
 */
function remarkTokenAST(node) {
  if (node && node.type) {
    switch (node.type) {
      case "break": // {type: 'break', position: {...}}
        return "<br/>";
      case "emphasis": // {type: 'emphasis', children: [...], position: {...}}
        return Strings.wrap("{{text}}", "_");
      case "heading": // {type: 'heading', depth: 1, children: [...], position: {...}}
        return ["#".repeat(node.depth || 0), "{{text}}"].join("");
      case "image": // {type: 'image', title: '...', url: '...', alt: '...', position: {...}}
        return "![{{text}}]({{url}})";
      case "inlineCode": // {type: 'inlineCode', value: '...', position: {...}}
        return Strings.wrap("{{text}}", "`");
      case "link": // {type: 'link', title: '...', url: '...', children: [...], position: {...}}
        return "[{{text}}]({{url}})";
      case "list": // {type: 'list', ordered: false, start: null, spread: false, children: [...], position: {...}}
      case "listItem": // {type: 'listItem', spread: false, checked: null, children: [...], position: {...}}
        // TODO: generate token for list/listItem
        break;
      case "strong": // {type: 'strong', children: [...], position: {...}}
        return Strings.wrap("{{text}}", "**");
      case "html": // {type: 'html', value: '...', position: {...}}
      case "paragraph": // {type: 'paragraph', children: [...], position: {...}}
      case "text": // {type: 'text', value: '...', position: {...}}
        return Strings.wrap("{{text}}"); // identity
      default:
        break;
    }
  }
  throw new Error("Unrecognized remark node type: " + (node && node.type));
}

/**
 * Parses a list item generated from remark-parse into a readable format.
 *
 * remark-parse parses a markdown file into a long, intricate json.
 * Many fields in this json either give information we do not care
 * about or does not go into enough detail. This function parses the
 * output of remark-parse into a format preferred by this project,
 * indicating authors, notes, and links etc.
 *
 * @param {Object} listItem - a listItem in AST format defined by remark-parse
 *
 * @return {Object} Returns an Object containing details about the piece of media.
 */
function parseListItem(listItem) {
  let entry = {};
  let s = ""; // If we need to build up a string over multiple listItem elements
  let leftParen,
    rightParen = -1; // If we need to parse parenthesized text
  // head of listItem = url, the rest is "other stuff"
  const [link, ...otherStuff] = listItem;
  entry.url = link.url;
  // link.children || link.value => weak way to check if link.type === "link"
  entry.title = getLinkTextFromLinkNodes(link.children || link.value);
  // remember to get OTHER STUFF!! remember there may be multiple links!
  let insideAuthors = false; // are we still parsing authors across AST nodes?
  for (let i of otherStuff) {
    if (s === "") {
      // this is almost always, except for when we are parsing a multi-element note
      if (i.type === "text") {
        const text = i.value;
        const parenIndex = text.indexOf("(");

        if (insideAuthors) {
          // an author with role entity found. (maybe after some inlineCode node)
          // so, append until next note token, if any
          entry.author +=
            parenIndex === -1 ? text : text.substring(0, parenIndex);
        }

        if (text.startsWith(" - ")) {
          // authors found
          insideAuthors = true;
          entry.author =
            parenIndex === -1
              ? text.slice(3) // go from " - " until the last char
              : text.slice(3, parenIndex); // go from " - " until the first "("
        }

        if (parenIndex !== -1) {
          // notes found (currently assumes no nested parentheses)
          insideAuthors = false;
          if (entry.notes === undefined) entry.notes = [];
          leftParen = parenIndex;
          while (leftParen != -1) {
            rightParen = text.indexOf(")", leftParen);
            if (rightParen === -1) {
              // there must be some *emphasis* found
              s += text.slice(leftParen);
              break;
            }
            entry.notes.push(text.slice(leftParen + 1, rightParen));
            leftParen = text.indexOf("(", rightParen);
          }
        }
      }
      if (insideAuthors && i.type === "inlineCode") {
        // author role found. append rebuilding markdown format and then move on
        const temp = entry.author.trim();
        entry.author += "`" + i.value + "`";
        // relator term should be... valid
        if (!getRelatorTermFromNodeValue(i.value)) {
          entry.manualReviewRequired = true; // mark for view and edit manually
          entry.hasRelatorTermWarnings = true; // mark the reason
        }
        // ... and at the start of each creator chunk, so check previous
        if (temp.length > 0 && !temp.endsWith(",")) {
          entry.manualReviewRequired = true; // mark for view and edit manually
          entry.hasAuthorWarnings = true; // mark the reason
        }
      }
      if (
        i.type === "emphasis" &&
        i.children[0].value.slice(0, 1) === "(" &&
        i.children[0].value.slice(-1) === ")"
      ) {
        // access notes found (currently assumes exactly one child, so far this is always the case)
        entry.accessNotes = i.children[0].value.slice(1, -1);
        insideAuthors = false;
      }
      if (i.type === "link") {
        // other links found
        if (entry.otherLinks === undefined) entry.otherLinks = [];
        entry.otherLinks.push({
          title: Strings.stripParens(getLinkTextFromLinkNodes(i.children)),
          url: i.url,
        });
        // entry.otherLinks = [...entry.otherLinks, {title: i.children[0].value, url: i.url}];      // <-- i wish i could get this syntax to work with arrays
        insideAuthors = false;
      }
    } else {
      insideAuthors = false;
      // for now we assume that all previous ifs are mutually exclusive with this, may polish later
      if (i.type === "emphasis") {
        // this is the emphasis, add it in boldface and move on
        s += "*" + i.children[0].value + "*";
      } else if (i.type === "link") {
        // something has gone terribly wrong. this book must be viewed and edited manually.
        entry.manualReviewRequired = true;
        break;
      } else {
        // hopefully this is the end of the note
        let rightParen = i.value.indexOf(")");
        if (rightParen === -1) {
          // we have to go AGAIN
          s += i.value;
        } else {
          // finally, we have reached the end of the note
          entry.notes.push(
            Strings.stripParens(s + i.value.slice(0, rightParen + 1))
          );
          s = "";
          // this is a copypaste of another block of code. probably not a good thing tbh.
          leftParen = i.value.indexOf("(");
          while (leftParen != -1) {
            rightParen = i.value.indexOf(")", leftParen);
            if (rightParen === -1) {
              // there must be some *emphasis* found
              s += i.value.slice(leftParen);
              break;
            }
            entry.notes.push(i.value.slice(leftParen + 1, rightParen));
            leftParen = i.value.indexOf("(", rightParen);
          }
        }
      }
    }
  }

  // if creator field is valued...
  if (entry.author) {
    // clean creators string
    entry.author = entry.author.trim();
    // ensure that creators not ends with invalid tokens
    if (
      // each creator delimiter || inlineCode relator term token
      [",", "`"].some((token) => entry.author.endsWith(token))
    ) {
      entry.manualReviewRequired = true; // mark for view and edit manually
      entry.hasAuthorWarnings = true; // mark the reason
    }
  }

  return entry;
}

/**
 * Determines the MARC relator of a certain value based on the format from the
 * FreeEbookFoundation GitHub page
 *
 * @param {string} value
 * @return {MarcRelatorTerm | null | false} The relator term item.
 *    `null` if not found, `false` if not valid.
 */
function getRelatorTermFromNodeValue(value) {
  // must be valued
  if (!value) return false;
  // relator terms always ends with `.:`
  let code = String(value).trim();
  if (!code.endsWith(".:")) {
    return false;
  }
  code = code.slice(0, -2); // remove `.:`
  // must be defined in the MARC relator collection
  return findMarcRelatorByCode(code);
}

/**
 * Determines the language a certain file is based on the format
 * from the FreeEbookFoundation GitHub page
 * @param {String} filename A filename in the format kept by all markdown files on the FreeProgrammingBooks Github
 * @returns {String} The language the file is
 */
function getLangFromFilename(filename) {
  const dash = filename.lastIndexOf("-");
  const dot = filename.lastIndexOf(".");
  let lang = filename.slice(dash + 1, dot).replace(/_/, "-");
  let isSubject = false;
  if (!languages.hasOwnProperty(lang)) {
    if (/^[a-z]{2}$/.test(lang) || /^[a-z]{2}-[A-Z]{2}$/.test(lang)) {
      return "";
    }
    // console.log(lang);
    if (lang === "subjects") {
      isSubject = true;
    }
    lang = "en";
  }
  return { lang: lang, isSubject: isSubject };
}

/**
 * Gets all markdown files in a directory,
 * @param {String} dir - A directory path
 * @returns A list of all md files in a directory, excluding those in the excludes array
 */
function getFilesFromDir(dir) {
  return fs
    .readdirSync(dir)
    .filter(
      (file) => path.extname(file) === ".md" && excludes.indexOf(file) === -1
    )
    .map((file) => path.join(dir, file));
}

/**
 * Retrieves the folder name from a string representing a directory and file
 * @param {String} str - A string representing a path directory alike in the format "./directory/file"
 * @returns {String} The extracted directory name
 */
function getMediaTypeFromDirectoryPath(str) {
  str = path.resolve(str); // sanatize and expand (OS independent)
  let type;
  if (fs.lstatSync(str).isDirectory()) {
    // if path is itself a directory, use it name as result
    type = path.basename(str);
  } else {
    // if not... parent/previous slug is always a directory; extract this part
    // path.sep: Windows -> "\", Unix -> "/"
    type = str.split(path.sep).slice(-2, -1).join(path.sep);
  }
  return type;
}

/**
 * Turns a single markdown file into the json structure needed
 * @param {path} doc - a single file path to a markdown file
 * @returns {object} Json object of entries in the md file
 */
function parseMarkdown(doc) {
  let tree = remark.parse(doc).children;
  let sections = []; // This will go into root object later
  let errors = [];
  let currentDepth = 3; // used to determine if the last heading was an h4 or h3

  // find where Index ends
  // probably could be done better, review later
  let i = 0,
    count = 0;
  for (i; i < tree.length; i++) {
    if (tree[i].type == "heading" && tree[i].depth == "3") count++;
    if (count == 2) break;
  }

  tree.slice(i).forEach((item) => {
    // Start iterating after Index
    try {
      if (item.type == "heading") {
        const sectionName = getSectionNameFromHeadingContent(item.children);
        if (sectionName == "Index") return;
        if (item.depth == 3) {
          // Heading is an h3
          currentDepth = 3;
          // create section record
          let newSection = {
            section: sectionName,
            entries: [],
            subsections: [],
          };
          // Push the section to the output array
          sections.push(newSection);
        } else if (item.depth == 4) {
          // Heading is an h4
          currentDepth = 4;
          // create subsection record
          let newSubsection = {
            section: sectionName,
            entries: [],
          };
          // Add to subsection array of most recent h3
          sections[sections.length - 1].subsections.push(newSubsection);
        }
      } else if (item.type == "list") {
        item.children.forEach((listItem) => {
          let content = listItem.children[0].children; // gets array containing a remark-link and a remark-paragraph
          // if(content[0].type !== 'link'){ // SKIPS OVER bad formatting
          //     return;
          // }
          if (currentDepth == 3) {
            let contentJson = parseListItem(content);
            sections[sections.length - 1].entries.push(contentJson); // add the entry to most recent h3
          } else if (currentDepth == 4) {
            let lastSection = sections.length - 1;
            let lastSubSec = sections[lastSection].subsections.length - 1;
            let contentJson = parseListItem(content);
            sections[lastSection].subsections[lastSubSec].entries.push(
              contentJson
            ); // add entry to most recent h4
          }
        });
      }
    } catch (e) {
      // if there was an error while parsing, print the error to an error log
      // looks really ugly, maybe try to refine output later
      let errStart = JSON.stringify(item.position.start.line);
      let errEnd = JSON.stringify(item.position.end.line);
      str = `Error at line ${errStart} - line ${errEnd}.`;
      errors.push(str);
    }
  });
  return { sections: sections, errors: errors };
}

/**
 * Parses a single directory's md files and converts them into usable json
 * @param {String} directory A string pointing to a directory
 * @returns {Object} An object containing two values, dirJson and dirErrors.
 *                   dirJson contains all data that was successfully parsed from
 *                   the markdown files. dirErrors contains all entries that had
 *                   an error occur while parsing.
 */
function parseDirectory(directory) {
  let dirChildren = []; // this will hold the output each markdown doc
  let dirErrors = []; //contains error for a given directory

  let mediaType = getMediaTypeFromDirectoryPath(directory);
  const filenames = getFilesFromDir(path.resolve(directory));
  filenames.forEach((filename) => {
    const doc = fs.readFileSync(filename);
    let { sections, errors } = parseMarkdown(doc); // parse the markdown document
    const { lang, isSubject } = getLangFromFilename(filename);

    // Entries
    let docJson = {
      language: {
        code: lang,
        name: languages[lang],
      },
      index: {},
      sections: sections,
    };
    if (lang === "en") docJson.language.isSubject = isSubject;
    dirChildren.push(docJson);

    // Errors
    if (errors.length !== 0) {
      let docErrors = {
        file: path.basename(filename),
        errors: errors,
      };
      dirErrors.push(docErrors);
    }
  });

  // File entries
  let dirJson = {
    type: mediaType,
    index: {},
    children: dirChildren,
  };

  // Errors

  return { dirJson: dirJson, dirErrors: dirErrors };
}

/**
 * Reads all given directories for markdown files and prints the parsed json in the output directory
 *
 * @param {Array}  directories A list of strings of directories to scan for markdown files
 * @param {String} output A string for the path that the output should be placed in
 */
function parseAll(directories, output) {
  let rootChildren = []; // this will hold the output of each directory
  let rootErrors = [];

  directories.forEach((directory) => {
    let { dirJson, dirErrors } = parseDirectory(directory);
    rootChildren.push(dirJson);
    if (dirErrors.length !== 0) {
      rootErrors.push({
        directory: path.basename(directory),
        files: dirErrors,
      });
    }
  });

  // ALl entries
  let rootJson = {
    type: "root",
    children: rootChildren,
  };

  // Errors
  let allErrors = {
    type: "root",
    directories: rootErrors,
  };
  fs.writeFileSync(output, JSON.stringify(rootJson, null, 3), function (err) {
    if (err) {
      console.log(err);
    }
  });
  // fs.writeFileSync(
  //     "./parser/fpb.log",
  //     JSON.stringify(allErrors, null, 3),
  //     function (err) {
  //         if (err) {
  //             console.log(err);
  //         }
  //     }
  // );
}

let { input, output } = commandLineArgs(optionDefinitions);
parseAll(input, output);
