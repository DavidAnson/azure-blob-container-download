# azure-blob-container-download

> Download blobs from an Azure container.

[![npm version][npm-image]][npm-url]
[![GitHub tag][github-tag-image]][github-tag-url]
[![License][license-image]][license-url]

A simple, cross-platform tool to bulk-download blobs from an [Azure storage container](https://azure.microsoft.com/en-us/documentation/services/storage/).

It differs from existing tools by being simple and supporting:

- [AzCopy](https://azure.microsoft.com/en-us/documentation/articles/storage-use-azcopy/): Cross-platform use
- [Azure CLI](https://azure.microsoft.com/en-us/documentation/articles/storage-azure-cli/): Bulk-download of blobs
- [Azure PowerShell](https://azure.microsoft.com/en-us/documentation/articles/storage-powershell-guide-full/): Cross-platform use
- [Azure Portal](https://azure.microsoft.com/en-us/features/azure-portal/): Bulk-download of blobs

## Install

```shell
npm install --global azure-blob-container-download
```

## Options

```text
Usage: abcd [options]

Options:
  --account    Storage account (or set AZURE_STORAGE_ACCOUNT)  [string]
  --key        Storage access key (or set AZURE_STORAGE_ACCESS_KEY)  [string]
  --snapshots  True to include blob snapshots  [boolean] [default: false]
  --version    Show version number  [boolean]
  --help       Show help  [boolean]

Download blobs from an Azure container.
https://github.com/DavidAnson/azure-blob-container-download
```

## Examples

...

## History

- 0.1.0 - Initial release.

[npm-image]: https://img.shields.io/npm/v/azure-blob-container-download.svg
[npm-url]: https://www.npmjs.com/package/azure-blob-container-download
[github-tag-image]: https://img.shields.io/github/tag/DavidAnson/azure-blob-container-download.svg
[github-tag-url]: https://github.com/DavidAnson/azure-blob-container-download
[license-image]: https://img.shields.io/npm/l/azure-blob-container-download.svg
[license-url]: https://opensource.org/licenses/MIT
