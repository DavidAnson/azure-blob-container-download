#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const process = require("process");
const azureStorage = require("azure-storage");
const pify = require("pify");
const yargs = require("yargs");
const packageJson = require("./package.json");

const mkdir = pify(fs.mkdir);
const stat = pify(fs.stat);
const utimes = pify(fs.utimes);
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
  option("containerPattern", {
    "describe": "Regular expression filter for container names",
    "type": "string",
    "default": ".*"
  }).
  option("blobPattern", {
    "describe": "Regular expression filter for blob names",
    "type": "string",
    "default": ".*"
  }).
  option("snapshots", {
    "describe": "True to include blob snapshots",
    "type": "boolean",
    "default": false
  }).
  version().
  help().
  wrap(false).
  epilog(`${packageJson.description}\n${packageJson.homepage}`).
  demand(0, 0).
  strict().
  argv;
const containerRegExp = new RegExp(options.containerPattern);
const blobRegExp = new RegExp(options.blobPattern);
const listBlobsOptions = {};
if (options.snapshots) {
  listBlobsOptions.include = "snapshots";
}

const sanitize = function sanitize (str) {
  return str.replace(/[\/\\:]/g, "-");
};

let blobService = null;
Promise.resolve().
  then(() => {
    blobService = azureStorage.createBlobService(options.account, options.key);
    console.log(`Listing containers in ${options.account} matching /${containerRegExp.source}/...`);
    const listContainersSegmented = pify(blobService.listContainersSegmented.bind(blobService));
    const listNextContainers = function listNextContainers (continuationToken, containerNames) {
      return listContainersSegmented(continuationToken || null).
        then((listContainerResult) => {
          const nextContainerNames = listContainerResult.entries.
            map((containerResult) => {
              return containerResult.name;
            }).
            filter((containerName) => {
              return containerRegExp.test(containerName);
            });
          const combinedContainerNames = (containerNames || []).concat(nextContainerNames);
          return listContainerResult.continuationToken
            ? listNextContainers(listContainerResult.continuationToken, combinedContainerNames)
            : combinedContainerNames;
        });
    };
    return listNextContainers();
  }).
  then((containerNames) => {
    const listBlobsSegmented = pify(blobService.listBlobsSegmented.bind(blobService));
    const listNextBlobs = function listNextBlobs (containerName, continuationToken, blobInfos) {
      return listBlobsSegmented(containerName, continuationToken || null, listBlobsOptions).
        then((listBlobsResult) => {
          const nextBlobInfos = listBlobsResult.entries.map((blobResult) => {
            const blobName = blobResult.name;
            const lastModified = new Date(blobResult.lastModified);
            const snapshot = blobResult.snapshot || "";
            return {
              containerName,
              blobName,
              lastModified,
              snapshot
            };
          });
          const combinedBlobInfos = (blobInfos || []).concat(nextBlobInfos);
          return listBlobsResult.continuationToken
            ? listNextBlobs(containerName, listBlobsResult.continuationToken, combinedBlobInfos)
            : combinedBlobInfos;
        });
    };
    return containerNames.reduce((containerPromise, containerName) => {
      return containerPromise.then((cumulativeBlobInfos) => {
        console.log(`Listing blobs in ${containerName} matching /${blobRegExp.source}/...`);
        return stat(containerName).
          catch(() => {
            return mkdir(containerName);
          }).
          then(() => {
            return listNextBlobs(containerName);
          }).
          then((blobInfos) => {
            return cumulativeBlobInfos.concat(blobInfos.
              filter((blobInfo) => {
                return blobRegExp.test(blobInfo.blobName);
              }));
          });
      });
    }, Promise.resolve([]));
  }).
  then((blobInfos) => {
    const getBlobToLocalFile = pify(blobService.getBlobToLocalFile.bind(blobService));
    return blobInfos.reduce((blobPromise, blobInfo) => {
      return blobPromise.then(() => {
        const containerName = blobInfo.containerName;
        const blobName = blobInfo.blobName;
        const snapshot = blobInfo.snapshot;
        const combinedName = blobName + (snapshot
          ? ` (${blobInfo.snapshot})`
          : "");
        console.log(`Downloading ${containerName} / ${combinedName}...`);
        const fileName = path.join(sanitize(containerName), sanitize(combinedName));
        const blobRequestOptions = {};
        if (blobInfo.snapshot) {
          blobRequestOptions.snapshotId = snapshot;
        }
        return getBlobToLocalFile(containerName, blobName, fileName, blobRequestOptions).
          then(() => {
            // Ensure write is complete before changing modified date
            return stat(fileName);
          }).
          then(() => {
            const lastModified = blobInfo.lastModified;
            return utimes(fileName, lastModified, lastModified);
          });
      });
    }, Promise.resolve());
  }).
  catch((ex) => {
    console.error(ex);
  });
