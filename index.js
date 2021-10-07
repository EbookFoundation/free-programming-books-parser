const fs = require('fs');
const path = require('path');
const remark = require('remark');

/**
 * Parses markdown from a file and returns an AST.
 *
 * Parses markdown into an AST from a markdown document using remark-parse format,
 * and additionally writes the AST to a text file in JSON. 
 *
 * @see  remark.parse
 * 
 * @param {string}   filename - The filename of the markdown file to parse, in local context.
 * @param {string}  [outputFile=tree.txt] - The filename of the text file to write out to, in local context.
 * 
 * @return {Object} Returns an AST as an object, based on the format defined in remark-parse.
 */
let getAST = function(filename, outputFile="tree.txt"){
    //import test markdown file
    let mk = fs.readFileSync(path.join(__dirname, filename), "utf8");

    // parse into AST with remark
    let tree = remark.parse(mk);
    // write to file for human readibility
    fs.writeFile(outputFile, JSON.stringify(tree, null, 3), function(err) {
        if (err) {
            console.log(err);
        }
    });

    // This is where actual content starts
    tree = tree.children;
    return tree;
}

/**
 * Given an array of JSON objects, adds it to an object and exports to a text file.
 * 
 * Given an array of JSON objects, adds it to an object and exports to a text file.
 * Additionally, writes the JSON object to a text file.
 * 
 * @param {Object}  children - The array full of Objects to insert into the root object.
 * @param {string}  [outputFile=root.txt] - The name of the text file to write to, in local context.
 * 
 * @return {Object} Returns a JSON object, exact format still in progress.
 */
let exportJSON = function(children, outputFile="root.txt"){
    // This will be the JSON to export
    let rootJSON = {
        type: 'root',
        children: children
    };
    fs.writeFile(outputFile, JSON.stringify(rootJSON, null, 3), function(err) {
        if (err) {
            console.log(err);
        }
    });
    return rootJSON;
}


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
    return "NEEDS TO BE IMPLEMENTED";
}

let main = function(){
    let tree = getAST("test.md");
    let children = [];  // This will go into root object later
    let currentDepth = 3;

    // start from 4 to skip index and meta-lists
    // TODO: IMPLEMENT FORMAT FOR META-LISTS
    for(let i = 4; i < tree.length; i++){
        if(tree[i].type == "heading"){  // If any kind of section heading
            if(tree[i].depth == 3){ // Make a new child of the root
                currentDepth = tree[i].depth;
                let newGroup = {group: tree[i].children[0].value, entries: [], subsections: []};
                children.push(newGroup);
            }
            else if(tree[i].depth == 4){    // Make a subsection of last group
                currentDepth = tree[i].depth;
                let newSubsection = {group: tree[i].children[0].value, entries: []}
                children[children.length-1].subsections.push(newSubsection);    // Push subsection to most recently added element.
            }
        }
        else if(tree[i].type == "list"){
            for(let j = 0; j < tree[i].children.length; j++){   //for each listItem
                let content = tree[i].children[j].children[0].children; //This starts at "type: link" for most entries. Needs parsing tho
                if(currentDepth == 3){
                    children[children.length-1].entries.push(parseListItem(content));
                }
                else if(currentDepth == 4){
                    let lastChild = children.length-1;  // Index of last added h3 Group
                    let lastSubSec = children[lastChild].subsections.length-1;  // Index of last added h4 group
                    // TODO: parse into subobject containing title, author, link, etc.
                    children[lastChild].subsections[lastSubSec].entries.push(parseListItem(content)); // push to entries of last h4 group
                }
            }
        }
    }
    let rootJSON = exportJSON(children);
}

main();
// getAST("test.md");