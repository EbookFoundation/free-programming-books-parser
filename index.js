#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const remark = require("remark");
const languages = require("./languages");
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
 * Strip wrapped parenthesis from a string.
 * @param {string} s - the string to process
 * @returns {string} the stripped string if parens found, the input string if don't
 */
function stripParens(s) {
  if (s.slice(0, 1) === "(" && s.slice(-1) === ")") return s.slice(1, -1);
  return s;
}

/**
 * To String
 * @param {any} o - the object to get it text representation
 * @returns the `o` as string
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
 * @param {string} text - the text to wrap
 * @param {string} token - the text to wrap with between
 * @returns a string in the form `${token}${text}${token}`
 */
function wrapText(text, token = "") {
  // avoid mix concatenate/sum string/numbers using array join hack
  //return `${token}${text}${token}`;
  return [token, token].join(String(text));
}

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
          text += wrapText(walk(node.children, depth + 1), "_");
          break;
        case "inlineCode":
          text += wrapText(node.value, "`");
          break;
        case "strong":
          text += wrapText(walk(node.children, depth + 1), "**");
          break;
        case "text":
          text += node.value;
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
 * Parses the contents of a heading from remark-parse into a readable format.
 *
 * @param {Array<Object>} children - an array of AST items defined by remark-parse for
 *        the content of headings (H1..H7)
 *
 * @returns {string} an string with the name of the section related with the input heading
 */
function getLinkTextFromLinkNodes(children) {
  // visit nodes in depth
  const walk = (children, depth) => {
    // not AST, maybe plain text
    if (!Array.isArray(children)) return toString(children);
    // AST children array nodes
    return children.reduce((text, node, index) => {
      if (!node || !node.type) return text; // not AST, maybe plain text
      switch (node.type) {
        //
        // rebuild meaningfull nodes
        //
        case "emphasis":
          // {type: 'emphasis', children: [...], position: {...}}
          text += wrapText(walk(node.children, depth + 1), "_");
          break;
        case "image":
          // {type: 'image', title: '...', url: '...', alt: '...', position: {...}}
          text += `![${node.alt || node.title}](${node.url})`;
          break;
        case "inlineCode":
          // {type: 'inlineCode', value: '...', position: {...}}
          text += wrapText(node.value, "`");
          break;
        case "strong":
          // {type: 'strong', children: [...], position: {...}}
          text += wrapText(walk(node.children, depth + 1), "**");
          break;
        case "text":
          // {type: 'text', value: '...', position: {...}}
          text += node.value;
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
  for (let i of otherStuff) {
    if (s === "") {
      // this is almost always, except for when we are parsing a multi-element note
      if (i.type === "text" && i.value.slice(0, 3) === " - ") {
        // author found
        let parenIndex = i.value.indexOf("(");
        if (parenIndex === -1) {
          entry.author = i.value.slice(3).trim();
        } else {
          entry.author = i.value.slice(3, parenIndex).trim(); // go from " - " until the first "("
        }
      }
      if (
        i.type === "emphasis" &&
        i.children[0].value.slice(0, 1) === "(" &&
        i.children[0].value.slice(-1) === ")"
      ) {
        // access notes found (currently assumes exactly one child, so far this is always the case)
        entry.accessNotes = i.children[0].value.slice(1, -1);
      }
      if (i.type === "link") {
        // other links found
        if (entry.otherLinks === undefined) entry.otherLinks = [];
        entry.otherLinks.push({
          title: stripParens(getLinkTextFromLinkNodes(i.children)),
          url: i.url,
        });
        // entry.otherLinks = [...entry.otherLinks, {title: i.children[0].value, url: i.url}];      // <-- i wish i could get this syntax to work with arrays
      }
      if (i.type === "text" && i.value.indexOf("(") !== -1) {
        // notes found (currently assumes no nested parentheses)
        if (entry.notes === undefined) entry.notes = [];
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
    } else {
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
          entry.notes.push(stripParens(s + i.value.slice(0, rightParen + 1)));
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
  return entry;
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
