# azure-blob-container-download

> Download blobs from an Azure container.

[![npm version][npm-image]][npm-url]
[![GitHub tag][github-tag-image]][github-tag-url]
[![License][license-image]][license-url]

A simple, cross-platform tool to bulk-download blobs from an [Azure storage container](https://docs.microsoft.com/en-us/azure/storage/).

Though limited in scope, it does some things official tools don't:

- [AzCopy](https://docs.microsoft.com/en-us/azure/storage/storage-use-azcopy) is not cross-platform
- [Azure CLI](https://docs.microsoft.com/en-us/azure/storage/storage-azure-cli) does not bulk-download
- [Azure PowerShell](https://docs.microsoft.com/en-us/azure/storage/storage-powershell-guide-full) is not cross-platform
- [Azure Portal](https://azure.microsoft.com/en-us/features/azure-portal/) does not bulk-download

## Install

```shell
npm install --global azure-blob-container-download
```

## Options

```text
Usage: abcd [options]

Options:
  --account           Storage account (or set AZURE_STORAGE_ACCOUNT)  [string]
  --key               Storage access key (or set AZURE_STORAGE_ACCESS_KEY)  [string]
  --containerPattern  Regular expression filter for container names  [string]
  --blobPattern       Regular expression filter for blob names  [string]
  --startDate         Starting date for blobs  [string]
  --endDate           Ending date for blobs  [string]
  --snapshots         True to include blob snapshots  [boolean]
  --version           Show version number  [boolean]
  --help              Show help  [boolean]

Download blobs from an Azure container.
https://github.com/DavidAnson/azure-blob-container-download
```

## Examples

Get help:

    azure-blob-container-download --help

Or get help using the short name:

    abcd --help

Download all blobs in a storage account:

    abcd --account ACCOUNT --key KEY

Or set environment variables `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_ACCESS_KEY` first:

    abcd

Include [blob snapshots](https://docs.microsoft.com/en-us/azure/storage/storage-blob-snapshots):

    abcd --snapshots

Filter by last modified date of each blob:

    abcd --startDate 2016-02-13 --endDate 2016-08-04

Filter by container name and/or blob name using [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions):

    abcd --containerPattern container --blobPattern "blobs?"

**Note**: Some regular expression characters require escaping on the command line.
The output from `azure-blob-container-download` shows when this happens.

For example (Windows):

```text
C:\>abcd --containerPattern ^text
Downloading blobs in account from [beginning of time] to [end of time].
Listing containers in account matching /text/...
```

The leading `^` character of the `--containerPattern` has been lost by the shell.
It can be recovered by quoting the parameter:

```text
C:\>abcd --containerPattern "^text"
Downloading blobs in account from [beginning of time] to [end of time].
Listing containers in account matching /^text/...
```

## History

- 0.1.0 - Initial release
  - 0.1.1 - Patch for OS X

[npm-image]: https://img.shields.io/npm/v/azure-blob-container-download.svg
[npm-url]: https://www.npmjs.com/package/azure-blob-container-download
[github-tag-image]: https://img.shields.io/github/tag/DavidAnson/azure-blob-container-download.svg
[github-tag-url]: https://github.com/DavidAnson/azure-blob-container-download
[license-image]: https://img.shields.io/npm/l/azure-blob-container-download.svg
[license-url]: https://opensource.org/licenses/MIT
