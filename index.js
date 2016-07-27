#!/usr/bin/env node

"use strict";

// const azureStorage = require("azure-storage");
// const pify = require("pify");
const yargs = require("yargs");
const packageJson = require("./package.json");

const options = yargs.
  usage("Usage: abcd [options]").
  option("", {
    "describe": "",
    "type": ""
  }).
  version().
  help().
  wrap(false).
  epilog(`${packageJson.description}\n${packageJson.homepage}`).
  strict().
  argv;

options.unused = null;
