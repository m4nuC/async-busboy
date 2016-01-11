# Promised based multipart form parser


[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/async-busboy.svg?style=flat-square
[npm-url]: https://npmjs.org/package/async-busboy
[travis-image]: https://img.shields.io/travis/m4nuC/async-busboy.svg?style=flat-square
[travis-url]: https://travis-ci.org/m4nuC/async-busboy
[codecov-image]: https://codecov.io/github/m4nuC/async-busboy/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/m4nuC/async-busboy?branch=master
[download-image]: https://img.shields.io/npm/dm/async-busboy.svg?style=flat-square
[download-url]: https://npmjs.org/package/async-busboy


Promised base wrapper around busboy. Can be used with async/await and koa2.


## Use cases:

- Form sending only octet-stream (files)

- Form sending file octet-stream (files) and input fields.
  a. File and fields are processed has they arrive. Their order do not matter.
  b. Fields must be processed (for example validated) before processing the files.