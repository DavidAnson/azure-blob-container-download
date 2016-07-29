#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const process = require("process");
const azureStorage = require("azure-storage");
const pify = require("pify");
const yargs = require("yargs");
const packageJson = require("./package.json");

const name = Object.keys(packageJson.bin)[0];
const options = yargs.
  usage(`Usage: ${name} [options]`).
  option("account", {
    "describe": "Storage account (or set AZURE_STORAGE_ACCOUNT)",
    "type": "string",
    "default": process.env.AZURE_STORAGE_ACCOUNT
  }).
  option("key", {
    "describe": "Storage access key (or set AZURE_STORAGE_ACCESS_KEY)",
    "type": "string",
    "default": process.env.AZURE_STORAGE_ACCESS_KEY
  }).
  version().
  help().
  wrap(false).
  epilog(`${packageJson.description}\n${packageJson.homepage}`).
  demand(0, 0).
  strict().
  argv;

const indent = "  ";
const blobService = azureStorage.createBlobService(options.account, options.key);
const listContainersSegmented = pify(blobService.listContainersSegmented.bind(blobService));
const listBlobsSegmented = pify(blobService.listBlobsSegmented.bind(blobService));
const getBlobToLocalFile = pify(blobService.getBlobToLocalFile.bind(blobService));
const mkdir = pify(fs.mkdir);
const stat = pify(fs.stat);

Promise.resolve().
  then(() => {
    console.log(`Listing all containers in ${options.account}...`);
    return listContainersSegmented(null);
  }).
  then((listContainerResult) => {
    return listContainerResult.entries.map((containerResult) => {
      return containerResult.name;
    });
  }).
  then((containerNames) => {
    containerNames.forEach((containerName) => {
      console.log(`${indent}${containerName}`);
    });
    return containerNames.reduce((containerPromise, containerName) => {
      return containerPromise.then(() => {
        console.log(`Listing all blobs in ${containerName}...`);
        return stat(containerName).
          catch(() => {
            return mkdir(containerName);
          }).
          then(() => {
            return listBlobsSegmented(containerName, null).
              then((listBlobsResult) => {
                return listBlobsResult.entries.map((blobResult) => {
                  return blobResult.name;
                });
              }).
              then((blobNames) => {
                blobNames.forEach((blobName) => {
                  console.log(`${indent}${blobName}`);
                });
                return blobNames.reduce((blobPromise, blobName) => {
                  return blobPromise.then(() => {
                    console.log(`Downloading blob ${containerName}/${blobName}...`);
                    const fileName = path.join(containerName, blobName);
                    return getBlobToLocalFile(containerName, blobName, fileName);
                  });
                }, Promise.resolve());
              });
          });
      });
    }, Promise.resolve());
  }).
  catch((ex) => {
    console.error(ex);
  });
