# Promise Based Multipart Form Parser


[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/async-busboy.svg?style=flat-square
[npm-url]: https://npmjs.org/package/async-busboy
[travis-image]: https://img.shields.io/travis/m4nuC/async-busboy.svg?style=flat-square
[travis-url]: https://travis-ci.org/m4nuC/async-busboy
[codecov-image]: https://codecov.io/github/m4nuC/async-busboy/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/m4nuC/async-busboy?branch=master
[download-image]: https://img.shields.io/npm/dm/async-busboy.svg?style=flat-square
[download-url]: https://npmjs.org/package/async-busboy

The typical use case for this library is when handling forms that contain file upload field(s) mixed with other inputs.
Parsing logic relies on [busboy](http://github.com/mscdex/busboy).
Designed for use with [Koa2](https://github.com/koajs/koa/tree/v2.x) and [Async/Await](https://github.com/tc39/ecmascript-asyncawait).

## Examples

### Async/Await (using temp files)
```js
import asyncBusboy from 'async-busboy';

// Koa 2 middleware
async function(ctx, next) {
  const {files, fields} = await asyncBusboy(ctx.req);

  // Make some validation on the fields before upload to S3
  if ( checkFiles(fields) ) {
    files.map(uploadFilesToS3)
  } else {
    return 'error';
  }
}
```
### Async/Await (using custom onFile handler, i.e. no temp files)
```js
import asyncBusboy from 'async-busboy';

// Koa 2 middleware
async function(ctx, next) {
  const { fields } = await asyncBusboy(ctx.req, {
    onFile: function(fieldname, file, filename, encoding, mimetype) {
      uploadFilesToS3(file);
    }
  });

  // Do validation, but files are already uploading...
  if ( !checkFiles(fields) ) {
    return 'error';
  }
}
```

### ES5 with promise (using temp files)
```js
var asyncBusboy = require('async-busboy');

function(someHTTPRequest) {
  asyncBusboy(someHTTPRequest).then(function(formData) {
    // do something with formData.files
    // do someting with formData.fields
  });
}
```

## Async API using temp files
The request streams are first written to temporary files using `os.tmpdir()`. File read streams associated with the temporary files are returned from the call to async-busboy. When the consumer has drained the file read streams, the files will be automatically removed, otherwise the host OS should take care of the cleaning process.

## Async API using custom onFile handler
If a custom onFile handler is specified in the options to async-busboy it
will only resolve an object containing fields, but instead no temporary files
needs to be created since the file stream is directly passed to the application.
Note that all file streams need to be consumed for async-busboy to resolve due
to the implementation of busboy. If you don't care about a received
file stream, simply call `stream.resume()` to discard the content.

## Working with nested inputs and objects
Make sure to serialize objects before sending them as formData.
i.e:
```js
// Given an object that represent the form data:
{
  'field1': 'value',
  'objectField': {
    'key': 'anotherValue'
  },
  'arrayField': ['a', 'b']
  //...
};
```

Should be sent as:
```
// -> field1[value]
// -> objectField[key][anotherKey]
// -> arrayField[0]['a']
// -> arrayField[1]['b']
// .....
```

Here is a function that can take care of this process
```js
const serializeFormData = (obj, formDataObj, namespace = null) => {
  var formDataObj = formDataObj || {};
  var formKey;
  for(var property in obj) {
    if(obj.hasOwnProperty(property)) {
      if(namespace) {
        formKey = namespace + '[' + property + ']';
      } else {
        formKey = property;
      }

      var value = obj[property];
      if(typeof value === 'object' && !(value instanceof File) && !(value instanceof Date)) {
          serializeFormData(value, formDataObj, formKey);
      } else if(value instanceof Date) {
        formDataObj[formKey] = value.toISOString();
      } else {
        formDataObj[formKey] = value;
      }
    }
  }
  return formDataObj;
};

// -->
```


### Try it on your local
If you want to run some test locally, clone this repo, then run: `node examples/index.js`
From there you can use something like [Postman](https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop?hl=en) to send `POST` request to `localhost:8080`.
Note: When using Postman make sure to not send a `Content-Type` header, if it's filed by default, just delete it. (This is to let the `boudary` header be generated automaticaly)


### Use cases:

- Form sending only octet-stream (files)

- Form sending file octet-stream (files) and input fields.
  a. File and fields are processed has they arrive. Their order do not matter.
  b. Fields must be processed (for example validated) before processing the files.
