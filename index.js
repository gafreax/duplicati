const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILES_TO_SKIP = [
  '.git',
  '.history',
  '.vscode',
  '__test__',
  'build',
  'coverage',
  'dist',
  'docs',
  'node_modules',
  'test',
  'tests',
  '.DS_Store',
  '.gitignore',
  '.idea',
  '.npmignore',
];

const FUNCTION_REGEX = /^(?!#)(function [a-zA-Z].*{)|(const [a-zA-Z]*.*=>).*$/gm;

function isValidDir(dir) {
  const stat = fs.statSync(dir);
  return stat.isDirectory();
}

function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function readAllFilesSync(dirPath) {
  let functions = [];
  const contents = fs.readdirSync(dirPath);
  for (const fileOrDir of contents) {
    const file = path.join(dirPath, fileOrDir);
    if (FILES_TO_SKIP.some(name => file.includes(name))) { continue; }
    if (!isValidDir(file)) {
      const fileContent = fs.readFileSync(file, 'utf8');
      const match = fileContent.match(FUNCTION_REGEX) ?? [];
      for (const firm of match) {
        const key = hash(firm);
        const existingFunction = functions.find(f => f.key === key);
        if (existingFunction) {
          existingFunction.usage++; // Increase usage count
        } else {
          functions.push({ firm, path: file, usage: 1});
        }
      }
    } else {
      functions.push(readAllFilesSync(file)); // Recursive call
    }
  }

  return functions;
}

const directoryPaths = process.argv.splice(2);
let allFunctions = [];

for (const dir of directoryPaths) {
  if (dir.match(/[a-zA-Z\-_]*/)) {
    allFunctions.push(...readAllFilesSync(dir));
  }
}

console.log(allFunctions); // Print the combined array of subarrays
