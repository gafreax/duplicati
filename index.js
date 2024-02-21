#!/usr/bin/env node
import chalk from 'chalk'
import crypto from 'crypto'
import fs from 'fs'
import ora from 'ora'
import path from 'path'
import process from 'node:process'
import { program } from 'commander'

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
  '.npmignore'
]

const FUNCTION_REGEX = /^(?!#)(function [a-zA-Z].*{)|(const [a-zA-Z]*.*=>).*$/gm

function isValidDir (dir) {
  const stat = fs.statSync(dir)
  return stat.isDirectory()
}

function hash (str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

function processFiles (dirPath, functions) {
  const contents = fs.readdirSync(dirPath)
  for (const fileOrDir of contents) {
    const file = path.join(dirPath, fileOrDir)
    if (FILES_TO_SKIP.some(name => file.includes(name))) { continue }
    if (!isValidDir(file)) {
      const fileContent = fs.readFileSync(file, 'utf8')
      const match = fileContent.match(FUNCTION_REGEX) ?? []
      for (const firm of match) {
        if (firm.length === 0) { continue }
        const key = hash(firm)
        const { count } = functions.get(key) ?? { count: 1}
        functions.set(key, { firm, file, count })
      }
    } else {
      functions = processFiles(file, functions) // Recursive call
    }
  }
  return functions
}

function duplicati (directoryPaths) {
  const spinner = ora(`Searching for duplicates into ${directoryPaths}...`).start()
  console.log()
  let allFunctions = new Map()
  for (const dir of directoryPaths) {
    if (dir.match(/\w+/)) {
      allFunctions = processFiles(dir, allFunctions)
    }
  }
  
  for ( const value of allFunctions ) {
    const [ , obj] = value
    const { firm, file, count } = obj
    
    if (firm.length > 1) {
      const [, g1, g2] = firm.match(/function (\w+)\(|const (\w+).*=/)
      const fname = g1 ?? g2
      console.log( chalk.magenta(fname.padEnd(40)) + chalk.cyan(file.padEnd(40)) + chalk.blue(count) )
    }
  }
  spinner.stop()
}

async function start () {
  program
    .name('duplicati')
    .description('Simple tool to find duplicate functions')
    .version(process.env.npm_package_version)
  program
    .argument('<dirs>', 'directory to check')
  program.parse()
  if (program.args[0]) {
    duplicati(process.argv.splice(2))
  } else {
    console.log(chalk.red('No directory provided'))
  }
}

start()