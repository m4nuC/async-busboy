'use strict';

const Busboy = require('busboy');
const fs = require('fs');
const os = require('os');
const path = require('path');

const getDescriptor = Object.getOwnPropertyDescriptor;

module.exports = function (request, options) {
  options = options || {}
  options.headers = request.headers
  const busboy = new Busboy(options)

  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];

    request.on('close', cleanup)

    busboy
      .on('field', onField.bind(null, fields))
      .on('file', onFile.bind(null, files))
      .on('close', cleanup)
      .on('error', onError)
      .on('end', onEnd)
      .on('finish', onEnd),

    busboy.on('partsLimit', function(){
      const err = new Error('Reach parts limit')
      err.code = 'Request_parts_limit'
      err.status = 413
      onError(err)
    })

    busboy.on('filesLimit', function(){
      const err = new Error('Reach files limit')
      err.code = 'Request_files_limit'
      err.status = 413
      onError(err)
    })

    busboy.on('fieldsLimit', function(){
      const err = new Error('Reach fields limit')
      err.code = 'Request_fields_limit'
      err.status = 413
      onError(err)
    })

    request.pipe(busboy)

    function onError(err) {
      cleanup();
      return reject(err);
    }

    function onEnd(err) {
      cleanup();
      return resolve({fields, files})
    }

    function cleanup() {
      busboy.removeListener('field', onField)
      busboy.removeListener('file', onFile)
      busboy.removeListener('close', cleanup)
      busboy.removeListener('end', cleanup)
      busboy.removeListener('error', onEnd)
      busboy.removeListener('partsLimit', onEnd)
      busboy.removeListener('filesLimit', onEnd)
      busboy.removeListener('fieldsLimit', onEnd)
      busboy.removeListener('finish', onEnd)
    }
  })
}

function onField(fields, name, val, fieldnameTruncated, valTruncated) {
  // don't overwrite prototypes
  if (getDescriptor(Object.prototype, name)) return

  // This looks like a stringified array, let's parse it
  if (name.indexOf('[') > -1) {
    const obj = objectFromBluePrint(extractFormData(name), val);
    reconcile(obj, fields);

  } else {
    fields[name] = val;
  }
}

function onFile(files, fieldname, file, filename, encoding, mimetype) {
  const tmpName = file.tmpName = new Date().getTime()  + fieldname  + filename;
  const saveTo = path.join(os.tmpDir(), path.basename(tmpName));
  file.on('end', function() {
    const readStream = fs.createReadStream(saveTo);
    readStream.fieldname = fieldname
    readStream.filename = filename
    readStream.transferEncoding = readStream.encoding = encoding
    readStream.mimeType = readStream.mime = mimetype;
    files.push(readStream);
  });
  file.pipe(fs.createWriteStream(saveTo));
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
  let arr = string.split('[');
  let first = arr.shift();
  let res = arr.map( v => v.split(']')[0] );
  res.unshift(first);
  return res
}


/**
 *
 * Generate an object given an hiearchy bluepint and the value
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
        return {[next]: acc}
      } else {
        let newAcc = [];
        newAcc[ Number(next) ] = acc;
        return newAcc;
      }
    }, value)
}


/**
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
const mergeArray = (arr1, arr2) => {
  const base = arr2.length >= arr1.length ? arr2 : arr1;
  const additive = arr2.length >= arr1.length ? arr1 : arr2;
  let merged = [];

  // We can't use map as it seems to ingore undefined entries in array i.e.: [ , , value]
  for ( let i = 0 ; i < base.length ; i++) {
    let value = null;
    if ( Array.isArray(base[i]) && Array.isArray(additive[i]) ) {
      value =  mergeArray(base[i], additive[i])
    } else if ( Array.isArray(base[i]) && ! Array.isArray(additive[i]) ) {
      value =  mergeArray(base[i], [additive[i]])
    } else if ( ! Array.isArray(base[i]) && Array.isArray(additive[i]) ) {
      value =  mergeArray([base[i]], additive[i])
    } else {
      value = base[i] || additive[i];
    }

    merged[i]  = value;
  }

  return merged;
}


/**
 * Reconciles formatted data with already formatted data
 *
 * @param  {Object} extractedObject
 * @param  {Object} the field object
 * @return {Object} reconciled fields
 *
 */
const reconcile = (obj, target) => {
  const key = Object.keys(obj)[0];
  const val = obj[key];

  // Dealing with objects
  if (target.hasOwnProperty(key)) {
    return reconcile(val, target[key])
  } else {
    return target[key] = val;
  }

  // Dealing with array values
  if (Array.isArray(val)) {
    if (Array.isArray(target[key])) {
      target[key] = mergeArray(val, target[key]);
    } else {
      target[key] = val;
    }
    return target;
  }


}
