'use strict';
const Stream = require('stream');
const expect = require('expect');
const path = require('path');
const fs = require('fs');
const formstream = require('formstream');
const asyncBusboy = require('./');

const fileContent = [
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
];

const readFileStreamPromise = (readStream) => new Promise((resolve, reject) => {
  let buffers = [];
  readStream.on("data", (buf) => buffers.push(buf));
  readStream.on("end", () => resolve(Buffer.concat(buffers)));
  readStream.on("error", reject);
});

describe('Async-busboy', () => {
  it('should gather all fields and streams', (done) => {
    asyncBusboy(request()).then(formData => {
      expect(Object.keys(formData.files).length).toBe(3);
      expect(Object.keys(formData.fields).length).toBe(5);

      // Check file contents
      const fileContentPromises = formData.files.map(readFileStreamPromise);
      Promise.all(fileContentPromises)
        .then((contentBufs) => {
          contentBufs.forEach((content, index) =>
            expect(content.toString()).toBe(fileContent[index])
          );
          done();
        })
        .catch(done);
    }).catch(done);
  });

  it('should gather all fields and streams using custom file handler', (done) => {
    const fileContentPromises = [];
    const onFileHandler = (fieldname, file, filename, encoding, mimetype) => {
        fileContentPromises.push(readFileStreamPromise(file));
    };
    asyncBusboy(request(), { onFile: onFileHandler }).then(formData => {
      expect(Object.keys(formData.fields).length).toBe(5);

      // Check file contents
      Promise.all(fileContentPromises)
        .then((contentBufs) => {
          contentBufs.forEach((content, index) =>
            expect(content.toString()).toBe(fileContent[index])
          );
          done();
        })
        .catch(done);
    }).catch(done);
  });

  it('should return a valid collection', (done) => {
    asyncBusboy(request())
      .then(formData => {
        var someCollection = formData.fields.someCollection;
        expect(Array.isArray(someCollection)).toBe(true);
        expect(someCollection[0]).toEqual({foo: 'foo', bar: 'bar'});
        done();
      })
      .catch(done)
  });

  it('should return a valid array', (done) => {
    asyncBusboy(request())
      .then(formData => {
        var fileName0 = formData.fields.file_name_0;
        expect(Array.isArray(fileName0)).toBe(true);
        expect(fileName0.length).toBe(3);
        expect(fileName0[0]).toEqual('super alpha file');
        expect(fileName0[1]).toEqual('super beta file');
        expect(fileName0[2]).toEqual('super gamma file');
        done();
      })
      .catch(done)
  });

  it('should not overwrite prototypes', (done) => {
    asyncBusboy(request()).then(formData => {
      expect(formData.fields.hasOwnProperty).toEqual(Object.prototype.hasOwnProperty)
      done();
    }).catch(done);
  });

  it('should throw error when the files limit is reached', (done) => {
    asyncBusboy(request(), {limits: {
      files: 1
    }}).then(() => {
        done(makeError('Request_files_limit was not thrown'))
      },
      e => {
        expect(e.status).toBe(413);
        expect(e.code).toBe('Request_files_limit');
        expect(e.message).toBe('Reach files limit');
        done()
      });
  });

  it('should throw error when the fields limit is reached', (done) => {
    asyncBusboy(request(), {limits: {
      fields: 1
    }}).then(() => {
        done(makeError('Request_fields_limit was not thrown'))
      },
      e => {
        expect(e.status).toBe(413);
        expect(e.code).toBe('Request_fields_limit');
        expect(e.message).toBe('Reach fields limit');
        done()
      });
  });
});

function makeError(message) {
  return new Error(message);
}

function request() {
  // https://github.com/mscdex/busboy/blob/master/test/test-types-multipart.js

  var stream = new Stream.PassThrough()

  stream.headers = {
    'content-type': 'multipart/form-data; boundary=---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k'
  }

  stream.write([
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="file_name_0"',
    '',
    'super alpha file',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="file_name_0"',
    '',
    'super beta file',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="file_name_0"',
    '',
    'super gamma file',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="file_name_1"',
    '',
    'super gamma file',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="_csrf"',
    '',
    'ooxx',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="hasOwnProperty"',
    '',
    'super bad file',

    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someCollection[0][foo]"',
    '',
    'foo',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someCollection[0][bar]"',
    '',
    'bar',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someCollection[1][0]"',
    '',
    'foo',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someCollection[1][1]"',
    '',
    'bar',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someField[foo]"',
    '',
    'foo',
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="someField[bar]"',
    '',
    'bar',

    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
    'Content-Type: application/octet-stream',
    '',
    fileContent[0],
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="upload_file_1"; filename="1k_b.dat"',
    'Content-Type: application/octet-stream',
    '',
    fileContent[1],
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
    'Content-Disposition: form-data; name="upload_file_2"; filename="hack.exe"',
    'Content-Type: application/octet-stream',
    '',
    fileContent[2],
    '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--'
  ].join('\r\n'))

  return stream
}
