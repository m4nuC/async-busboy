'use strict';

const Busboy = require('busboy');
const fs = require('fs');
const os = require('os');
const path = require('path');

const getDescriptor = Object.getOwnPropertyDescriptor;

module.exports = function (request, options) {
  options = options || {};
  options.headers = request.headers;
  const busboy = new Busboy(options);

  return new Promise((resolve, reject) => {
    const fields = {};
    const filePromises = [];

    request.on('close', cleanup);

    busboy
      .on('field', onField.bind(null, fields))
      .on('file', onFile.bind(null, filePromises))
      .on('close', cleanup)
      .on('error', onError)
      .on('end', onEnd)
      .on('finish', onEnd),

    busboy.on('partsLimit', function(){
      const err = new Error('Reach parts limit');
      err.code = 'Request_parts_limit';
      err.status = 413;
      onError(err);
    });

    busboy.on('filesLimit', () => {
      const err = new Error('Reach files limit');
      err.code = 'Request_files_limit';
      err.status = 413;
      onError(err);
    });

    busboy.on('fieldsLimit', () => {
      const err = new Error('Reach fields limit');
      err.code = 'Request_fields_limit';
      err.status = 413;
      onError(err);
    });

    request.pipe(busboy);

    function onError(err) {
      cleanup();
      return reject(err);
    }

    function onEnd(err) {
      if(err) reject(err);
      cleanup();
      if (filePromises.length > 0) {
        return Promise.all(filePromises)
                        .then(files => resolve({fields, files}))
                        .catch(reject);
      } else {
        return resolve({fields, files: []});
      }
    }

    function cleanup() {
      busboy.removeListener('field', onField);
      busboy.removeListener('file', onFile);
      busboy.removeListener('close', cleanup);
      busboy.removeListener('end', cleanup);
      busboy.removeListener('error', onEnd);
      busboy.removeListener('partsLimit', onEnd);
      busboy.removeListener('filesLimit', onEnd);
      busboy.removeListener('fieldsLimit', onEnd);
      busboy.removeListener('finish', onEnd);
    }
  });
};

function onField(fields, name, val, fieldnameTruncated, valTruncated) {
  // don't overwrite prototypes
  if (getDescriptor(Object.prototype, name)) return;

  // This looks like a stringified array, let's parse it
  if (name.indexOf('[') > -1) {
    const obj = objectFromBluePrint(extractFormData(name), val);
    reconcile(obj, fields);

  } else {
    fields[name] = val;
  }
}

function onFile(filePromises, fieldname, file, filename, encoding, mimetype) {
  const tmpName = file.tmpName = new Date().getTime()  + fieldname  + filename;
  const saveTo = path.join(os.tmpdir(), path.basename(tmpName));

  filePromises.push(new Promise((resolve, reject) => {
    file.pipe(fs.createWriteStream(saveTo))
          .on('close', () => {
            const readStream = fs.createReadStream(saveTo);
            readStream.fieldname = fieldname;
            readStream.filename = filename;
            readStream.transferEncoding = readStream.encoding = encoding;
            readStream.mimeType = readStream.mime = mimetype;

            resolve(readStream)
          })
          .on('error', reject)
  }));
}

/**
 *
 * Extract a hierarchy array from a stringified formData single input.
 *
 *
 * i.e. topLevel[sub1][sub2] => [topLevel, sub1, sub2]
 *
 * @param  {String} string: Stringify representation of a formData Object
 * @return {Array}
 *
 */
const extractFormData = (string) => {
  const arr = string.split('[');
  const first = arr.shift();
  const res = arr.map( v => v.split(']')[0] );
  res.unshift(first);
  return res;
};

/**
 *
 * Generate an object given an hierarchy blueprint and the value
 *
 * i.e. [key1, key2, key3] => { key1: {key2: { key3: value }}};
 *
 * @param  {Array} arr:   from extractFormData
 * @param  {[type]} value: The actual value for this key
 * @return {[type]}       [description]
 *
 */
const objectFromBluePrint = (arr, value) => {
  return arr
    .reverse()
    .reduce((acc, next) => {
      if (Number(next).toString() === 'NaN') {
        return {[next]: acc};
      } else {
        const newAcc = [];
        newAcc[ Number(next) ] = acc;
        return newAcc;
      }
    }, value);
};

/**
 * [Deprecated] because of https://jsbin.com/hulekomopo/1/
 * Merges two array when one of them may me unconplete
 *
 * i.e.:
 *  arr1 => [ , , value]
 *  arr2 => [ missingValue1, missingValue2 ]
 * @param  {Array} arr1
 * @param  {Array} arr2
 * @return {Array}
 *
 */
// const mergeArray = (arr1, arr2) => {
//   const base = arr2.length >= arr1.length ? arr2 : arr1;
//   const additive = arr2.length >= arr1.length ? arr1 : arr2;
//   let merged = [];

//   // We can't use map as it seems to ingore undefined entries in array i.e.: [ , , value]
//   for ( let i = 0 ; i < base.length ; i++) {
//     let value = null;
//     if ( Array.isArray(base[i]) && Array.isArray(additive[i]) ) {
//       value =  mergeArray(base[i], additive[i])
//     } else if ( Array.isArray(base[i]) && ! Array.isArray(additive[i]) ) {
//       value =  mergeArray(base[i], [additive[i]])
//     } else if ( ! Array.isArray(base[i]) && Array.isArray(additive[i]) ) {
//       value =  mergeArray([base[i]], additive[i])
//     } else {
//       value = base[i] || additive[i];
//     }

//     merged[i]  = value;
//   }

//   return merged;
// }

/**
 * Reconciles formatted data with already formatted data
 *
 * @param  {Object} obj extractedObject
 * @param  {Object} target the field object
 * @return {Object} reconciled fields
 *
 */
const reconcile = (obj, target) => {
  const key = Object.keys(obj)[0];
  const val = obj[key];

  // The reconciliation works even with array has
  // Object.keys will yield the array indexes
  // see https://jsbin.com/hulekomopo/1/
  // Since array are in form of [ , , valu3] [value1, value2]
  // the final array will be: [value1, value2, value3] has expected
  if (target.hasOwnProperty(key)) {
    return reconcile(val, target[key]);
  } else {
    return target[key] = val;
  }

  // [Deprecated] because of https://jsbin.com/hulekomopo/1/
  // Dealing with array values
  // if (Array.isArray(val)) {
  //   if (Array.isArray(target[key])) {
  //     target[key] = mergeArray(val, target[key]);
  //   } else {
  //     target[key] = val;
  //   }
  //   return target;
  // }
};
