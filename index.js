const fs = require('fs');
const path = require('path');
const remark = require('remark');
const languages = require('./languages')

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
let getAST = function(filename, outputFile="tree.json"){
    //import test markdown file
    let mk;
    try{
        mk = fs.readFileSync(path.join(__dirname, filename), "utf8");
    }
    catch(e){
        throw new Error("Could not open input file. Make sure the file exists.");
    }
    // parse into AST with remark
    let tree = remark.parse(mk);
    // write to file for human readibility
    fs.writeFileSync(outputFile, JSON.stringify(tree, null, 3), function(err) {
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
let exportJSON = function(children, langCode, mediaType, outputFile="root.json"){
    // This will be the JSON to export
    let rootJSON = {
        type: 'root',
        langCode: langCode,
        language: languages[langCode],
        mediaType: mediaType,
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

let main = function(inputFile, langCode, mediaType, outputFile){
    let tree = getAST(inputFile);
    let children = [];  // This will go into root object later
    let currentDepth = 3;

    // find index to skip index and meta-lists
    // probably could be done better, review later
    // TODO: IMPLEMENT FORMAT FOR META-LISTS
    let i=0, count = 0;
    for(i; i < tree.length; i++){
        if(tree[i].type=='heading' && tree[i].depth=='3')
            count++;
        if(count == 2)
            break;
    }
    for(i; i < tree.length; i++){
        if(tree[i].type == "heading"){  // If any kind of section heading
            if(tree[i].depth == 3){ // Make a new child of the root
                currentDepth = 3;
                let newGroup = {group: tree[i].children[0].value, entries: [], subsections: []};
                children.push(newGroup);
            }
            else if(tree[i].depth == 4){    // Make a subsection of last group
                currentDepth = 4;
                let newSubsection = {group: tree[i].children[0].value, entries: []}
                children[children.length-1].subsections.push(newSubsection);    // Push subsection to most recently added element.
            }
        }
        else if(tree[i].type == "list"){
            for(let j = 0; j < tree[i].children.length; j++){   //for each listItem
                let content = tree[i].children[j].children[0].children; //This starts at "type: link" for most entries. Needs parsing tho
                if(currentDepth == 3){
                    try{
                        children[children.length-1].entries.push(parseListItem(content));
                    }
                    catch(e){
                        console.log(children[children.length-1]);
                        // console.log(tree[i]);
                        console.log("error");
                        return 1;
                    }
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
    let rootJSON = exportJSON(children, langCode, mediaType, outputFile);
}

let usageMessage = "Usage:\n node index.js [input_file] [output_file]\n"
let args = process.argv.slice(2);
if(args.length < 1)
    throw new Error(`Please provide an input filename.\n${usageMessage}`);
if(args.length > 2)
    throw new Error(`Too many arguments.\n${usageMessage}`);
if(args.length == 1)
    args[1] = "root.json";
let fileRegex= /\S+-\S+.md/;
if(!fileRegex.test(args[0]))
    throw new Error(`Wrong filename format. Input must be in the format 'free-media-type-languageCode.md`);
let splitPoint = args[0].lastIndexOf("-");
let langCode = args[0].substring(splitPoint + 1, args[0].length-3);
if(!languages.hasOwnProperty(langCode))
    throw new Error('The language code must be in the ISO 639-1 set.');
let mediaType = args[0].substring(0, splitPoint);
main(args[0], langCode, mediaType, args[1]);