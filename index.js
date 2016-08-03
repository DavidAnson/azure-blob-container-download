#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const process = require("process");
const azureStorage = require("azure-storage");
const pify = require("pify");
const yargs = require("yargs");
const packageJson = require("./package.json");

const sanitize = function sanitize (str) {
  return str.replace(/[\/\\:]/g, "-");
};

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
    "type": "string"
  }).
  option("blobPattern", {
    "describe": "Regular expression filter for blob names",
    "type": "string"
  }).
  option("startDate", {
    "describe": "Starting date for blobs",
    "type": "string"
  }).
  option("endDate", {
    "describe": "Ending date for blobs",
    "type": "string"
  }).
  option("snapshots", {
    "describe": "True to include blob snapshots",
    "type": "boolean"
  }).
  version().
  help().
  wrap(false).
  epilog(`${packageJson.description}\n${packageJson.homepage}`).
  demand(0, 0).
  strict().
  argv;
Promise.resolve().
  then(() => {
    const blobService = azureStorage.createBlobService(options.account, options.key);
    const listContainersSegmented = pify(blobService.listContainersSegmented.bind(blobService));
    const listBlobsSegmented = pify(blobService.listBlobsSegmented.bind(blobService));
    const getBlobToLocalFile = pify(blobService.getBlobToLocalFile.bind(blobService));
    const listBlobsOptions = {};
    if (options.snapshots) {
      listBlobsOptions.include = "snapshots";
    }
    const everythingRegExp = new RegExp();
    const containerRegExp = options.containerPattern
      ? new RegExp(options.containerPattern)
      : everythingRegExp;
    const blobRegExp = options.blobPattern
      ? new RegExp(options.blobPattern)
      : everythingRegExp;
    const startDate = options.startDate
      ? new Date(options.startDate)
      : null;
    const endDate = options.endDate
      ? new Date(options.endDate)
      : null;
    const startTime =
      (startDate && !isNaN(startDate.valueOf()) && startDate.toUTCString()) ||
      "[beginning of time]";
    const endTime =
      (endDate && !isNaN(endDate.valueOf()) && endDate.toUTCString()) ||
      "[end of time]";
    console.log(`Downloading blobs in ${options.account} from ${startTime} to ${endTime}.`);
    const containersMatching = containerRegExp === everythingRegExp
      ? "[anything]"
      : `/${containerRegExp.source}/`;
    console.log(`Listing containers in ${options.account} matching ${containersMatching}...`);
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
    return listNextContainers().
      then((containerNames) => {
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
            const blobsMatching = blobRegExp === everythingRegExp
              ? "[anything]"
              : `/${blobRegExp.source}/`;
            console.log(`Listing blobs in ${containerName} matching ${blobsMatching}...`);
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
                    return blobRegExp.test(blobInfo.blobName) &&
                      (!startDate || (startDate <= blobInfo.lastModified)) &&
                      (!endDate || (blobInfo.lastModified <= endDate));
                  }));
              });
          });
        }, Promise.resolve([]));
      }).
      then((blobInfos) => {
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
      });
  }).
  catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
