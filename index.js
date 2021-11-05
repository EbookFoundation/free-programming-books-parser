#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const remark = require('remark');
const languages = require('./languages')

const excludes = [
    'README.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SUMMARY.md'
]

// TODO!!
/**
 * Summary TBD.
 * 
 * Desciption TBD.
 * 
 * @param {Object}  listItem - a listItem in AST format defined by remark-parse
 * 
 * @return {Object} Returns an Object containing details about the piece of media Exact format TBD.
 */
let parseListItem = function(listItem){
    let entry = {};
    const link = listItem[0];
    entry.url = link.url;
    entry.title = link.children[0].value;
    // remember to get OTHER STUFF!! remember there may be multiple links!
    return entry;
}

// from free-programming-books-lint
function getLangFromFilename (filename) {
    const dash = filename.lastIndexOf('-')
    const dot = filename.lastIndexOf('.')
    let lang = filename.slice(dash + 1, dot).replace(/_/, '-')
    if (!languages.hasOwnProperty(lang)) {
      if (/^[a-z]{2}$/.test(lang) || /^[a-z]{2}-[A-Z]{2}$/.test(lang)) {
        return ''
      }
      lang = 'en-US'
    }
    return lang
}

// from free-programming-books-lint
function getFilesFromDir (dir) {
    return fs.readdirSync(dir).filter(file => path.extname(file) === '.md' && excludes.indexOf(file) === -1).map(file => path.join(dir, file))
}

function getMediaFromDirectory(dir){
    const slash = dir.lastIndexOf('/');
    let mediaType = dir.slice(2, slash);
    return mediaType;
}

let parseMarkdown = function(doc){
    let tree = remark.parse(doc).children;
    let sections = [];  // This will go into root object later
    let errors = [];
    let currentDepth = 3; // used to determine if the last heading was an h4 or h3

    // find where Index ends
    // probably could be done better, review later
    let i=0, count = 0;
    for(i; i < tree.length; i++){
        if(tree[i].type=='heading' && tree[i].depth=='3')
            count++;
        if(count == 2)
            break;
    }

    tree.slice(i).forEach( (item) => { // Start iterating after Index
        try { 
            if(item.type == "heading" && item.children[0].value == 'Index')
            return;

        if(item.type == "heading"){
            if(item.depth == 3){ // Heading is an h3
                currentDepth = 3;
                let newSection = {
                    section: item.children[0].value, // Get the name of the section
                    entries: [],
                    subsections: []
                };
                sections.push(newSection); // Push the section to the output array
            }
            else if(item.depth == 4){ // Heading is an h4
                currentDepth = 4;
                let newSubsection = {
                    section: item.children[0].value, // Get the name of the subsection
                    entries: []
                };
                sections[sections.length-1].subsections.push(newSubsection); // Add to subsection array of most recent h3
            }
        }
        else if(item.type == 'list'){
            item.children.forEach( (listItem) => {
                let content = listItem.children[0].children; // gets array containing a remark-link and a remark-paragraph
                // if(content[0].type !== 'link'){ // SKIPS OVER bad formatting
                //     return;
                // }
                if(currentDepth == 3){
                    let contentJson = parseListItem(content);
                    sections[sections.length-1].entries.push(contentJson); // add the entry to most recent h3 
                }
                else if(currentDepth == 4){
                    let lastSection = sections.length-1;
                    let lastSubSec = sections[lastSection].subsections.length-1;
                    let contentJson = parseListItem(content);
                    sections[lastSection].subsections[lastSubSec].entries.push(contentJson); // add entry to most recent h4
                }
            });
        }
        } catch (e) {
            // if there was an error while parsing, print the error to an error log
            // looks really ugly, maybe try to refine output later
            // start_output = JSON.stringify(item.position.start)
            // end_output = JSON.stringify(item.position.end)
            // str = `Parser had an error while parsing the document starting at ${start_output} and ending at ${end_output}.`
            // errors.push(str)
        }
    });
    return sections;
}

function parseDirectory(directory){
    let dirChildren = []; // this will hold the output each markdown doc
    
    let mediaType = getMediaFromDirectory(directory);
    const filenames = getFilesFromDir(path.resolve(directory));
    filenames.forEach((filename) => {
        const doc = fs.readFileSync(filename);
        let sections = parseMarkdown(doc); // parse the markdown document
        const langCode = getLangFromFilename(filename);
        let docJson = {
            language: {
                code: langCode,
                name: languages[langCode],
            },
            index: {
                
            },
            sections: sections
        };
        // if (errors.length !== 0) {
        //     dir_errors.push(errors);
        // }
        dirChildren.push(docJson);
    });
    let dirJson = {
        type: mediaType,
        index: {

        },
        children: dirChildren
    };
    return dirJson; //, dir_errors;
}

function parseAll(directories){
    let rootChildren = []; // this will hold the output of each directory

    directories.forEach( (directory) => {
        let dirJson = parseDirectory(directory);
        rootChildren.push(dirJson);
        // if (errors.length !== 0) {
        //     errors_array.push(errors)
        // }
    });
    let rootJson = {
        type: 'root',
        children: rootChildren
    }
    fs.writeFileSync('./parser/fpb.json', JSON.stringify(rootJson, null, 3), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

console.time('Parse Time')
parseAll(['./fpb/books']);
console.timeEnd('Parse Time');