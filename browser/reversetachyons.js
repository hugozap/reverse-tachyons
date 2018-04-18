(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":8}],4:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":11}],5:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;

},{"once":14}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],7:[function(require,module,exports){
(function (process){
var Readable = require('readable-stream').Readable
var inherits = require('inherits')

module.exports = from2

from2.ctor = ctor
from2.obj = obj

var Proto = ctor()

function toFunction(list) {
  list = list.slice()
  return function (_, cb) {
    var err = null
    var item = list.length ? list.shift() : null
    if (item instanceof Error) {
      err = item
      item = null
    }

    cb(err, item)
  }
}

function from2(opts, read) {
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    read = opts
    opts = {}
  }

  var rs = new Proto(opts)
  rs._from = Array.isArray(read) ? toFunction(read) : (read || noop)
  return rs
}

function ctor(opts, read) {
  if (typeof opts === 'function') {
    read = opts
    opts = {}
  }

  opts = defaults(opts)

  inherits(Class, Readable)
  function Class(override) {
    if (!(this instanceof Class)) return new Class(override)
    this._reading = false
    this._callback = check
    this.destroyed = false
    Readable.call(this, override || opts)

    var self = this
    var hwm = this._readableState.highWaterMark

    function check(err, data) {
      if (self.destroyed) return
      if (err) return self.destroy(err)
      if (data === null) return self.push(null)
      self._reading = false
      if (self.push(data)) self._read(hwm)
    }
  }

  Class.prototype._from = read || noop
  Class.prototype._read = function(size) {
    if (this._reading || this.destroyed) return
    this._reading = true
    this._from(size, this._callback)
  }

  Class.prototype.destroy = function(err) {
    if (this.destroyed) return
    this.destroyed = true

    var self = this
    process.nextTick(function() {
      if (err) self.emit('error', err)
      self.emit('close')
    })
  }

  return Class
}

function obj(opts, read) {
  if (typeof opts === 'function' || Array.isArray(opts)) {
    read = opts
    opts = {}
  }

  opts = defaults(opts)
  opts.objectMode = true
  opts.highWaterMark = 16

  return from2(opts, read)
}

function noop () {}

function defaults(opts) {
  opts = opts || {}
  return opts
}

}).call(this,require('_process'))
},{"_process":18,"inherits":9,"readable-stream":30}],8:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],10:[function(require,module,exports){
(function (Buffer){
'use strict';
const from = require('from2');
const pIsPromise = require('p-is-promise');

module.exports = x => {
	if (Array.isArray(x)) {
		x = x.slice();
	}

	let promise;
	let iterator;

	prepare(x);

	function prepare(value) {
		x = value;
		promise = pIsPromise(x) ? x : null;
		// we don't iterate on strings and buffers since slicing them is ~7x faster
		const shouldIterate = !promise && x[Symbol.iterator] && typeof x !== 'string' && !Buffer.isBuffer(x);
		iterator = shouldIterate ? x[Symbol.iterator]() : null;
	}

	return from(function reader(size, cb) {
		if (promise) {
			promise.then(prepare).then(() => reader.call(this, size, cb), cb);
			return;
		}

		if (iterator) {
			const obj = iterator.next();
			setImmediate(cb, null, obj.done ? null : obj.value);
			return;
		}

		if (x.length === 0) {
			setImmediate(cb, null, null);
			return;
		}

		const chunk = x.slice(0, size);
		x = x.slice(size);

		setImmediate(cb, null, chunk);
	});
};

module.exports.obj = x => {
	if (Array.isArray(x)) {
		x = x.slice();
	}

	let promise;
	let iterator;

	prepare(x);

	function prepare(value) {
		x = value;
		promise = pIsPromise(x) ? x : null;
		iterator = !promise && x[Symbol.iterator] ? x[Symbol.iterator]() : null;
	}

	return from.obj(function reader(size, cb) {
		if (promise) {
			promise.then(prepare).then(() => reader.call(this, size, cb), cb);
			return;
		}

		if (iterator) {
			const obj = iterator.next();
			setImmediate(cb, null, obj.done ? null : obj.value);
			return;
		}

		this.push(x);

		setImmediate(cb, null, null);
	});
};

}).call(this,{"isBuffer":require("../is-buffer/index.js")})
},{"../is-buffer/index.js":11,"from2":7,"p-is-promise":15}],11:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],12:[function(require,module,exports){
var through = require('through');

module.exports = function (sep, opts) {
    if (typeof sep === 'object') {
        opts = sep;
        sep = opts.sep;
    }
    if (!opts) opts = {};
    
    var num = 0;
    var tr = through(function (buf) {
        if (opts.end) {
            this.emit('data', buf);
            this.emit('data', sep);
        }
        else {
            if (num > 0) {
                this.emit('data', sep);
            }
            this.emit('data', buf);
        }
        num ++;
    });
    
    return tr;
};

},{"through":13}],13:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end) {
  write = write || function (data) { this.emit('data', data) }
  end = end || function () { this.emit('end') }

  var ended = false, destroyed = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false  
  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }
  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here. 
  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  stream.end = function (data) {
    if(ended) return 
    //this breaks, because pipe doesn't check writable before calling end.
    //throw new Error('cannot call end twice')
    ended = true
    if(arguments.length) stream.write(data)
    this.writable = false
    end.call(this)
    if(!this.readable)
      this.destroy()
  }
  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    stream.writable = stream.readable = false
    stream.emit('close')
  }
  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    stream.emit('pause')
  }
  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('drain')
    }
  }
  return stream
}


}).call(this,require('_process'))
},{"_process":18,"stream":35}],14:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":43}],15:[function(require,module,exports){
'use strict';
module.exports = x => (
	x instanceof Promise ||
	(
		x !== null &&
		typeof x === 'object' &&
		typeof x.then === 'function' &&
		typeof x.catch === 'function'
	)
);

},{}],16:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":18}],17:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,require('_process'))
},{"_process":18}],18:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],19:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":20}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":22,"./_stream_writable":24,"core-util-is":4,"inherits":9,"process-nextick-args":17}],21:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":23,"core-util-is":4,"inherits":9}],22:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":20,"./internal/streams/BufferList":25,"./internal/streams/destroy":26,"./internal/streams/stream":27,"_process":18,"core-util-is":4,"events":6,"inherits":9,"isarray":28,"process-nextick-args":17,"safe-buffer":33,"string_decoder/":36,"util":2}],23:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":20,"core-util-is":4,"inherits":9}],24:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":20,"./internal/streams/destroy":26,"./internal/streams/stream":27,"_process":18,"core-util-is":4,"inherits":9,"process-nextick-args":17,"safe-buffer":33,"util-deprecate":39}],25:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":33,"util":2}],26:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":17}],27:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":6}],28:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],29:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":30}],30:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":20,"./lib/_stream_passthrough.js":21,"./lib/_stream_readable.js":22,"./lib/_stream_transform.js":23,"./lib/_stream_writable.js":24}],31:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":30}],32:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":24}],33:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],34:[function(require,module,exports){
//filter will reemit the data if cb(err,pass) pass is truthy

// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has recieved 'end'


var through = require('through')
var Decoder = require('string_decoder').StringDecoder

module.exports = split

//TODO pass in a function to map across the lines.

function split (matcher, mapper, options) {
  var decoder = new Decoder()
  var soFar = ''
  var maxLength = options && options.maxLength;
  var trailing = options && options.trailing === false ? false : true
  if('function' === typeof matcher)
    mapper = matcher, matcher = null
  if (!matcher)
    matcher = /\r?\n/

  function emit(stream, piece) {
    if(mapper) {
      try {
        piece = mapper(piece)
      }
      catch (err) {
        return stream.emit('error', err)
      }
      if('undefined' !== typeof piece)
        stream.queue(piece)
    }
    else
      stream.queue(piece)
  }

  function next (stream, buffer) {
    var pieces = ((soFar != null ? soFar : '') + buffer).split(matcher)
    soFar = pieces.pop()

    if (maxLength && soFar.length > maxLength)
      return stream.emit('error', new Error('maximum buffer reached'))

    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i]
      emit(stream, piece)
    }
  }

  return through(function (b) {
    next(this, decoder.write(b))
  },
  function () {
    if(decoder.end)
      next(this, decoder.end())
    if(trailing && soFar != null)
      emit(this, soFar)
    this.queue(null)
  })
}

},{"string_decoder":36,"through":37}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":6,"inherits":9,"readable-stream/duplex.js":19,"readable-stream/passthrough.js":29,"readable-stream/readable.js":30,"readable-stream/transform.js":31,"readable-stream/writable.js":32}],36:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":33}],37:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data === null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


}).call(this,require('_process'))
},{"_process":18,"stream":35}],38:[function(require,module,exports){
(function (process){
var Transform = require('readable-stream/transform')
  , inherits  = require('util').inherits
  , xtend     = require('xtend')

function DestroyableTransform(opts) {
  Transform.call(this, opts)
  this._destroyed = false
}

inherits(DestroyableTransform, Transform)

DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return
  this._destroyed = true
  
  var self = this
  process.nextTick(function() {
    if (err)
      self.emit('error', err)
    self.emit('close')
  })
}

// a noop _transform function
function noop (chunk, enc, callback) {
  callback(null, chunk)
}


// create a new export function, used by both the main export and
// the .ctor export, contains common logic for dealing with arguments
function through2 (construct) {
  return function (options, transform, flush) {
    if (typeof options == 'function') {
      flush     = transform
      transform = options
      options   = {}
    }

    if (typeof transform != 'function')
      transform = noop

    if (typeof flush != 'function')
      flush = null

    return construct(options, transform, flush)
  }
}


// main export, just make me a transform stream!
module.exports = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(options)

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})


// make me a reusable prototype that I can `new`, or implicitly `new`
// with a constructor call
module.exports.ctor = through2(function (options, transform, flush) {
  function Through2 (override) {
    if (!(this instanceof Through2))
      return new Through2(override)

    this.options = xtend(options, override)

    DestroyableTransform.call(this, this.options)
  }

  inherits(Through2, DestroyableTransform)

  Through2.prototype._transform = transform

  if (flush)
    Through2.prototype._flush = flush

  return Through2
})


module.exports.obj = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(xtend({ objectMode: true, highWaterMark: 16 }, options))

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})

}).call(this,require('_process'))
},{"_process":18,"readable-stream/transform":31,"util":42,"xtend":44}],39:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],40:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],41:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],42:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":41,"_process":18,"inherits":40}],43:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],44:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],45:[function(require,module,exports){
/* We need to convert tachyon class strings "w-100 h-100 p0"
 * to a css class with all the rules in it
 * usage: tachyons-to-css "class declaration"
 */


var path = require('path')
var split = require('split')
var through2 = require('through2')
var join = require('join-stream')
var eos = require('end-of-stream')
var util = require('util')
var intoStream = require('into-stream');

var tachyonsStr = "/*! TACHYONS v4.9.0 | http://tachyons.io */\n/*\n *\n *      ________            ______\n *      ___  __/_____ _________  /______  ______________________\n *      __  /  _  __ `/  ___/_  __ \\_  / / /  __ \\_  __ \\_  ___/\n *      _  /   / /_/ // /__ _  / / /  /_/ // /_/ /  / / /(__  )\n *      /_/    \\__,_/ \\___/ /_/ /_/_\\__, / \\____//_/ /_//____/\n *                                 /____/\n *\n *    TABLE OF CONTENTS\n *\n *    1. External Library Includes\n *       - Normalize.css | http://normalize.css.github.io\n *    2. Tachyons Modules\n *    3. Variables\n *       - Media Queries\n *       - Colors\n *    4. Debugging\n *       - Debug all\n *       - Debug children\n *\n */\n/* External Library Includes */\n/*! normalize.css v7.0.0 | MIT License | github.com/necolas/normalize.css */\n/* Document\n   ========================================================================== */\n/**\n * 1. Correct the line height in all browsers.\n * 2. Prevent adjustments of font size after orientation changes in\n *    IE on Windows Phone and in iOS.\n */\nhtml { line-height: 1.15; /* 1 */ -ms-text-size-adjust: 100%; /* 2 */ -webkit-text-size-adjust: 100%; /* 2 */ }\n/* Sections\n   ========================================================================== */\n/**\n * Remove the margin in all browsers (opinionated).\n */\nbody { margin: 0; }\n/**\n * Add the correct display in IE 9-.\n */\narticle, aside, footer, header, nav, section { display: block; }\n/**\n * Correct the font size and margin on `h1` elements within `section` and\n * `article` contexts in Chrome, Firefox, and Safari.\n */\nh1 { font-size: 2em; margin: .67em 0; }\n/* Grouping content\n   ========================================================================== */\n/**\n * Add the correct display in IE 9-.\n * 1. Add the correct display in IE.\n */\nfigcaption, figure, main {/* 1 */ display: block; }\n/**\n * Add the correct margin in IE 8.\n */\nfigure { margin: 1em 40px; }\n/**\n * 1. Add the correct box sizing in Firefox.\n * 2. Show the overflow in Edge and IE.\n */\nhr { box-sizing: content-box; /* 1 */ height: 0; /* 1 */ overflow: visible; /* 2 */ }\n/**\n * 1. Correct the inheritance and scaling of font size in all browsers.\n * 2. Correct the odd `em` font sizing in all browsers.\n */\npre { font-family: monospace, monospace; /* 1 */ font-size: 1em; /* 2 */ }\n/* Text-level semantics\n   ========================================================================== */\n/**\n * 1. Remove the gray background on active links in IE 10.\n * 2. Remove gaps in links underline in iOS 8+ and Safari 8+.\n */\na { background-color: transparent; /* 1 */ -webkit-text-decoration-skip: objects; /* 2 */ }\n/**\n * 1. Remove the bottom border in Chrome 57- and Firefox 39-.\n * 2. Add the correct text decoration in Chrome, Edge, IE, Opera, and Safari.\n */\nabbr[title] { border-bottom: none; /* 1 */ text-decoration: underline; /* 2 */ text-decoration: underline dotted; /* 2 */ }\n/**\n * Prevent the duplicate application of `bolder` by the next rule in Safari 6.\n */\nb, strong { font-weight: inherit; }\n/**\n * Add the correct font weight in Chrome, Edge, and Safari.\n */\nb, strong { font-weight: bolder; }\n/**\n * 1. Correct the inheritance and scaling of font size in all browsers.\n * 2. Correct the odd `em` font sizing in all browsers.\n */\ncode, kbd, samp { font-family: monospace, monospace; /* 1 */ font-size: 1em; /* 2 */ }\n/**\n * Add the correct font style in Android 4.3-.\n */\ndfn { font-style: italic; }\n/**\n * Add the correct background and color in IE 9-.\n */\nmark { background-color: #ff0; color: #000; }\n/**\n * Add the correct font size in all browsers.\n */\nsmall { font-size: 80%; }\n/**\n * Prevent `sub` and `sup` elements from affecting the line height in\n * all browsers.\n */\nsub, sup { font-size: 75%; line-height: 0; position: relative; vertical-align: baseline; }\nsub { bottom: -0.25em; }\nsup { top: -0.5em; }\n/* Embedded content\n   ========================================================================== */\n/**\n * Add the correct display in IE 9-.\n */\naudio, video { display: inline-block; }\n/**\n * Add the correct display in iOS 4-7.\n */\naudio:not([controls]) { display: none; height: 0; }\n/**\n * Remove the border on images inside links in IE 10-.\n */\nimg { border-style: none; }\n/**\n * Hide the overflow in IE.\n */\nsvg:not(:root) { overflow: hidden; }\n/* Forms\n   ========================================================================== */\n/**\n * 1. Change the font styles in all browsers (opinionated).\n * 2. Remove the margin in Firefox and Safari.\n */\nbutton, input, optgroup, select, textarea { font-family: sans-serif; /* 1 */ font-size: 100%; /* 1 */ line-height: 1.15; /* 1 */ margin: 0; /* 2 */ }\n/**\n * Show the overflow in IE.\n * 1. Show the overflow in Edge.\n */\nbutton, input {/* 1 */ overflow: visible; }\n/**\n * Remove the inheritance of text transform in Edge, Firefox, and IE.\n * 1. Remove the inheritance of text transform in Firefox.\n */\nbutton, select {/* 1 */ text-transform: none; }\n/**\n * 1. Prevent a WebKit bug where (2) destroys native `audio` and `video`\n *    controls in Android 4.\n * 2. Correct the inability to style clickable types in iOS and Safari.\n */\nbutton, html [type=\"button\"], /* 1 */\n[type=\"reset\"], [type=\"submit\"] { -webkit-appearance: button; /* 2 */ }\n/**\n * Remove the inner border and padding in Firefox.\n */\nbutton::-moz-focus-inner, [type=\"button\"]::-moz-focus-inner,\n[type=\"reset\"]::-moz-focus-inner, [type=\"submit\"]::-moz-focus-inner { border-style: none; padding: 0; }\n/**\n * Restore the focus styles unset by the previous rule.\n */\nbutton:-moz-focusring, [type=\"button\"]:-moz-focusring,\n[type=\"reset\"]:-moz-focusring, [type=\"submit\"]:-moz-focusring { outline: 1px dotted ButtonText; }\n/**\n * Correct the padding in Firefox.\n */\nfieldset { padding: .35em .75em .625em; }\n/**\n * 1. Correct the text wrapping in Edge and IE.\n * 2. Correct the color inheritance from `fieldset` elements in IE.\n * 3. Remove the padding so developers are not caught out when they zero out\n *    `fieldset` elements in all browsers.\n */\nlegend { box-sizing: border-box; /* 1 */ color: inherit; /* 2 */ display: table; /* 1 */ max-width: 100%; /* 1 */ padding: 0; /* 3 */ white-space: normal; /* 1 */ }\n/**\n * 1. Add the correct display in IE 9-.\n * 2. Add the correct vertical alignment in Chrome, Firefox, and Opera.\n */\nprogress { display: inline-block; /* 1 */ vertical-align: baseline; /* 2 */ }\n/**\n * Remove the default vertical scrollbar in IE.\n */\ntextarea { overflow: auto; }\n/**\n * 1. Add the correct box sizing in IE 10-.\n * 2. Remove the padding in IE 10-.\n */\n[type=\"checkbox\"], [type=\"radio\"] { box-sizing: border-box; /* 1 */ padding: 0; /* 2 */ }\n/**\n * Correct the cursor style of increment and decrement buttons in Chrome.\n */\n[type=\"number\"]::-webkit-inner-spin-button,\n[type=\"number\"]::-webkit-outer-spin-button { height: auto; }\n/**\n * 1. Correct the odd appearance in Chrome and Safari.\n * 2. Correct the outline style in Safari.\n */\n[type=\"search\"] { -webkit-appearance: textfield; /* 1 */ outline-offset: -2px; /* 2 */ }\n/**\n * Remove the inner padding and cancel buttons in Chrome and Safari on macOS.\n */\n[type=\"search\"]::-webkit-search-cancel-button,\n[type=\"search\"]::-webkit-search-decoration { -webkit-appearance: none; }\n/**\n * 1. Correct the inability to style clickable types in iOS and Safari.\n * 2. Change font properties to `inherit` in Safari.\n */\n::-webkit-file-upload-button { -webkit-appearance: button; /* 1 */ font: inherit; /* 2 */ }\n/* Interactive\n   ========================================================================== */\n/*\n * Add the correct display in IE 9-.\n * 1. Add the correct display in Edge, IE, and Firefox.\n */\ndetails, /* 1 */\nmenu { display: block; }\n/*\n * Add the correct display in all browsers.\n */\nsummary { display: list-item; }\n/* Scripting\n   ========================================================================== */\n/**\n * Add the correct display in IE 9-.\n */\ncanvas { display: inline-block; }\n/**\n * Add the correct display in IE.\n */\ntemplate { display: none; }\n/* Hidden\n   ========================================================================== */\n/**\n * Add the correct display in IE 10-.\n */\n[hidden] { display: none; }\n/* Modules */\n/*\n \n  BOX SIZING\n\n*/\nhtml, body, div, article, aside, section, main, nav, footer, header, form,\nfieldset, legend, pre, code, a, h1, h2, h3, h4, h5, h6, p, ul, ol, li, dl, dt,\ndd, blockquote, figcaption, figure, textarea, table, td, th, tr,\ninput[type=\"email\"], input[type=\"number\"], input[type=\"password\"],\ninput[type=\"tel\"], input[type=\"text\"], input[type=\"url\"], .border-box { box-sizing: border-box; }\n/*\n\n   ASPECT RATIOS\n\n*/\n/* This is for fluid media that is embedded from third party sites like youtube, vimeo etc.\n * Wrap the outer element in aspect-ratio and then extend it with the desired ratio i.e\n * Make sure there are no height and width attributes on the embedded media.\n * Adapted from: https://github.com/suitcss/components-flex-embed\n *\n * Example:\n *\n * <div class=\"aspect-ratio aspect-ratio--16x9\">\n *  <iframe class=\"aspect-ratio--object\"></iframe>\n * </div>\n *\n * */\n.aspect-ratio { height: 0; position: relative; }\n.aspect-ratio--16x9 { padding-bottom: 56.25%; }\n.aspect-ratio--9x16 { padding-bottom: 177.77%; }\n.aspect-ratio--4x3 { padding-bottom: 75%; }\n.aspect-ratio--3x4 { padding-bottom: 133.33%; }\n.aspect-ratio--6x4 { padding-bottom: 66.6%; }\n.aspect-ratio--4x6 { padding-bottom: 150%; }\n.aspect-ratio--8x5 { padding-bottom: 62.5%; }\n.aspect-ratio--5x8 { padding-bottom: 160%; }\n.aspect-ratio--7x5 { padding-bottom: 71.42%; }\n.aspect-ratio--5x7 { padding-bottom: 140%; }\n.aspect-ratio--1x1 { padding-bottom: 100%; }\n.aspect-ratio--object { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; }\n/*\n\n   IMAGES\n   Docs: http://tachyons.io/docs/elements/images/\n\n*/\n/* Responsive images! */\nimg { max-width: 100%; }\n/*\n\n   BACKGROUND SIZE\n   Docs: http://tachyons.io/docs/themes/background-size/\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/*\n  Often used in combination with background image set as an inline style\n  on an html element.\n*/\n.cover { background-size: cover !important; }\n.contain { background-size: contain !important; }\n/*\n\n    BACKGROUND POSITION\n\n    Base:\n    bg = background\n\n    Modifiers:\n    -center = center center\n    -top = top center\n    -right = center right\n    -bottom = bottom center\n    -left = center left\n\n    Media Query Extensions:\n      -ns = not-small\n      -m  = medium\n      -l  = large\n\n */\n.bg-center { background-repeat: no-repeat; background-position: center center; }\n.bg-top { background-repeat: no-repeat; background-position: top center; }\n.bg-right { background-repeat: no-repeat; background-position: center right; }\n.bg-bottom { background-repeat: no-repeat; background-position: bottom center; }\n.bg-left { background-repeat: no-repeat; background-position: center left; }\n/*\n\n   OUTLINES\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.outline { outline: 1px solid; }\n.outline-transparent { outline: 1px solid transparent; }\n.outline-0 { outline: 0; }\n/*\n\n    BORDERS\n    Docs: http://tachyons.io/docs/themes/borders/\n\n    Base:\n      b = border\n\n    Modifiers:\n      a = all\n      t = top\n      r = right\n      b = bottom\n      l = left\n      n = none\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.ba { border-style: solid; border-width: 1px; }\n.bt { border-top-style: solid; border-top-width: 1px; }\n.br { border-right-style: solid; border-right-width: 1px; }\n.bb { border-bottom-style: solid; border-bottom-width: 1px; }\n.bl { border-left-style: solid; border-left-width: 1px; }\n.bn { border-style: none; border-width: 0; }\n/*\n\n   BORDER COLORS\n   Docs: http://tachyons.io/docs/themes/borders/\n\n   Border colors can be used to extend the base\n   border classes ba,bt,bb,br,bl found in the _borders.css file.\n\n   The base border class by default will set the color of the border\n   to that of the current text color. These classes are for the cases\n   where you desire for the text and border colors to be different.\n\n   Base:\n     b = border\n\n   Modifiers:\n   --color-name = each color variable name is also a border color name\n\n*/\n.b--black { border-color: #000; }\n.b--near-black { border-color: #111; }\n.b--dark-gray { border-color: #333; }\n.b--mid-gray { border-color: #555; }\n.b--gray { border-color: #777; }\n.b--silver { border-color: #999; }\n.b--light-silver { border-color: #aaa; }\n.b--moon-gray { border-color: #ccc; }\n.b--light-gray { border-color: #eee; }\n.b--near-white { border-color: #f4f4f4; }\n.b--white { border-color: #fff; }\n.b--white-90 { border-color: rgba( 255, 255, 255, .9 ); }\n.b--white-80 { border-color: rgba( 255, 255, 255, .8 ); }\n.b--white-70 { border-color: rgba( 255, 255, 255, .7 ); }\n.b--white-60 { border-color: rgba( 255, 255, 255, .6 ); }\n.b--white-50 { border-color: rgba( 255, 255, 255, .5 ); }\n.b--white-40 { border-color: rgba( 255, 255, 255, .4 ); }\n.b--white-30 { border-color: rgba( 255, 255, 255, .3 ); }\n.b--white-20 { border-color: rgba( 255, 255, 255, .2 ); }\n.b--white-10 { border-color: rgba( 255, 255, 255, .1 ); }\n.b--white-05 { border-color: rgba( 255, 255, 255, .05 ); }\n.b--white-025 { border-color: rgba( 255, 255, 255, .025 ); }\n.b--white-0125 { border-color: rgba( 255, 255, 255, .0125 ); }\n.b--black-90 { border-color: rgba( 0, 0, 0, .9 ); }\n.b--black-80 { border-color: rgba( 0, 0, 0, .8 ); }\n.b--black-70 { border-color: rgba( 0, 0, 0, .7 ); }\n.b--black-60 { border-color: rgba( 0, 0, 0, .6 ); }\n.b--black-50 { border-color: rgba( 0, 0, 0, .5 ); }\n.b--black-40 { border-color: rgba( 0, 0, 0, .4 ); }\n.b--black-30 { border-color: rgba( 0, 0, 0, .3 ); }\n.b--black-20 { border-color: rgba( 0, 0, 0, .2 ); }\n.b--black-10 { border-color: rgba( 0, 0, 0, .1 ); }\n.b--black-05 { border-color: rgba( 0, 0, 0, .05 ); }\n.b--black-025 { border-color: rgba( 0, 0, 0, .025 ); }\n.b--black-0125 { border-color: rgba( 0, 0, 0, .0125 ); }\n.b--dark-red { border-color: #e7040f; }\n.b--red { border-color: #ff4136; }\n.b--light-red { border-color: #ff725c; }\n.b--orange { border-color: #ff6300; }\n.b--gold { border-color: #ffb700; }\n.b--yellow { border-color: #ffd700; }\n.b--light-yellow { border-color: #fbf1a9; }\n.b--purple { border-color: #5e2ca5; }\n.b--light-purple { border-color: #a463f2; }\n.b--dark-pink { border-color: #d5008f; }\n.b--hot-pink { border-color: #ff41b4; }\n.b--pink { border-color: #ff80cc; }\n.b--light-pink { border-color: #ffa3d7; }\n.b--dark-green { border-color: #137752; }\n.b--green { border-color: #19a974; }\n.b--light-green { border-color: #9eebcf; }\n.b--navy { border-color: #001b44; }\n.b--dark-blue { border-color: #00449e; }\n.b--blue { border-color: #357edd; }\n.b--light-blue { border-color: #96ccff; }\n.b--lightest-blue { border-color: #cdecff; }\n.b--washed-blue { border-color: #f6fffe; }\n.b--washed-green { border-color: #e8fdf5; }\n.b--washed-yellow { border-color: #fffceb; }\n.b--washed-red { border-color: #ffdfdf; }\n.b--transparent { border-color: transparent; }\n.b--inherit { border-color: inherit; }\n/*\n\n   BORDER RADIUS\n   Docs: http://tachyons.io/docs/themes/border-radius/\n\n   Base:\n     br   = border-radius\n\n   Modifiers:\n     0    = 0/none\n     1    = 1st step in scale\n     2    = 2nd step in scale\n     3    = 3rd step in scale\n     4    = 4th step in scale\n\n   Literal values:\n     -100 = 100%\n     -pill = 9999px\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.br0 { border-radius: 0; }\n.br1 { border-radius: .125rem; }\n.br2 { border-radius: .25rem; }\n.br3 { border-radius: .5rem; }\n.br4 { border-radius: 1rem; }\n.br-100 { border-radius: 100%; }\n.br-pill { border-radius: 9999px; }\n.br--bottom { border-top-left-radius: 0; border-top-right-radius: 0; }\n.br--top { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }\n.br--right { border-top-left-radius: 0; border-bottom-left-radius: 0; }\n.br--left { border-top-right-radius: 0; border-bottom-right-radius: 0; }\n/*\n\n   BORDER STYLES\n   Docs: http://tachyons.io/docs/themes/borders/\n\n   Depends on base border module in _borders.css\n\n   Base:\n     b = border-style\n\n   Modifiers:\n     --none   = none\n     --dotted = dotted\n     --dashed = dashed\n     --solid  = solid\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n */\n.b--dotted { border-style: dotted; }\n.b--dashed { border-style: dashed; }\n.b--solid { border-style: solid; }\n.b--none { border-style: none; }\n/*\n\n   BORDER WIDTHS\n   Docs: http://tachyons.io/docs/themes/borders/\n\n   Base:\n     bw = border-width\n\n   Modifiers:\n     0 = 0 width border\n     1 = 1st step in border-width scale\n     2 = 2nd step in border-width scale\n     3 = 3rd step in border-width scale\n     4 = 4th step in border-width scale\n     5 = 5th step in border-width scale\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.bw0 { border-width: 0; }\n.bw1 { border-width: .125rem; }\n.bw2 { border-width: .25rem; }\n.bw3 { border-width: .5rem; }\n.bw4 { border-width: 1rem; }\n.bw5 { border-width: 2rem; }\n/* Resets */\n.bt-0 { border-top-width: 0; }\n.br-0 { border-right-width: 0; }\n.bb-0 { border-bottom-width: 0; }\n.bl-0 { border-left-width: 0; }\n/*\n\n  BOX-SHADOW\n  Docs: http://tachyons.io/docs/themes/box-shadow/\n\n  Media Query Extensions:\n   -ns = not-small\n   -m  = medium\n   -l  = large\n\n */\n.shadow-1 { box-shadow: 0 0 4px 2px rgba( 0, 0, 0, .2 ); }\n.shadow-2 { box-shadow: 0 0 8px 2px rgba( 0, 0, 0, .2 ); }\n.shadow-3 { box-shadow: 2px 2px 4px 2px rgba( 0, 0, 0, .2 ); }\n.shadow-4 { box-shadow: 2px 2px 8px 0 rgba( 0, 0, 0, .2 ); }\n.shadow-5 { box-shadow: 4px 4px 8px 0 rgba( 0, 0, 0, .2 ); }\n/*\n\n   CODE\n\n*/\n.pre { overflow-x: auto; overflow-y: hidden; overflow: scroll; }\n/*\n\n   COORDINATES\n   Docs: http://tachyons.io/docs/layout/position/\n\n   Use in combination with the position module.\n\n   Base:\n     top\n     bottom\n     right\n     left\n\n   Modifiers:\n     -0  = literal value 0\n     -1  = literal value 1\n     -2  = literal value 2\n     --1 = literal value -1\n     --2 = literal value -2\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.top-0 { top: 0; }\n.right-0 { right: 0; }\n.bottom-0 { bottom: 0; }\n.left-0 { left: 0; }\n.top-1 { top: 1rem; }\n.right-1 { right: 1rem; }\n.bottom-1 { bottom: 1rem; }\n.left-1 { left: 1rem; }\n.top-2 { top: 2rem; }\n.right-2 { right: 2rem; }\n.bottom-2 { bottom: 2rem; }\n.left-2 { left: 2rem; }\n.top--1 { top: -1rem; }\n.right--1 { right: -1rem; }\n.bottom--1 { bottom: -1rem; }\n.left--1 { left: -1rem; }\n.top--2 { top: -2rem; }\n.right--2 { right: -2rem; }\n.bottom--2 { bottom: -2rem; }\n.left--2 { left: -2rem; }\n.absolute--fill { top: 0; right: 0; bottom: 0; left: 0; }\n/*\n\n   CLEARFIX\n   http://tachyons.io/docs/layout/clearfix/\n\n*/\n/* Nicolas Gallaghers Clearfix solution\n   Ref: http://nicolasgallagher.com/micro-clearfix-hack/ */\n.cf:before, .cf:after { content: \" \"; display: table; }\n.cf:after { clear: both; }\n.cf { *zoom: 1; }\n.cl { clear: left; }\n.cr { clear: right; }\n.cb { clear: both; }\n.cn { clear: none; }\n/*\n\n   DISPLAY\n   Docs: http://tachyons.io/docs/layout/display\n\n   Base:\n    d = display\n\n   Modifiers:\n    n     = none\n    b     = block\n    ib    = inline-block\n    it    = inline-table\n    t     = table\n    tc    = table-cell\n    t-row          = table-row\n    t-columm       = table-column\n    t-column-group = table-column-group\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.dn { display: none; }\n.di { display: inline; }\n.db { display: block; }\n.dib { display: inline-block; }\n.dit { display: inline-table; }\n.dt { display: table; }\n.dtc { display: table-cell; }\n.dt-row { display: table-row; }\n.dt-row-group { display: table-row-group; }\n.dt-column { display: table-column; }\n.dt-column-group { display: table-column-group; }\n/*\n  This will set table to full width and then\n  all cells will be equal width\n*/\n.dt--fixed { table-layout: fixed; width: 100%; }\n/*\n\n  FLEXBOX\n\n  Media Query Extensions:\n   -ns = not-small\n   -m  = medium\n   -l  = large\n\n*/\n.flex { display: -webkit-box; display: -ms-flexbox; display: flex; }\n.inline-flex { display: -webkit-inline-box; display: -ms-inline-flexbox; display: inline-flex; }\n/* 1. Fix for Chrome 44 bug.\n * https://code.google.com/p/chromium/issues/detail?id=506893 */\n.flex-auto { -webkit-box-flex: 1; -ms-flex: 1 1 auto; flex: 1 1 auto; min-width: 0; /* 1 */ min-height: 0; /* 1 */ }\n.flex-none { -webkit-box-flex: 0; -ms-flex: none; flex: none; }\n.flex-column { -webkit-box-orient: vertical; -webkit-box-direction: normal; -ms-flex-direction: column; flex-direction: column; }\n.flex-row { -webkit-box-orient: horizontal; -webkit-box-direction: normal; -ms-flex-direction: row; flex-direction: row; }\n.flex-wrap { -ms-flex-wrap: wrap; flex-wrap: wrap; }\n.flex-nowrap { -ms-flex-wrap: nowrap; flex-wrap: nowrap; }\n.flex-wrap-reverse { -ms-flex-wrap: wrap-reverse; flex-wrap: wrap-reverse; }\n.flex-column-reverse { -webkit-box-orient: vertical; -webkit-box-direction: reverse; -ms-flex-direction: column-reverse; flex-direction: column-reverse; }\n.flex-row-reverse { -webkit-box-orient: horizontal; -webkit-box-direction: reverse; -ms-flex-direction: row-reverse; flex-direction: row-reverse; }\n.items-start { -webkit-box-align: start; -ms-flex-align: start; align-items: flex-start; }\n.items-end { -webkit-box-align: end; -ms-flex-align: end; align-items: flex-end; }\n.items-center { -webkit-box-align: center; -ms-flex-align: center; align-items: center; }\n.items-baseline { -webkit-box-align: baseline; -ms-flex-align: baseline; align-items: baseline; }\n.items-stretch { -webkit-box-align: stretch; -ms-flex-align: stretch; align-items: stretch; }\n.self-start { -ms-flex-item-align: start; align-self: flex-start; }\n.self-end { -ms-flex-item-align: end; align-self: flex-end; }\n.self-center { -ms-flex-item-align: center; -ms-grid-row-align: center; align-self: center; }\n.self-baseline { -ms-flex-item-align: baseline; align-self: baseline; }\n.self-stretch { -ms-flex-item-align: stretch; -ms-grid-row-align: stretch; align-self: stretch; }\n.justify-start { -webkit-box-pack: start; -ms-flex-pack: start; justify-content: flex-start; }\n.justify-end { -webkit-box-pack: end; -ms-flex-pack: end; justify-content: flex-end; }\n.justify-center { -webkit-box-pack: center; -ms-flex-pack: center; justify-content: center; }\n.justify-between { -webkit-box-pack: justify; -ms-flex-pack: justify; justify-content: space-between; }\n.justify-around { -ms-flex-pack: distribute; justify-content: space-around; }\n.content-start { -ms-flex-line-pack: start; align-content: flex-start; }\n.content-end { -ms-flex-line-pack: end; align-content: flex-end; }\n.content-center { -ms-flex-line-pack: center; align-content: center; }\n.content-between { -ms-flex-line-pack: justify; align-content: space-between; }\n.content-around { -ms-flex-line-pack: distribute; align-content: space-around; }\n.content-stretch { -ms-flex-line-pack: stretch; align-content: stretch; }\n.order-0 { -webkit-box-ordinal-group: 1; -ms-flex-order: 0; order: 0; }\n.order-1 { -webkit-box-ordinal-group: 2; -ms-flex-order: 1; order: 1; }\n.order-2 { -webkit-box-ordinal-group: 3; -ms-flex-order: 2; order: 2; }\n.order-3 { -webkit-box-ordinal-group: 4; -ms-flex-order: 3; order: 3; }\n.order-4 { -webkit-box-ordinal-group: 5; -ms-flex-order: 4; order: 4; }\n.order-5 { -webkit-box-ordinal-group: 6; -ms-flex-order: 5; order: 5; }\n.order-6 { -webkit-box-ordinal-group: 7; -ms-flex-order: 6; order: 6; }\n.order-7 { -webkit-box-ordinal-group: 8; -ms-flex-order: 7; order: 7; }\n.order-8 { -webkit-box-ordinal-group: 9; -ms-flex-order: 8; order: 8; }\n.order-last { -webkit-box-ordinal-group: 100000; -ms-flex-order: 99999; order: 99999; }\n.flex-grow-0 { -webkit-box-flex: 0; -ms-flex-positive: 0; flex-grow: 0; }\n.flex-grow-1 { -webkit-box-flex: 1; -ms-flex-positive: 1; flex-grow: 1; }\n.flex-shrink-0 { -ms-flex-negative: 0; flex-shrink: 0; }\n.flex-shrink-1 { -ms-flex-negative: 1; flex-shrink: 1; }\n/*\n\n   FLOATS\n   http://tachyons.io/docs/layout/floats/\n\n   1. Floated elements are automatically rendered as block level elements.\n      Setting floats to display inline will fix the double margin bug in\n      ie6. You know... just in case.\n\n   2. Don't forget to clearfix your floats with .cf\n\n   Base:\n     f = float\n\n   Modifiers:\n     l = left\n     r = right\n     n = none\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.fl { float: left; _display: inline; }\n.fr { float: right; _display: inline; }\n.fn { float: none; }\n/*\n\n   FONT FAMILY GROUPS\n   Docs: http://tachyons.io/docs/typography/font-family/\n\n*/\n.sans-serif { font-family: -apple-system, BlinkMacSystemFont, 'avenir next', avenir, 'helvetica neue', helvetica, ubuntu, roboto, noto, 'segoe ui', arial, sans-serif; }\n.serif { font-family: georgia, times, serif; }\n.system-sans-serif { font-family: sans-serif; }\n.system-serif { font-family: serif; }\n/* Monospaced Typefaces (for code) */\n/* From http://cssfontstack.com */\ncode, .code { font-family: Consolas, monaco, monospace; }\n.courier { font-family: 'Courier Next', courier, monospace; }\n/* Sans-Serif Typefaces */\n.helvetica { font-family: 'helvetica neue', helvetica, sans-serif; }\n.avenir { font-family: 'avenir next', avenir, sans-serif; }\n/* Serif Typefaces */\n.athelas { font-family: athelas, georgia, serif; }\n.georgia { font-family: georgia, serif; }\n.times { font-family: times, serif; }\n.bodoni { font-family: \"Bodoni MT\", serif; }\n.calisto { font-family: \"Calisto MT\", serif; }\n.garamond { font-family: garamond, serif; }\n.baskerville { font-family: baskerville, serif; }\n/*\n\n   FONT STYLE\n   Docs: http://tachyons.io/docs/typography/font-style/\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.i { font-style: italic; }\n.fs-normal { font-style: normal; }\n/*\n\n   FONT WEIGHT\n   Docs: http://tachyons.io/docs/typography/font-weight/\n\n   Base\n     fw = font-weight\n\n   Modifiers:\n     1 = literal value 100\n     2 = literal value 200\n     3 = literal value 300\n     4 = literal value 400\n     5 = literal value 500\n     6 = literal value 600\n     7 = literal value 700\n     8 = literal value 800\n     9 = literal value 900\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.normal { font-weight: normal; }\n.b { font-weight: bold; }\n.fw1 { font-weight: 100; }\n.fw2 { font-weight: 200; }\n.fw3 { font-weight: 300; }\n.fw4 { font-weight: 400; }\n.fw5 { font-weight: 500; }\n.fw6 { font-weight: 600; }\n.fw7 { font-weight: 700; }\n.fw8 { font-weight: 800; }\n.fw9 { font-weight: 900; }\n/*\n\n   FORMS\n   \n*/\n.input-reset { -webkit-appearance: none; -moz-appearance: none; }\n.button-reset::-moz-focus-inner, .input-reset::-moz-focus-inner { border: 0; padding: 0; }\n/*\n\n   HEIGHTS\n   Docs: http://tachyons.io/docs/layout/heights/\n\n   Base:\n     h = height\n     min-h = min-height\n     min-vh = min-height vertical screen height\n     vh = vertical screen height\n\n   Modifiers\n     1 = 1st step in height scale\n     2 = 2nd step in height scale\n     3 = 3rd step in height scale\n     4 = 4th step in height scale\n     5 = 5th step in height scale\n\n     -25   = literal value 25%\n     -50   = literal value 50%\n     -75   = literal value 75%\n     -100  = literal value 100%\n\n     -auto = string value of auto\n     -inherit = string value of inherit\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/* Height Scale */\n.h1 { height: 1rem; }\n.h2 { height: 2rem; }\n.h3 { height: 4rem; }\n.h4 { height: 8rem; }\n.h5 { height: 16rem; }\n/* Height Percentages - Based off of height of parent */\n.h-25 { height: 25%; }\n.h-50 { height: 50%; }\n.h-75 { height: 75%; }\n.h-100 { height: 100%; }\n.min-h-100 { min-height: 100%; }\n/* Screen Height Percentage */\n.vh-25 { height: 25vh; }\n.vh-50 { height: 50vh; }\n.vh-75 { height: 75vh; }\n.vh-100 { height: 100vh; }\n.min-vh-100 { min-height: 100vh; }\n/* String Properties */\n.h-auto { height: auto; }\n.h-inherit { height: inherit; }\n/*\n\n   LETTER SPACING\n   Docs: http://tachyons.io/docs/typography/tracking/\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.tracked { letter-spacing: .1em; }\n.tracked-tight { letter-spacing: -.05em; }\n.tracked-mega { letter-spacing: .25em; }\n/*\n\n   LINE HEIGHT / LEADING\n   Docs: http://tachyons.io/docs/typography/line-height\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.lh-solid { line-height: 1; }\n.lh-title { line-height: 1.25; }\n.lh-copy { line-height: 1.5; }\n/*\n\n   LINKS\n   Docs: http://tachyons.io/docs/elements/links/\n\n*/\n.link { text-decoration: none; transition: color .15s ease-in; }\n.link:link, .link:visited { transition: color .15s ease-in; }\n.link:hover { transition: color .15s ease-in; }\n.link:active { transition: color .15s ease-in; }\n.link:focus { transition: color .15s ease-in; outline: 1px dotted currentColor; }\n/*\n\n   LISTS\n   http://tachyons.io/docs/elements/lists/\n\n*/\n.list { list-style-type: none; }\n/*\n\n   MAX WIDTHS\n   Docs: http://tachyons.io/docs/layout/max-widths/\n\n   Base:\n     mw = max-width\n\n   Modifiers\n     1 = 1st step in width scale\n     2 = 2nd step in width scale\n     3 = 3rd step in width scale\n     4 = 4th step in width scale\n     5 = 5th step in width scale\n     6 = 6st step in width scale\n     7 = 7nd step in width scale\n     8 = 8rd step in width scale\n     9 = 9th step in width scale\n\n     -100 = literal value 100%\n\n     -none  = string value none\n\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/* Max Width Percentages */\n.mw-100 { max-width: 100%; }\n/* Max Width Scale */\n.mw1 { max-width: 1rem; }\n.mw2 { max-width: 2rem; }\n.mw3 { max-width: 4rem; }\n.mw4 { max-width: 8rem; }\n.mw5 { max-width: 16rem; }\n.mw6 { max-width: 32rem; }\n.mw7 { max-width: 48rem; }\n.mw8 { max-width: 64rem; }\n.mw9 { max-width: 96rem; }\n/* Max Width String Properties */\n.mw-none { max-width: none; }\n/*\n\n   WIDTHS\n   Docs: http://tachyons.io/docs/layout/widths/\n\n   Base:\n     w = width\n\n   Modifiers\n     1 = 1st step in width scale\n     2 = 2nd step in width scale\n     3 = 3rd step in width scale\n     4 = 4th step in width scale\n     5 = 5th step in width scale\n\n     -10  = literal value 10%\n     -20  = literal value 20%\n     -25  = literal value 25%\n     -30  = literal value 30%\n     -33  = literal value 33%\n     -34  = literal value 34%\n     -40  = literal value 40%\n     -50  = literal value 50%\n     -60  = literal value 60%\n     -70  = literal value 70%\n     -75  = literal value 75%\n     -80  = literal value 80%\n     -90  = literal value 90%\n     -100 = literal value 100%\n\n     -third      = 100% / 3 (Not supported in opera mini or IE8)\n     -two-thirds = 100% / 1.5 (Not supported in opera mini or IE8)\n     -auto       = string value auto\n\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/* Width Scale */\n.w1 { width: 1rem; }\n.w2 { width: 2rem; }\n.w3 { width: 4rem; }\n.w4 { width: 8rem; }\n.w5 { width: 16rem; }\n.w-10 { width: 10%; }\n.w-20 { width: 20%; }\n.w-25 { width: 25%; }\n.w-30 { width: 30%; }\n.w-33 { width: 33%; }\n.w-34 { width: 34%; }\n.w-40 { width: 40%; }\n.w-50 { width: 50%; }\n.w-60 { width: 60%; }\n.w-70 { width: 70%; }\n.w-75 { width: 75%; }\n.w-80 { width: 80%; }\n.w-90 { width: 90%; }\n.w-100 { width: 100%; }\n.w-third { width: calc( 100% / 3 ); }\n.w-two-thirds { width: calc( 100% / 1.5 ); }\n.w-auto { width: auto; }\n/*\n\n    OVERFLOW\n\n    Media Query Extensions:\n      -ns = not-small\n      -m  = medium\n      -l  = large\n\n */\n.overflow-visible { overflow: visible; }\n.overflow-hidden { overflow: hidden; }\n.overflow-scroll { overflow: scroll; }\n.overflow-auto { overflow: auto; }\n.overflow-x-visible { overflow-x: visible; }\n.overflow-x-hidden { overflow-x: hidden; }\n.overflow-x-scroll { overflow-x: scroll; }\n.overflow-x-auto { overflow-x: auto; }\n.overflow-y-visible { overflow-y: visible; }\n.overflow-y-hidden { overflow-y: hidden; }\n.overflow-y-scroll { overflow-y: scroll; }\n.overflow-y-auto { overflow-y: auto; }\n/*\n\n   POSITIONING\n   Docs: http://tachyons.io/docs/layout/position/\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.static { position: static; }\n.relative { position: relative; }\n.absolute { position: absolute; }\n.fixed { position: fixed; }\n/*\n\n    OPACITY\n    Docs: http://tachyons.io/docs/themes/opacity/\n\n*/\n.o-100 { opacity: 1; }\n.o-90 { opacity: .9; }\n.o-80 { opacity: .8; }\n.o-70 { opacity: .7; }\n.o-60 { opacity: .6; }\n.o-50 { opacity: .5; }\n.o-40 { opacity: .4; }\n.o-30 { opacity: .3; }\n.o-20 { opacity: .2; }\n.o-10 { opacity: .1; }\n.o-05 { opacity: .05; }\n.o-025 { opacity: .025; }\n.o-0 { opacity: 0; }\n/*\n\n   ROTATIONS\n\n*/\n.rotate-45 { -webkit-transform: rotate( 45deg ); transform: rotate( 45deg ); }\n.rotate-90 { -webkit-transform: rotate( 90deg ); transform: rotate( 90deg ); }\n.rotate-135 { -webkit-transform: rotate( 135deg ); transform: rotate( 135deg ); }\n.rotate-180 { -webkit-transform: rotate( 180deg ); transform: rotate( 180deg ); }\n.rotate-225 { -webkit-transform: rotate( 225deg ); transform: rotate( 225deg ); }\n.rotate-270 { -webkit-transform: rotate( 270deg ); transform: rotate( 270deg ); }\n.rotate-315 { -webkit-transform: rotate( 315deg ); transform: rotate( 315deg ); }\n/*\n\n   SKINS\n   Docs: http://tachyons.io/docs/themes/skins/\n\n   Classes for setting foreground and background colors on elements.\n   If you haven't declared a border color, but set border on an element, it will \n   be set to the current text color. \n\n*/\n/* Text colors */\n.black-90 { color: rgba( 0, 0, 0, .9 ); }\n.black-80 { color: rgba( 0, 0, 0, .8 ); }\n.black-70 { color: rgba( 0, 0, 0, .7 ); }\n.black-60 { color: rgba( 0, 0, 0, .6 ); }\n.black-50 { color: rgba( 0, 0, 0, .5 ); }\n.black-40 { color: rgba( 0, 0, 0, .4 ); }\n.black-30 { color: rgba( 0, 0, 0, .3 ); }\n.black-20 { color: rgba( 0, 0, 0, .2 ); }\n.black-10 { color: rgba( 0, 0, 0, .1 ); }\n.black-05 { color: rgba( 0, 0, 0, .05 ); }\n.white-90 { color: rgba( 255, 255, 255, .9 ); }\n.white-80 { color: rgba( 255, 255, 255, .8 ); }\n.white-70 { color: rgba( 255, 255, 255, .7 ); }\n.white-60 { color: rgba( 255, 255, 255, .6 ); }\n.white-50 { color: rgba( 255, 255, 255, .5 ); }\n.white-40 { color: rgba( 255, 255, 255, .4 ); }\n.white-30 { color: rgba( 255, 255, 255, .3 ); }\n.white-20 { color: rgba( 255, 255, 255, .2 ); }\n.white-10 { color: rgba( 255, 255, 255, .1 ); }\n.black { color: #000; }\n.near-black { color: #111; }\n.dark-gray { color: #333; }\n.mid-gray { color: #555; }\n.gray { color: #777; }\n.silver { color: #999; }\n.light-silver { color: #aaa; }\n.moon-gray { color: #ccc; }\n.light-gray { color: #eee; }\n.near-white { color: #f4f4f4; }\n.white { color: #fff; }\n.dark-red { color: #e7040f; }\n.red { color: #ff4136; }\n.light-red { color: #ff725c; }\n.orange { color: #ff6300; }\n.gold { color: #ffb700; }\n.yellow { color: #ffd700; }\n.light-yellow { color: #fbf1a9; }\n.purple { color: #5e2ca5; }\n.light-purple { color: #a463f2; }\n.dark-pink { color: #d5008f; }\n.hot-pink { color: #ff41b4; }\n.pink { color: #ff80cc; }\n.light-pink { color: #ffa3d7; }\n.dark-green { color: #137752; }\n.green { color: #19a974; }\n.light-green { color: #9eebcf; }\n.navy { color: #001b44; }\n.dark-blue { color: #00449e; }\n.blue { color: #357edd; }\n.light-blue { color: #96ccff; }\n.lightest-blue { color: #cdecff; }\n.washed-blue { color: #f6fffe; }\n.washed-green { color: #e8fdf5; }\n.washed-yellow { color: #fffceb; }\n.washed-red { color: #ffdfdf; }\n.color-inherit { color: inherit; }\n.bg-black-90 { background-color: rgba( 0, 0, 0, .9 ); }\n.bg-black-80 { background-color: rgba( 0, 0, 0, .8 ); }\n.bg-black-70 { background-color: rgba( 0, 0, 0, .7 ); }\n.bg-black-60 { background-color: rgba( 0, 0, 0, .6 ); }\n.bg-black-50 { background-color: rgba( 0, 0, 0, .5 ); }\n.bg-black-40 { background-color: rgba( 0, 0, 0, .4 ); }\n.bg-black-30 { background-color: rgba( 0, 0, 0, .3 ); }\n.bg-black-20 { background-color: rgba( 0, 0, 0, .2 ); }\n.bg-black-10 { background-color: rgba( 0, 0, 0, .1 ); }\n.bg-black-05 { background-color: rgba( 0, 0, 0, .05 ); }\n.bg-white-90 { background-color: rgba( 255, 255, 255, .9 ); }\n.bg-white-80 { background-color: rgba( 255, 255, 255, .8 ); }\n.bg-white-70 { background-color: rgba( 255, 255, 255, .7 ); }\n.bg-white-60 { background-color: rgba( 255, 255, 255, .6 ); }\n.bg-white-50 { background-color: rgba( 255, 255, 255, .5 ); }\n.bg-white-40 { background-color: rgba( 255, 255, 255, .4 ); }\n.bg-white-30 { background-color: rgba( 255, 255, 255, .3 ); }\n.bg-white-20 { background-color: rgba( 255, 255, 255, .2 ); }\n.bg-white-10 { background-color: rgba( 255, 255, 255, .1 ); }\n/* Background colors */\n.bg-black { background-color: #000; }\n.bg-near-black { background-color: #111; }\n.bg-dark-gray { background-color: #333; }\n.bg-mid-gray { background-color: #555; }\n.bg-gray { background-color: #777; }\n.bg-silver { background-color: #999; }\n.bg-light-silver { background-color: #aaa; }\n.bg-moon-gray { background-color: #ccc; }\n.bg-light-gray { background-color: #eee; }\n.bg-near-white { background-color: #f4f4f4; }\n.bg-white { background-color: #fff; }\n.bg-transparent { background-color: transparent; }\n.bg-dark-red { background-color: #e7040f; }\n.bg-red { background-color: #ff4136; }\n.bg-light-red { background-color: #ff725c; }\n.bg-orange { background-color: #ff6300; }\n.bg-gold { background-color: #ffb700; }\n.bg-yellow { background-color: #ffd700; }\n.bg-light-yellow { background-color: #fbf1a9; }\n.bg-purple { background-color: #5e2ca5; }\n.bg-light-purple { background-color: #a463f2; }\n.bg-dark-pink { background-color: #d5008f; }\n.bg-hot-pink { background-color: #ff41b4; }\n.bg-pink { background-color: #ff80cc; }\n.bg-light-pink { background-color: #ffa3d7; }\n.bg-dark-green { background-color: #137752; }\n.bg-green { background-color: #19a974; }\n.bg-light-green { background-color: #9eebcf; }\n.bg-navy { background-color: #001b44; }\n.bg-dark-blue { background-color: #00449e; }\n.bg-blue { background-color: #357edd; }\n.bg-light-blue { background-color: #96ccff; }\n.bg-lightest-blue { background-color: #cdecff; }\n.bg-washed-blue { background-color: #f6fffe; }\n.bg-washed-green { background-color: #e8fdf5; }\n.bg-washed-yellow { background-color: #fffceb; }\n.bg-washed-red { background-color: #ffdfdf; }\n.bg-inherit { background-color: inherit; }\n/* \n  \n   SKINS:PSEUDO\n\n   Customize the color of an element when\n   it is focused or hovered over.\n \n */\n.hover-black:hover { color: #000; }\n.hover-black:focus { color: #000; }\n.hover-near-black:hover { color: #111; }\n.hover-near-black:focus { color: #111; }\n.hover-dark-gray:hover { color: #333; }\n.hover-dark-gray:focus { color: #333; }\n.hover-mid-gray:hover { color: #555; }\n.hover-mid-gray:focus { color: #555; }\n.hover-gray:hover { color: #777; }\n.hover-gray:focus { color: #777; }\n.hover-silver:hover { color: #999; }\n.hover-silver:focus { color: #999; }\n.hover-light-silver:hover { color: #aaa; }\n.hover-light-silver:focus { color: #aaa; }\n.hover-moon-gray:hover { color: #ccc; }\n.hover-moon-gray:focus { color: #ccc; }\n.hover-light-gray:hover { color: #eee; }\n.hover-light-gray:focus { color: #eee; }\n.hover-near-white:hover { color: #f4f4f4; }\n.hover-near-white:focus { color: #f4f4f4; }\n.hover-white:hover { color: #fff; }\n.hover-white:focus { color: #fff; }\n.hover-black-90:hover { color: rgba( 0, 0, 0, .9 ); }\n.hover-black-90:focus { color: rgba( 0, 0, 0, .9 ); }\n.hover-black-80:hover { color: rgba( 0, 0, 0, .8 ); }\n.hover-black-80:focus { color: rgba( 0, 0, 0, .8 ); }\n.hover-black-70:hover { color: rgba( 0, 0, 0, .7 ); }\n.hover-black-70:focus { color: rgba( 0, 0, 0, .7 ); }\n.hover-black-60:hover { color: rgba( 0, 0, 0, .6 ); }\n.hover-black-60:focus { color: rgba( 0, 0, 0, .6 ); }\n.hover-black-50:hover { color: rgba( 0, 0, 0, .5 ); }\n.hover-black-50:focus { color: rgba( 0, 0, 0, .5 ); }\n.hover-black-40:hover { color: rgba( 0, 0, 0, .4 ); }\n.hover-black-40:focus { color: rgba( 0, 0, 0, .4 ); }\n.hover-black-30:hover { color: rgba( 0, 0, 0, .3 ); }\n.hover-black-30:focus { color: rgba( 0, 0, 0, .3 ); }\n.hover-black-20:hover { color: rgba( 0, 0, 0, .2 ); }\n.hover-black-20:focus { color: rgba( 0, 0, 0, .2 ); }\n.hover-black-10:hover { color: rgba( 0, 0, 0, .1 ); }\n.hover-black-10:focus { color: rgba( 0, 0, 0, .1 ); }\n.hover-white-90:hover { color: rgba( 255, 255, 255, .9 ); }\n.hover-white-90:focus { color: rgba( 255, 255, 255, .9 ); }\n.hover-white-80:hover { color: rgba( 255, 255, 255, .8 ); }\n.hover-white-80:focus { color: rgba( 255, 255, 255, .8 ); }\n.hover-white-70:hover { color: rgba( 255, 255, 255, .7 ); }\n.hover-white-70:focus { color: rgba( 255, 255, 255, .7 ); }\n.hover-white-60:hover { color: rgba( 255, 255, 255, .6 ); }\n.hover-white-60:focus { color: rgba( 255, 255, 255, .6 ); }\n.hover-white-50:hover { color: rgba( 255, 255, 255, .5 ); }\n.hover-white-50:focus { color: rgba( 255, 255, 255, .5 ); }\n.hover-white-40:hover { color: rgba( 255, 255, 255, .4 ); }\n.hover-white-40:focus { color: rgba( 255, 255, 255, .4 ); }\n.hover-white-30:hover { color: rgba( 255, 255, 255, .3 ); }\n.hover-white-30:focus { color: rgba( 255, 255, 255, .3 ); }\n.hover-white-20:hover { color: rgba( 255, 255, 255, .2 ); }\n.hover-white-20:focus { color: rgba( 255, 255, 255, .2 ); }\n.hover-white-10:hover { color: rgba( 255, 255, 255, .1 ); }\n.hover-white-10:focus { color: rgba( 255, 255, 255, .1 ); }\n.hover-inherit:hover, .hover-inherit:focus { color: inherit; }\n.hover-bg-black:hover { background-color: #000; }\n.hover-bg-black:focus { background-color: #000; }\n.hover-bg-near-black:hover { background-color: #111; }\n.hover-bg-near-black:focus { background-color: #111; }\n.hover-bg-dark-gray:hover { background-color: #333; }\n.hover-bg-dark-gray:focus { background-color: #333; }\n.hover-bg-mid-gray:hover { background-color: #555; }\n.hover-bg-mid-gray:focus { background-color: #555; }\n.hover-bg-gray:hover { background-color: #777; }\n.hover-bg-gray:focus { background-color: #777; }\n.hover-bg-silver:hover { background-color: #999; }\n.hover-bg-silver:focus { background-color: #999; }\n.hover-bg-light-silver:hover { background-color: #aaa; }\n.hover-bg-light-silver:focus { background-color: #aaa; }\n.hover-bg-moon-gray:hover { background-color: #ccc; }\n.hover-bg-moon-gray:focus { background-color: #ccc; }\n.hover-bg-light-gray:hover { background-color: #eee; }\n.hover-bg-light-gray:focus { background-color: #eee; }\n.hover-bg-near-white:hover { background-color: #f4f4f4; }\n.hover-bg-near-white:focus { background-color: #f4f4f4; }\n.hover-bg-white:hover { background-color: #fff; }\n.hover-bg-white:focus { background-color: #fff; }\n.hover-bg-transparent:hover { background-color: transparent; }\n.hover-bg-transparent:focus { background-color: transparent; }\n.hover-bg-black-90:hover { background-color: rgba( 0, 0, 0, .9 ); }\n.hover-bg-black-90:focus { background-color: rgba( 0, 0, 0, .9 ); }\n.hover-bg-black-80:hover { background-color: rgba( 0, 0, 0, .8 ); }\n.hover-bg-black-80:focus { background-color: rgba( 0, 0, 0, .8 ); }\n.hover-bg-black-70:hover { background-color: rgba( 0, 0, 0, .7 ); }\n.hover-bg-black-70:focus { background-color: rgba( 0, 0, 0, .7 ); }\n.hover-bg-black-60:hover { background-color: rgba( 0, 0, 0, .6 ); }\n.hover-bg-black-60:focus { background-color: rgba( 0, 0, 0, .6 ); }\n.hover-bg-black-50:hover { background-color: rgba( 0, 0, 0, .5 ); }\n.hover-bg-black-50:focus { background-color: rgba( 0, 0, 0, .5 ); }\n.hover-bg-black-40:hover { background-color: rgba( 0, 0, 0, .4 ); }\n.hover-bg-black-40:focus { background-color: rgba( 0, 0, 0, .4 ); }\n.hover-bg-black-30:hover { background-color: rgba( 0, 0, 0, .3 ); }\n.hover-bg-black-30:focus { background-color: rgba( 0, 0, 0, .3 ); }\n.hover-bg-black-20:hover { background-color: rgba( 0, 0, 0, .2 ); }\n.hover-bg-black-20:focus { background-color: rgba( 0, 0, 0, .2 ); }\n.hover-bg-black-10:hover { background-color: rgba( 0, 0, 0, .1 ); }\n.hover-bg-black-10:focus { background-color: rgba( 0, 0, 0, .1 ); }\n.hover-bg-white-90:hover { background-color: rgba( 255, 255, 255, .9 ); }\n.hover-bg-white-90:focus { background-color: rgba( 255, 255, 255, .9 ); }\n.hover-bg-white-80:hover { background-color: rgba( 255, 255, 255, .8 ); }\n.hover-bg-white-80:focus { background-color: rgba( 255, 255, 255, .8 ); }\n.hover-bg-white-70:hover { background-color: rgba( 255, 255, 255, .7 ); }\n.hover-bg-white-70:focus { background-color: rgba( 255, 255, 255, .7 ); }\n.hover-bg-white-60:hover { background-color: rgba( 255, 255, 255, .6 ); }\n.hover-bg-white-60:focus { background-color: rgba( 255, 255, 255, .6 ); }\n.hover-bg-white-50:hover { background-color: rgba( 255, 255, 255, .5 ); }\n.hover-bg-white-50:focus { background-color: rgba( 255, 255, 255, .5 ); }\n.hover-bg-white-40:hover { background-color: rgba( 255, 255, 255, .4 ); }\n.hover-bg-white-40:focus { background-color: rgba( 255, 255, 255, .4 ); }\n.hover-bg-white-30:hover { background-color: rgba( 255, 255, 255, .3 ); }\n.hover-bg-white-30:focus { background-color: rgba( 255, 255, 255, .3 ); }\n.hover-bg-white-20:hover { background-color: rgba( 255, 255, 255, .2 ); }\n.hover-bg-white-20:focus { background-color: rgba( 255, 255, 255, .2 ); }\n.hover-bg-white-10:hover { background-color: rgba( 255, 255, 255, .1 ); }\n.hover-bg-white-10:focus { background-color: rgba( 255, 255, 255, .1 ); }\n.hover-dark-red:hover { color: #e7040f; }\n.hover-dark-red:focus { color: #e7040f; }\n.hover-red:hover { color: #ff4136; }\n.hover-red:focus { color: #ff4136; }\n.hover-light-red:hover { color: #ff725c; }\n.hover-light-red:focus { color: #ff725c; }\n.hover-orange:hover { color: #ff6300; }\n.hover-orange:focus { color: #ff6300; }\n.hover-gold:hover { color: #ffb700; }\n.hover-gold:focus { color: #ffb700; }\n.hover-yellow:hover { color: #ffd700; }\n.hover-yellow:focus { color: #ffd700; }\n.hover-light-yellow:hover { color: #fbf1a9; }\n.hover-light-yellow:focus { color: #fbf1a9; }\n.hover-purple:hover { color: #5e2ca5; }\n.hover-purple:focus { color: #5e2ca5; }\n.hover-light-purple:hover { color: #a463f2; }\n.hover-light-purple:focus { color: #a463f2; }\n.hover-dark-pink:hover { color: #d5008f; }\n.hover-dark-pink:focus { color: #d5008f; }\n.hover-hot-pink:hover { color: #ff41b4; }\n.hover-hot-pink:focus { color: #ff41b4; }\n.hover-pink:hover { color: #ff80cc; }\n.hover-pink:focus { color: #ff80cc; }\n.hover-light-pink:hover { color: #ffa3d7; }\n.hover-light-pink:focus { color: #ffa3d7; }\n.hover-dark-green:hover { color: #137752; }\n.hover-dark-green:focus { color: #137752; }\n.hover-green:hover { color: #19a974; }\n.hover-green:focus { color: #19a974; }\n.hover-light-green:hover { color: #9eebcf; }\n.hover-light-green:focus { color: #9eebcf; }\n.hover-navy:hover { color: #001b44; }\n.hover-navy:focus { color: #001b44; }\n.hover-dark-blue:hover { color: #00449e; }\n.hover-dark-blue:focus { color: #00449e; }\n.hover-blue:hover { color: #357edd; }\n.hover-blue:focus { color: #357edd; }\n.hover-light-blue:hover { color: #96ccff; }\n.hover-light-blue:focus { color: #96ccff; }\n.hover-lightest-blue:hover { color: #cdecff; }\n.hover-lightest-blue:focus { color: #cdecff; }\n.hover-washed-blue:hover { color: #f6fffe; }\n.hover-washed-blue:focus { color: #f6fffe; }\n.hover-washed-green:hover { color: #e8fdf5; }\n.hover-washed-green:focus { color: #e8fdf5; }\n.hover-washed-yellow:hover { color: #fffceb; }\n.hover-washed-yellow:focus { color: #fffceb; }\n.hover-washed-red:hover { color: #ffdfdf; }\n.hover-washed-red:focus { color: #ffdfdf; }\n.hover-bg-dark-red:hover { background-color: #e7040f; }\n.hover-bg-dark-red:focus { background-color: #e7040f; }\n.hover-bg-red:hover { background-color: #ff4136; }\n.hover-bg-red:focus { background-color: #ff4136; }\n.hover-bg-light-red:hover { background-color: #ff725c; }\n.hover-bg-light-red:focus { background-color: #ff725c; }\n.hover-bg-orange:hover { background-color: #ff6300; }\n.hover-bg-orange:focus { background-color: #ff6300; }\n.hover-bg-gold:hover { background-color: #ffb700; }\n.hover-bg-gold:focus { background-color: #ffb700; }\n.hover-bg-yellow:hover { background-color: #ffd700; }\n.hover-bg-yellow:focus { background-color: #ffd700; }\n.hover-bg-light-yellow:hover { background-color: #fbf1a9; }\n.hover-bg-light-yellow:focus { background-color: #fbf1a9; }\n.hover-bg-purple:hover { background-color: #5e2ca5; }\n.hover-bg-purple:focus { background-color: #5e2ca5; }\n.hover-bg-light-purple:hover { background-color: #a463f2; }\n.hover-bg-light-purple:focus { background-color: #a463f2; }\n.hover-bg-dark-pink:hover { background-color: #d5008f; }\n.hover-bg-dark-pink:focus { background-color: #d5008f; }\n.hover-bg-hot-pink:hover { background-color: #ff41b4; }\n.hover-bg-hot-pink:focus { background-color: #ff41b4; }\n.hover-bg-pink:hover { background-color: #ff80cc; }\n.hover-bg-pink:focus { background-color: #ff80cc; }\n.hover-bg-light-pink:hover { background-color: #ffa3d7; }\n.hover-bg-light-pink:focus { background-color: #ffa3d7; }\n.hover-bg-dark-green:hover { background-color: #137752; }\n.hover-bg-dark-green:focus { background-color: #137752; }\n.hover-bg-green:hover { background-color: #19a974; }\n.hover-bg-green:focus { background-color: #19a974; }\n.hover-bg-light-green:hover { background-color: #9eebcf; }\n.hover-bg-light-green:focus { background-color: #9eebcf; }\n.hover-bg-navy:hover { background-color: #001b44; }\n.hover-bg-navy:focus { background-color: #001b44; }\n.hover-bg-dark-blue:hover { background-color: #00449e; }\n.hover-bg-dark-blue:focus { background-color: #00449e; }\n.hover-bg-blue:hover { background-color: #357edd; }\n.hover-bg-blue:focus { background-color: #357edd; }\n.hover-bg-light-blue:hover { background-color: #96ccff; }\n.hover-bg-light-blue:focus { background-color: #96ccff; }\n.hover-bg-lightest-blue:hover { background-color: #cdecff; }\n.hover-bg-lightest-blue:focus { background-color: #cdecff; }\n.hover-bg-washed-blue:hover { background-color: #f6fffe; }\n.hover-bg-washed-blue:focus { background-color: #f6fffe; }\n.hover-bg-washed-green:hover { background-color: #e8fdf5; }\n.hover-bg-washed-green:focus { background-color: #e8fdf5; }\n.hover-bg-washed-yellow:hover { background-color: #fffceb; }\n.hover-bg-washed-yellow:focus { background-color: #fffceb; }\n.hover-bg-washed-red:hover { background-color: #ffdfdf; }\n.hover-bg-washed-red:focus { background-color: #ffdfdf; }\n.hover-bg-inherit:hover, .hover-bg-inherit:focus { background-color: inherit; }\n/* Variables */\n/*\n   SPACING\n   Docs: http://tachyons.io/docs/layout/spacing/\n\n   An eight step powers of two scale ranging from 0 to 16rem.\n\n   Base:\n     p = padding\n     m = margin\n\n   Modifiers:\n     a = all\n     h = horizontal\n     v = vertical\n     t = top\n     r = right\n     b = bottom\n     l = left\n\n     0 = none\n     1 = 1st step in spacing scale\n     2 = 2nd step in spacing scale\n     3 = 3rd step in spacing scale\n     4 = 4th step in spacing scale\n     5 = 5th step in spacing scale\n     6 = 6th step in spacing scale\n     7 = 7th step in spacing scale\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.pa0 { padding: 0; }\n.pa1 { padding: .25rem; }\n.pa2 { padding: .5rem; }\n.pa3 { padding: 1rem; }\n.pa4 { padding: 2rem; }\n.pa5 { padding: 4rem; }\n.pa6 { padding: 8rem; }\n.pa7 { padding: 16rem; }\n.pl0 { padding-left: 0; }\n.pl1 { padding-left: .25rem; }\n.pl2 { padding-left: .5rem; }\n.pl3 { padding-left: 1rem; }\n.pl4 { padding-left: 2rem; }\n.pl5 { padding-left: 4rem; }\n.pl6 { padding-left: 8rem; }\n.pl7 { padding-left: 16rem; }\n.pr0 { padding-right: 0; }\n.pr1 { padding-right: .25rem; }\n.pr2 { padding-right: .5rem; }\n.pr3 { padding-right: 1rem; }\n.pr4 { padding-right: 2rem; }\n.pr5 { padding-right: 4rem; }\n.pr6 { padding-right: 8rem; }\n.pr7 { padding-right: 16rem; }\n.pb0 { padding-bottom: 0; }\n.pb1 { padding-bottom: .25rem; }\n.pb2 { padding-bottom: .5rem; }\n.pb3 { padding-bottom: 1rem; }\n.pb4 { padding-bottom: 2rem; }\n.pb5 { padding-bottom: 4rem; }\n.pb6 { padding-bottom: 8rem; }\n.pb7 { padding-bottom: 16rem; }\n.pt0 { padding-top: 0; }\n.pt1 { padding-top: .25rem; }\n.pt2 { padding-top: .5rem; }\n.pt3 { padding-top: 1rem; }\n.pt4 { padding-top: 2rem; }\n.pt5 { padding-top: 4rem; }\n.pt6 { padding-top: 8rem; }\n.pt7 { padding-top: 16rem; }\n.pv0 { padding-top: 0; padding-bottom: 0; }\n.pv1 { padding-top: .25rem; padding-bottom: .25rem; }\n.pv2 { padding-top: .5rem; padding-bottom: .5rem; }\n.pv3 { padding-top: 1rem; padding-bottom: 1rem; }\n.pv4 { padding-top: 2rem; padding-bottom: 2rem; }\n.pv5 { padding-top: 4rem; padding-bottom: 4rem; }\n.pv6 { padding-top: 8rem; padding-bottom: 8rem; }\n.pv7 { padding-top: 16rem; padding-bottom: 16rem; }\n.ph0 { padding-left: 0; padding-right: 0; }\n.ph1 { padding-left: .25rem; padding-right: .25rem; }\n.ph2 { padding-left: .5rem; padding-right: .5rem; }\n.ph3 { padding-left: 1rem; padding-right: 1rem; }\n.ph4 { padding-left: 2rem; padding-right: 2rem; }\n.ph5 { padding-left: 4rem; padding-right: 4rem; }\n.ph6 { padding-left: 8rem; padding-right: 8rem; }\n.ph7 { padding-left: 16rem; padding-right: 16rem; }\n.ma0 { margin: 0; }\n.ma1 { margin: .25rem; }\n.ma2 { margin: .5rem; }\n.ma3 { margin: 1rem; }\n.ma4 { margin: 2rem; }\n.ma5 { margin: 4rem; }\n.ma6 { margin: 8rem; }\n.ma7 { margin: 16rem; }\n.ml0 { margin-left: 0; }\n.ml1 { margin-left: .25rem; }\n.ml2 { margin-left: .5rem; }\n.ml3 { margin-left: 1rem; }\n.ml4 { margin-left: 2rem; }\n.ml5 { margin-left: 4rem; }\n.ml6 { margin-left: 8rem; }\n.ml7 { margin-left: 16rem; }\n.mr0 { margin-right: 0; }\n.mr1 { margin-right: .25rem; }\n.mr2 { margin-right: .5rem; }\n.mr3 { margin-right: 1rem; }\n.mr4 { margin-right: 2rem; }\n.mr5 { margin-right: 4rem; }\n.mr6 { margin-right: 8rem; }\n.mr7 { margin-right: 16rem; }\n.mb0 { margin-bottom: 0; }\n.mb1 { margin-bottom: .25rem; }\n.mb2 { margin-bottom: .5rem; }\n.mb3 { margin-bottom: 1rem; }\n.mb4 { margin-bottom: 2rem; }\n.mb5 { margin-bottom: 4rem; }\n.mb6 { margin-bottom: 8rem; }\n.mb7 { margin-bottom: 16rem; }\n.mt0 { margin-top: 0; }\n.mt1 { margin-top: .25rem; }\n.mt2 { margin-top: .5rem; }\n.mt3 { margin-top: 1rem; }\n.mt4 { margin-top: 2rem; }\n.mt5 { margin-top: 4rem; }\n.mt6 { margin-top: 8rem; }\n.mt7 { margin-top: 16rem; }\n.mv0 { margin-top: 0; margin-bottom: 0; }\n.mv1 { margin-top: .25rem; margin-bottom: .25rem; }\n.mv2 { margin-top: .5rem; margin-bottom: .5rem; }\n.mv3 { margin-top: 1rem; margin-bottom: 1rem; }\n.mv4 { margin-top: 2rem; margin-bottom: 2rem; }\n.mv5 { margin-top: 4rem; margin-bottom: 4rem; }\n.mv6 { margin-top: 8rem; margin-bottom: 8rem; }\n.mv7 { margin-top: 16rem; margin-bottom: 16rem; }\n.mh0 { margin-left: 0; margin-right: 0; }\n.mh1 { margin-left: .25rem; margin-right: .25rem; }\n.mh2 { margin-left: .5rem; margin-right: .5rem; }\n.mh3 { margin-left: 1rem; margin-right: 1rem; }\n.mh4 { margin-left: 2rem; margin-right: 2rem; }\n.mh5 { margin-left: 4rem; margin-right: 4rem; }\n.mh6 { margin-left: 8rem; margin-right: 8rem; }\n.mh7 { margin-left: 16rem; margin-right: 16rem; }\n/*\n   NEGATIVE MARGINS\n\n   Base:\n     n = negative\n\n   Modifiers:\n     a = all\n     t = top\n     r = right\n     b = bottom\n     l = left\n\n     1 = 1st step in spacing scale\n     2 = 2nd step in spacing scale\n     3 = 3rd step in spacing scale\n     4 = 4th step in spacing scale\n     5 = 5th step in spacing scale\n     6 = 6th step in spacing scale\n     7 = 7th step in spacing scale\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.na1 { margin: -.25rem; }\n.na2 { margin: -.5rem; }\n.na3 { margin: -1rem; }\n.na4 { margin: -2rem; }\n.na5 { margin: -4rem; }\n.na6 { margin: -8rem; }\n.na7 { margin: -16rem; }\n.nl1 { margin-left: -.25rem; }\n.nl2 { margin-left: -.5rem; }\n.nl3 { margin-left: -1rem; }\n.nl4 { margin-left: -2rem; }\n.nl5 { margin-left: -4rem; }\n.nl6 { margin-left: -8rem; }\n.nl7 { margin-left: -16rem; }\n.nr1 { margin-right: -.25rem; }\n.nr2 { margin-right: -.5rem; }\n.nr3 { margin-right: -1rem; }\n.nr4 { margin-right: -2rem; }\n.nr5 { margin-right: -4rem; }\n.nr6 { margin-right: -8rem; }\n.nr7 { margin-right: -16rem; }\n.nb1 { margin-bottom: -.25rem; }\n.nb2 { margin-bottom: -.5rem; }\n.nb3 { margin-bottom: -1rem; }\n.nb4 { margin-bottom: -2rem; }\n.nb5 { margin-bottom: -4rem; }\n.nb6 { margin-bottom: -8rem; }\n.nb7 { margin-bottom: -16rem; }\n.nt1 { margin-top: -.25rem; }\n.nt2 { margin-top: -.5rem; }\n.nt3 { margin-top: -1rem; }\n.nt4 { margin-top: -2rem; }\n.nt5 { margin-top: -4rem; }\n.nt6 { margin-top: -8rem; }\n.nt7 { margin-top: -16rem; }\n/*\n\n  TABLES\n  Docs: http://tachyons.io/docs/elements/tables/\n\n*/\n.collapse { border-collapse: collapse; border-spacing: 0; }\n.striped--light-silver:nth-child(odd) { background-color: #aaa; }\n.striped--moon-gray:nth-child(odd) { background-color: #ccc; }\n.striped--light-gray:nth-child(odd) { background-color: #eee; }\n.striped--near-white:nth-child(odd) { background-color: #f4f4f4; }\n.stripe-light:nth-child(odd) { background-color: rgba( 255, 255, 255, .1 ); }\n.stripe-dark:nth-child(odd) { background-color: rgba( 0, 0, 0, .1 ); }\n/*\n\n   TEXT DECORATION\n   Docs: http://tachyons.io/docs/typography/text-decoration/\n\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.strike { text-decoration: line-through; }\n.underline { text-decoration: underline; }\n.no-underline { text-decoration: none; }\n/*\n\n  TEXT ALIGN\n  Docs: http://tachyons.io/docs/typography/text-align/\n\n  Base\n    t = text-align\n\n  Modifiers\n    l = left\n    r = right\n    c = center\n    j = justify\n\n  Media Query Extensions:\n    -ns = not-small\n    -m  = medium\n    -l  = large\n\n*/\n.tl { text-align: left; }\n.tr { text-align: right; }\n.tc { text-align: center; }\n.tj { text-align: justify; }\n/*\n\n   TEXT TRANSFORM\n   Docs: http://tachyons.io/docs/typography/text-transform/\n\n   Base:\n     tt = text-transform\n\n   Modifiers\n     c = capitalize\n     l = lowercase\n     u = uppercase\n     n = none\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.ttc { text-transform: capitalize; }\n.ttl { text-transform: lowercase; }\n.ttu { text-transform: uppercase; }\n.ttn { text-transform: none; }\n/*\n\n   TYPE SCALE\n   Docs: http://tachyons.io/docs/typography/scale/\n\n   Base:\n    f = font-size\n\n   Modifiers\n     1 = 1st step in size scale\n     2 = 2nd step in size scale\n     3 = 3rd step in size scale\n     4 = 4th step in size scale\n     5 = 5th step in size scale\n     6 = 6th step in size scale\n     7 = 7th step in size scale\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n*/\n/*\n * For Hero/Marketing Titles\n *\n * These generally are too large for mobile\n * so be careful using them on smaller screens.\n * */\n.f-6, .f-headline { font-size: 6rem; }\n.f-5, .f-subheadline { font-size: 5rem; }\n/* Type Scale */\n.f1 { font-size: 3rem; }\n.f2 { font-size: 2.25rem; }\n.f3 { font-size: 1.5rem; }\n.f4 { font-size: 1.25rem; }\n.f5 { font-size: 1rem; }\n.f6 { font-size: .875rem; }\n.f7 { font-size: .75rem; }\n/* Small and hard to read for many people so use with extreme caution */\n/*\n\n   TYPOGRAPHY\n   http://tachyons.io/docs/typography/measure/\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/* Measure is limited to ~66 characters */\n.measure { max-width: 30em; }\n/* Measure is limited to ~80 characters */\n.measure-wide { max-width: 34em; }\n/* Measure is limited to ~45 characters */\n.measure-narrow { max-width: 20em; }\n/* Book paragraph style - paragraphs are indented with no vertical spacing. */\n.indent { text-indent: 1em; margin-top: 0; margin-bottom: 0; }\n.small-caps { font-variant: small-caps; }\n/* Combine this class with a width to truncate text (or just leave as is to truncate at width of containing element. */\n.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n/*\n\n   UTILITIES\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/* Equivalent to .overflow-y-scroll */\n.overflow-container { overflow-y: scroll; }\n.center { margin-right: auto; margin-left: auto; }\n.mr-auto { margin-right: auto; }\n.ml-auto { margin-left: auto; }\n/*\n\n   VISIBILITY\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n/*\n    Text that is hidden but accessible\n    Ref: http://snook.ca/archives/html_and_css/hiding-content-for-accessibility\n*/\n.clip { position: fixed !important; _position: absolute !important; clip: rect( 1px 1px 1px 1px ); /* IE6, IE7 */ clip: rect( 1px, 1px, 1px, 1px ); }\n/*\n\n   WHITE SPACE\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.ws-normal { white-space: normal; }\n.nowrap { white-space: nowrap; }\n.pre { white-space: pre; }\n/*\n\n   VERTICAL ALIGN\n\n   Media Query Extensions:\n     -ns = not-small\n     -m  = medium\n     -l  = large\n\n*/\n.v-base { vertical-align: baseline; }\n.v-mid { vertical-align: middle; }\n.v-top { vertical-align: top; }\n.v-btm { vertical-align: bottom; }\n/*\n\n  HOVER EFFECTS\n  Docs: http://tachyons.io/docs/themes/hovers/\n\n    - Dim\n    - Glow\n    - Hide Child\n    - Underline text\n    - Grow\n    - Pointer\n    - Shadow\n\n*/\n/*\n\n  Dim element on hover by adding the dim class.\n\n*/\n.dim { opacity: 1; transition: opacity .15s ease-in; }\n.dim:hover, .dim:focus { opacity: .5; transition: opacity .15s ease-in; }\n.dim:active { opacity: .8; transition: opacity .15s ease-out; }\n/*\n\n  Animate opacity to 100% on hover by adding the glow class.\n\n*/\n.glow { transition: opacity .15s ease-in; }\n.glow:hover, .glow:focus { opacity: 1; transition: opacity .15s ease-in; }\n/*\n\n  Hide child & reveal on hover:\n\n  Put the hide-child class on a parent element and any nested element with the\n  child class will be hidden and displayed on hover or focus.\n\n  <div class=\"hide-child\">\n    <div class=\"child\"> Hidden until hover or focus </div>\n    <div class=\"child\"> Hidden until hover or focus </div>\n    <div class=\"child\"> Hidden until hover or focus </div>\n    <div class=\"child\"> Hidden until hover or focus </div>\n  </div>\n*/\n.hide-child .child { opacity: 0; transition: opacity .15s ease-in; }\n.hide-child:hover  .child, .hide-child:focus  .child, .hide-child:active .child { opacity: 1; transition: opacity .15s ease-in; }\n.underline-hover:hover, .underline-hover:focus { text-decoration: underline; }\n/* Can combine this with overflow-hidden to make background images grow on hover\n * even if you are using background-size: cover */\n.grow { -moz-osx-font-smoothing: grayscale; -webkit-backface-visibility: hidden; backface-visibility: hidden; -webkit-transform: translateZ( 0 ); transform: translateZ( 0 ); transition: -webkit-transform .25s ease-out; transition: transform .25s ease-out; transition: transform .25s ease-out, -webkit-transform .25s ease-out; }\n.grow:hover, .grow:focus { -webkit-transform: scale( 1.05 ); transform: scale( 1.05 ); }\n.grow:active { -webkit-transform: scale( .90 ); transform: scale( .90 ); }\n.grow-large { -moz-osx-font-smoothing: grayscale; -webkit-backface-visibility: hidden; backface-visibility: hidden; -webkit-transform: translateZ( 0 ); transform: translateZ( 0 ); transition: -webkit-transform .25s ease-in-out; transition: transform .25s ease-in-out; transition: transform .25s ease-in-out, -webkit-transform .25s ease-in-out; }\n.grow-large:hover, .grow-large:focus { -webkit-transform: scale( 1.2 ); transform: scale( 1.2 ); }\n.grow-large:active { -webkit-transform: scale( .95 ); transform: scale( .95 ); }\n/* Add pointer on hover */\n.pointer:hover { cursor: pointer; }\n/* \n   Add shadow on hover.\n\n   Performant box-shadow animation pattern from \n   http://tobiasahlin.com/blog/how-to-animate-box-shadow/ \n*/\n.shadow-hover { cursor: pointer; position: relative; transition: all .5s cubic-bezier( .165, .84, .44, 1 ); }\n.shadow-hover::after { content: ''; box-shadow: 0 0 16px 2px rgba( 0, 0, 0, .2 ); border-radius: inherit; opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; transition: opacity .5s cubic-bezier( .165, .84, .44, 1 ); }\n.shadow-hover:hover::after, .shadow-hover:focus::after { opacity: 1; }\n/* Combine with classes in skins and skins-pseudo for \n * many different transition possibilities. */\n.bg-animate, .bg-animate:hover, .bg-animate:focus { transition: background-color .15s ease-in-out; }\n/*\n\n  Z-INDEX\n\n  Base\n    z = z-index\n\n  Modifiers\n    -0 = literal value 0\n    -1 = literal value 1\n    -2 = literal value 2\n    -3 = literal value 3\n    -4 = literal value 4\n    -5 = literal value 5\n    -999 = literal value 999\n    -9999 = literal value 9999\n\n    -max = largest accepted z-index value as integer\n\n    -inherit = string value inherit\n    -initial = string value initial\n    -unset = string value unset\n\n  MDN: https://developer.mozilla.org/en/docs/Web/CSS/z-index\n  Spec: http://www.w3.org/TR/CSS2/zindex.html\n  Articles:\n    https://philipwalton.com/articles/what-no-one-told-you-about-z-index/\n\n  Tips on extending:\n  There might be a time worth using negative z-index values.\n  Or if you are using tachyons with another project, you might need to\n  adjust these values to suit your needs.\n\n*/\n.z-0 { z-index: 0; }\n.z-1 { z-index: 1; }\n.z-2 { z-index: 2; }\n.z-3 { z-index: 3; }\n.z-4 { z-index: 4; }\n.z-5 { z-index: 5; }\n.z-999 { z-index: 999; }\n.z-9999 { z-index: 9999; }\n.z-max { z-index: 2147483647; }\n.z-inherit { z-index: inherit; }\n.z-initial { z-index: initial; }\n.z-unset { z-index: unset; }\n/*\n\n    NESTED\n    Tachyons module for styling nested elements\n    that are generated by a cms.\n\n*/\n.nested-copy-line-height p, .nested-copy-line-height ul,\n.nested-copy-line-height ol { line-height: 1.5; }\n.nested-headline-line-height h1, .nested-headline-line-height h2,\n.nested-headline-line-height h3, .nested-headline-line-height h4,\n.nested-headline-line-height h5, .nested-headline-line-height h6 { line-height: 1.25; }\n.nested-list-reset ul, .nested-list-reset ol { padding-left: 0; margin-left: 0; list-style-type: none; }\n.nested-copy-indent p+p { text-indent: 1em; margin-top: 0; margin-bottom: 0; }\n.nested-copy-separator p+p { margin-top: 1.5em; }\n.nested-img img { width: 100%; max-width: 100%; display: block; }\n.nested-links a { color: #357edd; transition: color .15s ease-in; }\n.nested-links a:hover { color: #96ccff; transition: color .15s ease-in; }\n.nested-links a:focus { color: #96ccff; transition: color .15s ease-in; }\n/*\n\n  STYLES\n\n  Add custom styles here.\n\n*/\n/* Variables */\n/* Importing here will allow you to override any variables in the modules */\n/*\n\n   Tachyons\n   COLOR VARIABLES\n\n   Grayscale\n   - Solids\n   - Transparencies\n   Colors\n\n*/\n/*\n\n  CUSTOM MEDIA QUERIES\n\n  Media query values can be changed to fit your own content.\n  There are no magic bullets when it comes to media query width values.\n  They should be declared in em units - and they should be set to meet\n  the needs of your content. You can also add additional media queries,\n  or remove some of the existing ones.\n\n  These media queries can be referenced like so:\n\n  @media (--breakpoint-not-small) {\n    .medium-and-larger-specific-style {\n      background-color: red;\n    }\n  }\n\n  @media (--breakpoint-medium) {\n    .medium-screen-specific-style {\n      background-color: red;\n    }\n  }\n\n  @media (--breakpoint-large) {\n    .large-and-larger-screen-specific-style {\n      background-color: red;\n    }\n  }\n\n*/\n/* Media Queries */\n/* Debugging */\n/*\n\n  DEBUG CHILDREN\n  Docs: http://tachyons.io/docs/debug/\n\n  Just add the debug class to any element to see outlines on its\n  children.\n\n*/\n.debug * { outline: 1px solid gold; }\n.debug-white * { outline: 1px solid white; }\n.debug-black * { outline: 1px solid black; }\n/*\n\n   DEBUG GRID\n   http://tachyons.io/docs/debug-grid/\n\n   Can be useful for debugging layout issues\n   or helping to make sure things line up perfectly.\n   Just tack one of these classes onto a parent element.\n\n*/\n.debug-grid { background: transparent url( data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR4AWPAC97/9x0eCsAEPgwAVLshdpENIxcAAAAASUVORK5CYII= ) repeat top left; }\n.debug-grid-16 { background: transparent url( data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR4AWOgCLz/b0epAa6UGuBOqQHOQHLUgFEDnAbcBZ4UGwDOkiCnkIhdgNgNxAYAiYlD+8sEuo8AAAAASUVORK5CYII= ) repeat top left; }\n.debug-grid-8-solid { background: white url( data:image/gif;base64,R0lGODdhCAAIAPEAAADw/wDx/////wAAACwAAAAACAAIAAACDZQvgaeb/lxbAIKA8y0AOw== ) repeat top left; }\n.debug-grid-16-solid { background: white url( data:image/gif;base64,R0lGODdhEAAQAPEAAADw/wDx/xXy/////ywAAAAAEAAQAAACIZyPKckYDQFsb6ZqD85jZ2+BkwiRFKehhqQCQgDHcgwEBQA7 ) repeat top left; }\n/* Uncomment out the line below to help debug layout issues */\n/* @import './_debug'; */\n@media screen and (min-width: 30em) {\n .aspect-ratio-ns { height: 0; position: relative; }\n .aspect-ratio--16x9-ns { padding-bottom: 56.25%; }\n .aspect-ratio--9x16-ns { padding-bottom: 177.77%; }\n .aspect-ratio--4x3-ns { padding-bottom: 75%; }\n .aspect-ratio--3x4-ns { padding-bottom: 133.33%; }\n .aspect-ratio--6x4-ns { padding-bottom: 66.6%; }\n .aspect-ratio--4x6-ns { padding-bottom: 150%; }\n .aspect-ratio--8x5-ns { padding-bottom: 62.5%; }\n .aspect-ratio--5x8-ns { padding-bottom: 160%; }\n .aspect-ratio--7x5-ns { padding-bottom: 71.42%; }\n .aspect-ratio--5x7-ns { padding-bottom: 140%; }\n .aspect-ratio--1x1-ns { padding-bottom: 100%; }\n .aspect-ratio--object-ns { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; }\n .cover-ns { background-size: cover !important; }\n .contain-ns { background-size: contain !important; }\n .bg-center-ns { background-repeat: no-repeat; background-position: center center; }\n .bg-top-ns { background-repeat: no-repeat; background-position: top center; }\n .bg-right-ns { background-repeat: no-repeat; background-position: center right; }\n .bg-bottom-ns { background-repeat: no-repeat; background-position: bottom center; }\n .bg-left-ns { background-repeat: no-repeat; background-position: center left; }\n .outline-ns { outline: 1px solid; }\n .outline-transparent-ns { outline: 1px solid transparent; }\n .outline-0-ns { outline: 0; }\n .ba-ns { border-style: solid; border-width: 1px; }\n .bt-ns { border-top-style: solid; border-top-width: 1px; }\n .br-ns { border-right-style: solid; border-right-width: 1px; }\n .bb-ns { border-bottom-style: solid; border-bottom-width: 1px; }\n .bl-ns { border-left-style: solid; border-left-width: 1px; }\n .bn-ns { border-style: none; border-width: 0; }\n .br0-ns { border-radius: 0; }\n .br1-ns { border-radius: .125rem; }\n .br2-ns { border-radius: .25rem; }\n .br3-ns { border-radius: .5rem; }\n .br4-ns { border-radius: 1rem; }\n .br-100-ns { border-radius: 100%; }\n .br-pill-ns { border-radius: 9999px; }\n .br--bottom-ns { border-top-left-radius: 0; border-top-right-radius: 0; }\n .br--top-ns { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }\n .br--right-ns { border-top-left-radius: 0; border-bottom-left-radius: 0; }\n .br--left-ns { border-top-right-radius: 0; border-bottom-right-radius: 0; }\n .b--dotted-ns { border-style: dotted; }\n .b--dashed-ns { border-style: dashed; }\n .b--solid-ns { border-style: solid; }\n .b--none-ns { border-style: none; }\n .bw0-ns { border-width: 0; }\n .bw1-ns { border-width: .125rem; }\n .bw2-ns { border-width: .25rem; }\n .bw3-ns { border-width: .5rem; }\n .bw4-ns { border-width: 1rem; }\n .bw5-ns { border-width: 2rem; }\n .bt-0-ns { border-top-width: 0; }\n .br-0-ns { border-right-width: 0; }\n .bb-0-ns { border-bottom-width: 0; }\n .bl-0-ns { border-left-width: 0; }\n .shadow-1-ns { box-shadow: 0 0 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-2-ns { box-shadow: 0 0 8px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-3-ns { box-shadow: 2px 2px 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-4-ns { box-shadow: 2px 2px 8px 0 rgba( 0, 0, 0, .2 ); }\n .shadow-5-ns { box-shadow: 4px 4px 8px 0 rgba( 0, 0, 0, .2 ); }\n .top-0-ns { top: 0; }\n .left-0-ns { left: 0; }\n .right-0-ns { right: 0; }\n .bottom-0-ns { bottom: 0; }\n .top-1-ns { top: 1rem; }\n .left-1-ns { left: 1rem; }\n .right-1-ns { right: 1rem; }\n .bottom-1-ns { bottom: 1rem; }\n .top-2-ns { top: 2rem; }\n .left-2-ns { left: 2rem; }\n .right-2-ns { right: 2rem; }\n .bottom-2-ns { bottom: 2rem; }\n .top--1-ns { top: -1rem; }\n .right--1-ns { right: -1rem; }\n .bottom--1-ns { bottom: -1rem; }\n .left--1-ns { left: -1rem; }\n .top--2-ns { top: -2rem; }\n .right--2-ns { right: -2rem; }\n .bottom--2-ns { bottom: -2rem; }\n .left--2-ns { left: -2rem; }\n .absolute--fill-ns { top: 0; right: 0; bottom: 0; left: 0; }\n .cl-ns { clear: left; }\n .cr-ns { clear: right; }\n .cb-ns { clear: both; }\n .cn-ns { clear: none; }\n .dn-ns { display: none; }\n .di-ns { display: inline; }\n .db-ns { display: block; }\n .dib-ns { display: inline-block; }\n .dit-ns { display: inline-table; }\n .dt-ns { display: table; }\n .dtc-ns { display: table-cell; }\n .dt-row-ns { display: table-row; }\n .dt-row-group-ns { display: table-row-group; }\n .dt-column-ns { display: table-column; }\n .dt-column-group-ns { display: table-column-group; }\n .dt--fixed-ns { table-layout: fixed; width: 100%; }\n .flex-ns { display: -webkit-box; display: -ms-flexbox; display: flex; }\n .inline-flex-ns { display: -webkit-inline-box; display: -ms-inline-flexbox; display: inline-flex; }\n .flex-auto-ns { -webkit-box-flex: 1; -ms-flex: 1 1 auto; flex: 1 1 auto; min-width: 0; /* 1 */ min-height: 0; /* 1 */ }\n .flex-none-ns { -webkit-box-flex: 0; -ms-flex: none; flex: none; }\n .flex-column-ns { -webkit-box-orient: vertical; -webkit-box-direction: normal; -ms-flex-direction: column; flex-direction: column; }\n .flex-row-ns { -webkit-box-orient: horizontal; -webkit-box-direction: normal; -ms-flex-direction: row; flex-direction: row; }\n .flex-wrap-ns { -ms-flex-wrap: wrap; flex-wrap: wrap; }\n .flex-nowrap-ns { -ms-flex-wrap: nowrap; flex-wrap: nowrap; }\n .flex-wrap-reverse-ns { -ms-flex-wrap: wrap-reverse; flex-wrap: wrap-reverse; }\n .flex-column-reverse-ns { -webkit-box-orient: vertical; -webkit-box-direction: reverse; -ms-flex-direction: column-reverse; flex-direction: column-reverse; }\n .flex-row-reverse-ns { -webkit-box-orient: horizontal; -webkit-box-direction: reverse; -ms-flex-direction: row-reverse; flex-direction: row-reverse; }\n .items-start-ns { -webkit-box-align: start; -ms-flex-align: start; align-items: flex-start; }\n .items-end-ns { -webkit-box-align: end; -ms-flex-align: end; align-items: flex-end; }\n .items-center-ns { -webkit-box-align: center; -ms-flex-align: center; align-items: center; }\n .items-baseline-ns { -webkit-box-align: baseline; -ms-flex-align: baseline; align-items: baseline; }\n .items-stretch-ns { -webkit-box-align: stretch; -ms-flex-align: stretch; align-items: stretch; }\n .self-start-ns { -ms-flex-item-align: start; align-self: flex-start; }\n .self-end-ns { -ms-flex-item-align: end; align-self: flex-end; }\n .self-center-ns { -ms-flex-item-align: center; -ms-grid-row-align: center; align-self: center; }\n .self-baseline-ns { -ms-flex-item-align: baseline; align-self: baseline; }\n .self-stretch-ns { -ms-flex-item-align: stretch; -ms-grid-row-align: stretch; align-self: stretch; }\n .justify-start-ns { -webkit-box-pack: start; -ms-flex-pack: start; justify-content: flex-start; }\n .justify-end-ns { -webkit-box-pack: end; -ms-flex-pack: end; justify-content: flex-end; }\n .justify-center-ns { -webkit-box-pack: center; -ms-flex-pack: center; justify-content: center; }\n .justify-between-ns { -webkit-box-pack: justify; -ms-flex-pack: justify; justify-content: space-between; }\n .justify-around-ns { -ms-flex-pack: distribute; justify-content: space-around; }\n .content-start-ns { -ms-flex-line-pack: start; align-content: flex-start; }\n .content-end-ns { -ms-flex-line-pack: end; align-content: flex-end; }\n .content-center-ns { -ms-flex-line-pack: center; align-content: center; }\n .content-between-ns { -ms-flex-line-pack: justify; align-content: space-between; }\n .content-around-ns { -ms-flex-line-pack: distribute; align-content: space-around; }\n .content-stretch-ns { -ms-flex-line-pack: stretch; align-content: stretch; }\n .order-0-ns { -webkit-box-ordinal-group: 1; -ms-flex-order: 0; order: 0; }\n .order-1-ns { -webkit-box-ordinal-group: 2; -ms-flex-order: 1; order: 1; }\n .order-2-ns { -webkit-box-ordinal-group: 3; -ms-flex-order: 2; order: 2; }\n .order-3-ns { -webkit-box-ordinal-group: 4; -ms-flex-order: 3; order: 3; }\n .order-4-ns { -webkit-box-ordinal-group: 5; -ms-flex-order: 4; order: 4; }\n .order-5-ns { -webkit-box-ordinal-group: 6; -ms-flex-order: 5; order: 5; }\n .order-6-ns { -webkit-box-ordinal-group: 7; -ms-flex-order: 6; order: 6; }\n .order-7-ns { -webkit-box-ordinal-group: 8; -ms-flex-order: 7; order: 7; }\n .order-8-ns { -webkit-box-ordinal-group: 9; -ms-flex-order: 8; order: 8; }\n .order-last-ns { -webkit-box-ordinal-group: 100000; -ms-flex-order: 99999; order: 99999; }\n .flex-grow-0-ns { -webkit-box-flex: 0; -ms-flex-positive: 0; flex-grow: 0; }\n .flex-grow-1-ns { -webkit-box-flex: 1; -ms-flex-positive: 1; flex-grow: 1; }\n .flex-shrink-0-ns { -ms-flex-negative: 0; flex-shrink: 0; }\n .flex-shrink-1-ns { -ms-flex-negative: 1; flex-shrink: 1; }\n .fl-ns { float: left; display: inline; }\n .fr-ns { float: right; display: inline; }\n .fn-ns { float: none; }\n .i-ns { font-style: italic; }\n .fs-normal-ns { font-style: normal; }\n .normal-ns { font-weight: normal; }\n .b-ns { font-weight: bold; }\n .fw1-ns { font-weight: 100; }\n .fw2-ns { font-weight: 200; }\n .fw3-ns { font-weight: 300; }\n .fw4-ns { font-weight: 400; }\n .fw5-ns { font-weight: 500; }\n .fw6-ns { font-weight: 600; }\n .fw7-ns { font-weight: 700; }\n .fw8-ns { font-weight: 800; }\n .fw9-ns { font-weight: 900; }\n .h1-ns { height: 1rem; }\n .h2-ns { height: 2rem; }\n .h3-ns { height: 4rem; }\n .h4-ns { height: 8rem; }\n .h5-ns { height: 16rem; }\n .h-25-ns { height: 25%; }\n .h-50-ns { height: 50%; }\n .h-75-ns { height: 75%; }\n .h-100-ns { height: 100%; }\n .min-h-100-ns { min-height: 100%; }\n .vh-25-ns { height: 25vh; }\n .vh-50-ns { height: 50vh; }\n .vh-75-ns { height: 75vh; }\n .vh-100-ns { height: 100vh; }\n .min-vh-100-ns { min-height: 100vh; }\n .h-auto-ns { height: auto; }\n .h-inherit-ns { height: inherit; }\n .tracked-ns { letter-spacing: .1em; }\n .tracked-tight-ns { letter-spacing: -.05em; }\n .tracked-mega-ns { letter-spacing: .25em; }\n .lh-solid-ns { line-height: 1; }\n .lh-title-ns { line-height: 1.25; }\n .lh-copy-ns { line-height: 1.5; }\n .mw-100-ns { max-width: 100%; }\n .mw1-ns { max-width: 1rem; }\n .mw2-ns { max-width: 2rem; }\n .mw3-ns { max-width: 4rem; }\n .mw4-ns { max-width: 8rem; }\n .mw5-ns { max-width: 16rem; }\n .mw6-ns { max-width: 32rem; }\n .mw7-ns { max-width: 48rem; }\n .mw8-ns { max-width: 64rem; }\n .mw9-ns { max-width: 96rem; }\n .mw-none-ns { max-width: none; }\n .w1-ns { width: 1rem; }\n .w2-ns { width: 2rem; }\n .w3-ns { width: 4rem; }\n .w4-ns { width: 8rem; }\n .w5-ns { width: 16rem; }\n .w-10-ns { width: 10%; }\n .w-20-ns { width: 20%; }\n .w-25-ns { width: 25%; }\n .w-30-ns { width: 30%; }\n .w-33-ns { width: 33%; }\n .w-34-ns { width: 34%; }\n .w-40-ns { width: 40%; }\n .w-50-ns { width: 50%; }\n .w-60-ns { width: 60%; }\n .w-70-ns { width: 70%; }\n .w-75-ns { width: 75%; }\n .w-80-ns { width: 80%; }\n .w-90-ns { width: 90%; }\n .w-100-ns { width: 100%; }\n .w-third-ns { width: calc( 100% / 3 ); }\n .w-two-thirds-ns { width: calc( 100% / 1.5 ); }\n .w-auto-ns { width: auto; }\n .overflow-visible-ns { overflow: visible; }\n .overflow-hidden-ns { overflow: hidden; }\n .overflow-scroll-ns { overflow: scroll; }\n .overflow-auto-ns { overflow: auto; }\n .overflow-x-visible-ns { overflow-x: visible; }\n .overflow-x-hidden-ns { overflow-x: hidden; }\n .overflow-x-scroll-ns { overflow-x: scroll; }\n .overflow-x-auto-ns { overflow-x: auto; }\n .overflow-y-visible-ns { overflow-y: visible; }\n .overflow-y-hidden-ns { overflow-y: hidden; }\n .overflow-y-scroll-ns { overflow-y: scroll; }\n .overflow-y-auto-ns { overflow-y: auto; }\n .static-ns { position: static; }\n .relative-ns { position: relative; }\n .absolute-ns { position: absolute; }\n .fixed-ns { position: fixed; }\n .rotate-45-ns { -webkit-transform: rotate( 45deg ); transform: rotate( 45deg ); }\n .rotate-90-ns { -webkit-transform: rotate( 90deg ); transform: rotate( 90deg ); }\n .rotate-135-ns { -webkit-transform: rotate( 135deg ); transform: rotate( 135deg ); }\n .rotate-180-ns { -webkit-transform: rotate( 180deg ); transform: rotate( 180deg ); }\n .rotate-225-ns { -webkit-transform: rotate( 225deg ); transform: rotate( 225deg ); }\n .rotate-270-ns { -webkit-transform: rotate( 270deg ); transform: rotate( 270deg ); }\n .rotate-315-ns { -webkit-transform: rotate( 315deg ); transform: rotate( 315deg ); }\n .pa0-ns { padding: 0; }\n .pa1-ns { padding: .25rem; }\n .pa2-ns { padding: .5rem; }\n .pa3-ns { padding: 1rem; }\n .pa4-ns { padding: 2rem; }\n .pa5-ns { padding: 4rem; }\n .pa6-ns { padding: 8rem; }\n .pa7-ns { padding: 16rem; }\n .pl0-ns { padding-left: 0; }\n .pl1-ns { padding-left: .25rem; }\n .pl2-ns { padding-left: .5rem; }\n .pl3-ns { padding-left: 1rem; }\n .pl4-ns { padding-left: 2rem; }\n .pl5-ns { padding-left: 4rem; }\n .pl6-ns { padding-left: 8rem; }\n .pl7-ns { padding-left: 16rem; }\n .pr0-ns { padding-right: 0; }\n .pr1-ns { padding-right: .25rem; }\n .pr2-ns { padding-right: .5rem; }\n .pr3-ns { padding-right: 1rem; }\n .pr4-ns { padding-right: 2rem; }\n .pr5-ns { padding-right: 4rem; }\n .pr6-ns { padding-right: 8rem; }\n .pr7-ns { padding-right: 16rem; }\n .pb0-ns { padding-bottom: 0; }\n .pb1-ns { padding-bottom: .25rem; }\n .pb2-ns { padding-bottom: .5rem; }\n .pb3-ns { padding-bottom: 1rem; }\n .pb4-ns { padding-bottom: 2rem; }\n .pb5-ns { padding-bottom: 4rem; }\n .pb6-ns { padding-bottom: 8rem; }\n .pb7-ns { padding-bottom: 16rem; }\n .pt0-ns { padding-top: 0; }\n .pt1-ns { padding-top: .25rem; }\n .pt2-ns { padding-top: .5rem; }\n .pt3-ns { padding-top: 1rem; }\n .pt4-ns { padding-top: 2rem; }\n .pt5-ns { padding-top: 4rem; }\n .pt6-ns { padding-top: 8rem; }\n .pt7-ns { padding-top: 16rem; }\n .pv0-ns { padding-top: 0; padding-bottom: 0; }\n .pv1-ns { padding-top: .25rem; padding-bottom: .25rem; }\n .pv2-ns { padding-top: .5rem; padding-bottom: .5rem; }\n .pv3-ns { padding-top: 1rem; padding-bottom: 1rem; }\n .pv4-ns { padding-top: 2rem; padding-bottom: 2rem; }\n .pv5-ns { padding-top: 4rem; padding-bottom: 4rem; }\n .pv6-ns { padding-top: 8rem; padding-bottom: 8rem; }\n .pv7-ns { padding-top: 16rem; padding-bottom: 16rem; }\n .ph0-ns { padding-left: 0; padding-right: 0; }\n .ph1-ns { padding-left: .25rem; padding-right: .25rem; }\n .ph2-ns { padding-left: .5rem; padding-right: .5rem; }\n .ph3-ns { padding-left: 1rem; padding-right: 1rem; }\n .ph4-ns { padding-left: 2rem; padding-right: 2rem; }\n .ph5-ns { padding-left: 4rem; padding-right: 4rem; }\n .ph6-ns { padding-left: 8rem; padding-right: 8rem; }\n .ph7-ns { padding-left: 16rem; padding-right: 16rem; }\n .ma0-ns { margin: 0; }\n .ma1-ns { margin: .25rem; }\n .ma2-ns { margin: .5rem; }\n .ma3-ns { margin: 1rem; }\n .ma4-ns { margin: 2rem; }\n .ma5-ns { margin: 4rem; }\n .ma6-ns { margin: 8rem; }\n .ma7-ns { margin: 16rem; }\n .ml0-ns { margin-left: 0; }\n .ml1-ns { margin-left: .25rem; }\n .ml2-ns { margin-left: .5rem; }\n .ml3-ns { margin-left: 1rem; }\n .ml4-ns { margin-left: 2rem; }\n .ml5-ns { margin-left: 4rem; }\n .ml6-ns { margin-left: 8rem; }\n .ml7-ns { margin-left: 16rem; }\n .mr0-ns { margin-right: 0; }\n .mr1-ns { margin-right: .25rem; }\n .mr2-ns { margin-right: .5rem; }\n .mr3-ns { margin-right: 1rem; }\n .mr4-ns { margin-right: 2rem; }\n .mr5-ns { margin-right: 4rem; }\n .mr6-ns { margin-right: 8rem; }\n .mr7-ns { margin-right: 16rem; }\n .mb0-ns { margin-bottom: 0; }\n .mb1-ns { margin-bottom: .25rem; }\n .mb2-ns { margin-bottom: .5rem; }\n .mb3-ns { margin-bottom: 1rem; }\n .mb4-ns { margin-bottom: 2rem; }\n .mb5-ns { margin-bottom: 4rem; }\n .mb6-ns { margin-bottom: 8rem; }\n .mb7-ns { margin-bottom: 16rem; }\n .mt0-ns { margin-top: 0; }\n .mt1-ns { margin-top: .25rem; }\n .mt2-ns { margin-top: .5rem; }\n .mt3-ns { margin-top: 1rem; }\n .mt4-ns { margin-top: 2rem; }\n .mt5-ns { margin-top: 4rem; }\n .mt6-ns { margin-top: 8rem; }\n .mt7-ns { margin-top: 16rem; }\n .mv0-ns { margin-top: 0; margin-bottom: 0; }\n .mv1-ns { margin-top: .25rem; margin-bottom: .25rem; }\n .mv2-ns { margin-top: .5rem; margin-bottom: .5rem; }\n .mv3-ns { margin-top: 1rem; margin-bottom: 1rem; }\n .mv4-ns { margin-top: 2rem; margin-bottom: 2rem; }\n .mv5-ns { margin-top: 4rem; margin-bottom: 4rem; }\n .mv6-ns { margin-top: 8rem; margin-bottom: 8rem; }\n .mv7-ns { margin-top: 16rem; margin-bottom: 16rem; }\n .mh0-ns { margin-left: 0; margin-right: 0; }\n .mh1-ns { margin-left: .25rem; margin-right: .25rem; }\n .mh2-ns { margin-left: .5rem; margin-right: .5rem; }\n .mh3-ns { margin-left: 1rem; margin-right: 1rem; }\n .mh4-ns { margin-left: 2rem; margin-right: 2rem; }\n .mh5-ns { margin-left: 4rem; margin-right: 4rem; }\n .mh6-ns { margin-left: 8rem; margin-right: 8rem; }\n .mh7-ns { margin-left: 16rem; margin-right: 16rem; }\n .na1-ns { margin: -.25rem; }\n .na2-ns { margin: -.5rem; }\n .na3-ns { margin: -1rem; }\n .na4-ns { margin: -2rem; }\n .na5-ns { margin: -4rem; }\n .na6-ns { margin: -8rem; }\n .na7-ns { margin: -16rem; }\n .nl1-ns { margin-left: -.25rem; }\n .nl2-ns { margin-left: -.5rem; }\n .nl3-ns { margin-left: -1rem; }\n .nl4-ns { margin-left: -2rem; }\n .nl5-ns { margin-left: -4rem; }\n .nl6-ns { margin-left: -8rem; }\n .nl7-ns { margin-left: -16rem; }\n .nr1-ns { margin-right: -.25rem; }\n .nr2-ns { margin-right: -.5rem; }\n .nr3-ns { margin-right: -1rem; }\n .nr4-ns { margin-right: -2rem; }\n .nr5-ns { margin-right: -4rem; }\n .nr6-ns { margin-right: -8rem; }\n .nr7-ns { margin-right: -16rem; }\n .nb1-ns { margin-bottom: -.25rem; }\n .nb2-ns { margin-bottom: -.5rem; }\n .nb3-ns { margin-bottom: -1rem; }\n .nb4-ns { margin-bottom: -2rem; }\n .nb5-ns { margin-bottom: -4rem; }\n .nb6-ns { margin-bottom: -8rem; }\n .nb7-ns { margin-bottom: -16rem; }\n .nt1-ns { margin-top: -.25rem; }\n .nt2-ns { margin-top: -.5rem; }\n .nt3-ns { margin-top: -1rem; }\n .nt4-ns { margin-top: -2rem; }\n .nt5-ns { margin-top: -4rem; }\n .nt6-ns { margin-top: -8rem; }\n .nt7-ns { margin-top: -16rem; }\n .strike-ns { text-decoration: line-through; }\n .underline-ns { text-decoration: underline; }\n .no-underline-ns { text-decoration: none; }\n .tl-ns { text-align: left; }\n .tr-ns { text-align: right; }\n .tc-ns { text-align: center; }\n .tj-ns { text-align: justify; }\n .ttc-ns { text-transform: capitalize; }\n .ttl-ns { text-transform: lowercase; }\n .ttu-ns { text-transform: uppercase; }\n .ttn-ns { text-transform: none; }\n .f-6-ns, .f-headline-ns { font-size: 6rem; }\n .f-5-ns, .f-subheadline-ns { font-size: 5rem; }\n .f1-ns { font-size: 3rem; }\n .f2-ns { font-size: 2.25rem; }\n .f3-ns { font-size: 1.5rem; }\n .f4-ns { font-size: 1.25rem; }\n .f5-ns { font-size: 1rem; }\n .f6-ns { font-size: .875rem; }\n .f7-ns { font-size: .75rem; }\n .measure-ns { max-width: 30em; }\n .measure-wide-ns { max-width: 34em; }\n .measure-narrow-ns { max-width: 20em; }\n .indent-ns { text-indent: 1em; margin-top: 0; margin-bottom: 0; }\n .small-caps-ns { font-variant: small-caps; }\n .truncate-ns { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n .center-ns { margin-right: auto; margin-left: auto; }\n .mr-auto-ns { margin-right: auto; }\n .ml-auto-ns { margin-left: auto; }\n .clip-ns { position: fixed !important; position: absolute !important; clip: rect( 1px 1px 1px 1px ); /* IE6, IE7 */ clip: rect( 1px, 1px, 1px, 1px ); }\n .ws-normal-ns { white-space: normal; }\n .nowrap-ns { white-space: nowrap; }\n .pre-ns { white-space: pre; }\n .v-base-ns { vertical-align: baseline; }\n .v-mid-ns { vertical-align: middle; }\n .v-top-ns { vertical-align: top; }\n .v-btm-ns { vertical-align: bottom; }\n}\n@media screen and (min-width: 30em) and (max-width: 60em) {\n .aspect-ratio-m { height: 0; position: relative; }\n .aspect-ratio--16x9-m { padding-bottom: 56.25%; }\n .aspect-ratio--9x16-m { padding-bottom: 177.77%; }\n .aspect-ratio--4x3-m { padding-bottom: 75%; }\n .aspect-ratio--3x4-m { padding-bottom: 133.33%; }\n .aspect-ratio--6x4-m { padding-bottom: 66.6%; }\n .aspect-ratio--4x6-m { padding-bottom: 150%; }\n .aspect-ratio--8x5-m { padding-bottom: 62.5%; }\n .aspect-ratio--5x8-m { padding-bottom: 160%; }\n .aspect-ratio--7x5-m { padding-bottom: 71.42%; }\n .aspect-ratio--5x7-m { padding-bottom: 140%; }\n .aspect-ratio--1x1-m { padding-bottom: 100%; }\n .aspect-ratio--object-m { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; }\n .cover-m { background-size: cover !important; }\n .contain-m { background-size: contain !important; }\n .bg-center-m { background-repeat: no-repeat; background-position: center center; }\n .bg-top-m { background-repeat: no-repeat; background-position: top center; }\n .bg-right-m { background-repeat: no-repeat; background-position: center right; }\n .bg-bottom-m { background-repeat: no-repeat; background-position: bottom center; }\n .bg-left-m { background-repeat: no-repeat; background-position: center left; }\n .outline-m { outline: 1px solid; }\n .outline-transparent-m { outline: 1px solid transparent; }\n .outline-0-m { outline: 0; }\n .ba-m { border-style: solid; border-width: 1px; }\n .bt-m { border-top-style: solid; border-top-width: 1px; }\n .br-m { border-right-style: solid; border-right-width: 1px; }\n .bb-m { border-bottom-style: solid; border-bottom-width: 1px; }\n .bl-m { border-left-style: solid; border-left-width: 1px; }\n .bn-m { border-style: none; border-width: 0; }\n .br0-m { border-radius: 0; }\n .br1-m { border-radius: .125rem; }\n .br2-m { border-radius: .25rem; }\n .br3-m { border-radius: .5rem; }\n .br4-m { border-radius: 1rem; }\n .br-100-m { border-radius: 100%; }\n .br-pill-m { border-radius: 9999px; }\n .br--bottom-m { border-top-left-radius: 0; border-top-right-radius: 0; }\n .br--top-m { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }\n .br--right-m { border-top-left-radius: 0; border-bottom-left-radius: 0; }\n .br--left-m { border-top-right-radius: 0; border-bottom-right-radius: 0; }\n .b--dotted-m { border-style: dotted; }\n .b--dashed-m { border-style: dashed; }\n .b--solid-m { border-style: solid; }\n .b--none-m { border-style: none; }\n .bw0-m { border-width: 0; }\n .bw1-m { border-width: .125rem; }\n .bw2-m { border-width: .25rem; }\n .bw3-m { border-width: .5rem; }\n .bw4-m { border-width: 1rem; }\n .bw5-m { border-width: 2rem; }\n .bt-0-m { border-top-width: 0; }\n .br-0-m { border-right-width: 0; }\n .bb-0-m { border-bottom-width: 0; }\n .bl-0-m { border-left-width: 0; }\n .shadow-1-m { box-shadow: 0 0 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-2-m { box-shadow: 0 0 8px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-3-m { box-shadow: 2px 2px 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-4-m { box-shadow: 2px 2px 8px 0 rgba( 0, 0, 0, .2 ); }\n .shadow-5-m { box-shadow: 4px 4px 8px 0 rgba( 0, 0, 0, .2 ); }\n .top-0-m { top: 0; }\n .left-0-m { left: 0; }\n .right-0-m { right: 0; }\n .bottom-0-m { bottom: 0; }\n .top-1-m { top: 1rem; }\n .left-1-m { left: 1rem; }\n .right-1-m { right: 1rem; }\n .bottom-1-m { bottom: 1rem; }\n .top-2-m { top: 2rem; }\n .left-2-m { left: 2rem; }\n .right-2-m { right: 2rem; }\n .bottom-2-m { bottom: 2rem; }\n .top--1-m { top: -1rem; }\n .right--1-m { right: -1rem; }\n .bottom--1-m { bottom: -1rem; }\n .left--1-m { left: -1rem; }\n .top--2-m { top: -2rem; }\n .right--2-m { right: -2rem; }\n .bottom--2-m { bottom: -2rem; }\n .left--2-m { left: -2rem; }\n .absolute--fill-m { top: 0; right: 0; bottom: 0; left: 0; }\n .cl-m { clear: left; }\n .cr-m { clear: right; }\n .cb-m { clear: both; }\n .cn-m { clear: none; }\n .dn-m { display: none; }\n .di-m { display: inline; }\n .db-m { display: block; }\n .dib-m { display: inline-block; }\n .dit-m { display: inline-table; }\n .dt-m { display: table; }\n .dtc-m { display: table-cell; }\n .dt-row-m { display: table-row; }\n .dt-row-group-m { display: table-row-group; }\n .dt-column-m { display: table-column; }\n .dt-column-group-m { display: table-column-group; }\n .dt--fixed-m { table-layout: fixed; width: 100%; }\n .flex-m { display: -webkit-box; display: -ms-flexbox; display: flex; }\n .inline-flex-m { display: -webkit-inline-box; display: -ms-inline-flexbox; display: inline-flex; }\n .flex-auto-m { -webkit-box-flex: 1; -ms-flex: 1 1 auto; flex: 1 1 auto; min-width: 0; /* 1 */ min-height: 0; /* 1 */ }\n .flex-none-m { -webkit-box-flex: 0; -ms-flex: none; flex: none; }\n .flex-column-m { -webkit-box-orient: vertical; -webkit-box-direction: normal; -ms-flex-direction: column; flex-direction: column; }\n .flex-row-m { -webkit-box-orient: horizontal; -webkit-box-direction: normal; -ms-flex-direction: row; flex-direction: row; }\n .flex-wrap-m { -ms-flex-wrap: wrap; flex-wrap: wrap; }\n .flex-nowrap-m { -ms-flex-wrap: nowrap; flex-wrap: nowrap; }\n .flex-wrap-reverse-m { -ms-flex-wrap: wrap-reverse; flex-wrap: wrap-reverse; }\n .flex-column-reverse-m { -webkit-box-orient: vertical; -webkit-box-direction: reverse; -ms-flex-direction: column-reverse; flex-direction: column-reverse; }\n .flex-row-reverse-m { -webkit-box-orient: horizontal; -webkit-box-direction: reverse; -ms-flex-direction: row-reverse; flex-direction: row-reverse; }\n .items-start-m { -webkit-box-align: start; -ms-flex-align: start; align-items: flex-start; }\n .items-end-m { -webkit-box-align: end; -ms-flex-align: end; align-items: flex-end; }\n .items-center-m { -webkit-box-align: center; -ms-flex-align: center; align-items: center; }\n .items-baseline-m { -webkit-box-align: baseline; -ms-flex-align: baseline; align-items: baseline; }\n .items-stretch-m { -webkit-box-align: stretch; -ms-flex-align: stretch; align-items: stretch; }\n .self-start-m { -ms-flex-item-align: start; align-self: flex-start; }\n .self-end-m { -ms-flex-item-align: end; align-self: flex-end; }\n .self-center-m { -ms-flex-item-align: center; -ms-grid-row-align: center; align-self: center; }\n .self-baseline-m { -ms-flex-item-align: baseline; align-self: baseline; }\n .self-stretch-m { -ms-flex-item-align: stretch; -ms-grid-row-align: stretch; align-self: stretch; }\n .justify-start-m { -webkit-box-pack: start; -ms-flex-pack: start; justify-content: flex-start; }\n .justify-end-m { -webkit-box-pack: end; -ms-flex-pack: end; justify-content: flex-end; }\n .justify-center-m { -webkit-box-pack: center; -ms-flex-pack: center; justify-content: center; }\n .justify-between-m { -webkit-box-pack: justify; -ms-flex-pack: justify; justify-content: space-between; }\n .justify-around-m { -ms-flex-pack: distribute; justify-content: space-around; }\n .content-start-m { -ms-flex-line-pack: start; align-content: flex-start; }\n .content-end-m { -ms-flex-line-pack: end; align-content: flex-end; }\n .content-center-m { -ms-flex-line-pack: center; align-content: center; }\n .content-between-m { -ms-flex-line-pack: justify; align-content: space-between; }\n .content-around-m { -ms-flex-line-pack: distribute; align-content: space-around; }\n .content-stretch-m { -ms-flex-line-pack: stretch; align-content: stretch; }\n .order-0-m { -webkit-box-ordinal-group: 1; -ms-flex-order: 0; order: 0; }\n .order-1-m { -webkit-box-ordinal-group: 2; -ms-flex-order: 1; order: 1; }\n .order-2-m { -webkit-box-ordinal-group: 3; -ms-flex-order: 2; order: 2; }\n .order-3-m { -webkit-box-ordinal-group: 4; -ms-flex-order: 3; order: 3; }\n .order-4-m { -webkit-box-ordinal-group: 5; -ms-flex-order: 4; order: 4; }\n .order-5-m { -webkit-box-ordinal-group: 6; -ms-flex-order: 5; order: 5; }\n .order-6-m { -webkit-box-ordinal-group: 7; -ms-flex-order: 6; order: 6; }\n .order-7-m { -webkit-box-ordinal-group: 8; -ms-flex-order: 7; order: 7; }\n .order-8-m { -webkit-box-ordinal-group: 9; -ms-flex-order: 8; order: 8; }\n .order-last-m { -webkit-box-ordinal-group: 100000; -ms-flex-order: 99999; order: 99999; }\n .flex-grow-0-m { -webkit-box-flex: 0; -ms-flex-positive: 0; flex-grow: 0; }\n .flex-grow-1-m { -webkit-box-flex: 1; -ms-flex-positive: 1; flex-grow: 1; }\n .flex-shrink-0-m { -ms-flex-negative: 0; flex-shrink: 0; }\n .flex-shrink-1-m { -ms-flex-negative: 1; flex-shrink: 1; }\n .fl-m { float: left; display: inline; }\n .fr-m { float: right; display: inline; }\n .fn-m { float: none; }\n .i-m { font-style: italic; }\n .fs-normal-m { font-style: normal; }\n .normal-m { font-weight: normal; }\n .b-m { font-weight: bold; }\n .fw1-m { font-weight: 100; }\n .fw2-m { font-weight: 200; }\n .fw3-m { font-weight: 300; }\n .fw4-m { font-weight: 400; }\n .fw5-m { font-weight: 500; }\n .fw6-m { font-weight: 600; }\n .fw7-m { font-weight: 700; }\n .fw8-m { font-weight: 800; }\n .fw9-m { font-weight: 900; }\n .h1-m { height: 1rem; }\n .h2-m { height: 2rem; }\n .h3-m { height: 4rem; }\n .h4-m { height: 8rem; }\n .h5-m { height: 16rem; }\n .h-25-m { height: 25%; }\n .h-50-m { height: 50%; }\n .h-75-m { height: 75%; }\n .h-100-m { height: 100%; }\n .min-h-100-m { min-height: 100%; }\n .vh-25-m { height: 25vh; }\n .vh-50-m { height: 50vh; }\n .vh-75-m { height: 75vh; }\n .vh-100-m { height: 100vh; }\n .min-vh-100-m { min-height: 100vh; }\n .h-auto-m { height: auto; }\n .h-inherit-m { height: inherit; }\n .tracked-m { letter-spacing: .1em; }\n .tracked-tight-m { letter-spacing: -.05em; }\n .tracked-mega-m { letter-spacing: .25em; }\n .lh-solid-m { line-height: 1; }\n .lh-title-m { line-height: 1.25; }\n .lh-copy-m { line-height: 1.5; }\n .mw-100-m { max-width: 100%; }\n .mw1-m { max-width: 1rem; }\n .mw2-m { max-width: 2rem; }\n .mw3-m { max-width: 4rem; }\n .mw4-m { max-width: 8rem; }\n .mw5-m { max-width: 16rem; }\n .mw6-m { max-width: 32rem; }\n .mw7-m { max-width: 48rem; }\n .mw8-m { max-width: 64rem; }\n .mw9-m { max-width: 96rem; }\n .mw-none-m { max-width: none; }\n .w1-m { width: 1rem; }\n .w2-m { width: 2rem; }\n .w3-m { width: 4rem; }\n .w4-m { width: 8rem; }\n .w5-m { width: 16rem; }\n .w-10-m { width: 10%; }\n .w-20-m { width: 20%; }\n .w-25-m { width: 25%; }\n .w-30-m { width: 30%; }\n .w-33-m { width: 33%; }\n .w-34-m { width: 34%; }\n .w-40-m { width: 40%; }\n .w-50-m { width: 50%; }\n .w-60-m { width: 60%; }\n .w-70-m { width: 70%; }\n .w-75-m { width: 75%; }\n .w-80-m { width: 80%; }\n .w-90-m { width: 90%; }\n .w-100-m { width: 100%; }\n .w-third-m { width: calc( 100% / 3 ); }\n .w-two-thirds-m { width: calc( 100% / 1.5 ); }\n .w-auto-m { width: auto; }\n .overflow-visible-m { overflow: visible; }\n .overflow-hidden-m { overflow: hidden; }\n .overflow-scroll-m { overflow: scroll; }\n .overflow-auto-m { overflow: auto; }\n .overflow-x-visible-m { overflow-x: visible; }\n .overflow-x-hidden-m { overflow-x: hidden; }\n .overflow-x-scroll-m { overflow-x: scroll; }\n .overflow-x-auto-m { overflow-x: auto; }\n .overflow-y-visible-m { overflow-y: visible; }\n .overflow-y-hidden-m { overflow-y: hidden; }\n .overflow-y-scroll-m { overflow-y: scroll; }\n .overflow-y-auto-m { overflow-y: auto; }\n .static-m { position: static; }\n .relative-m { position: relative; }\n .absolute-m { position: absolute; }\n .fixed-m { position: fixed; }\n .rotate-45-m { -webkit-transform: rotate( 45deg ); transform: rotate( 45deg ); }\n .rotate-90-m { -webkit-transform: rotate( 90deg ); transform: rotate( 90deg ); }\n .rotate-135-m { -webkit-transform: rotate( 135deg ); transform: rotate( 135deg ); }\n .rotate-180-m { -webkit-transform: rotate( 180deg ); transform: rotate( 180deg ); }\n .rotate-225-m { -webkit-transform: rotate( 225deg ); transform: rotate( 225deg ); }\n .rotate-270-m { -webkit-transform: rotate( 270deg ); transform: rotate( 270deg ); }\n .rotate-315-m { -webkit-transform: rotate( 315deg ); transform: rotate( 315deg ); }\n .pa0-m { padding: 0; }\n .pa1-m { padding: .25rem; }\n .pa2-m { padding: .5rem; }\n .pa3-m { padding: 1rem; }\n .pa4-m { padding: 2rem; }\n .pa5-m { padding: 4rem; }\n .pa6-m { padding: 8rem; }\n .pa7-m { padding: 16rem; }\n .pl0-m { padding-left: 0; }\n .pl1-m { padding-left: .25rem; }\n .pl2-m { padding-left: .5rem; }\n .pl3-m { padding-left: 1rem; }\n .pl4-m { padding-left: 2rem; }\n .pl5-m { padding-left: 4rem; }\n .pl6-m { padding-left: 8rem; }\n .pl7-m { padding-left: 16rem; }\n .pr0-m { padding-right: 0; }\n .pr1-m { padding-right: .25rem; }\n .pr2-m { padding-right: .5rem; }\n .pr3-m { padding-right: 1rem; }\n .pr4-m { padding-right: 2rem; }\n .pr5-m { padding-right: 4rem; }\n .pr6-m { padding-right: 8rem; }\n .pr7-m { padding-right: 16rem; }\n .pb0-m { padding-bottom: 0; }\n .pb1-m { padding-bottom: .25rem; }\n .pb2-m { padding-bottom: .5rem; }\n .pb3-m { padding-bottom: 1rem; }\n .pb4-m { padding-bottom: 2rem; }\n .pb5-m { padding-bottom: 4rem; }\n .pb6-m { padding-bottom: 8rem; }\n .pb7-m { padding-bottom: 16rem; }\n .pt0-m { padding-top: 0; }\n .pt1-m { padding-top: .25rem; }\n .pt2-m { padding-top: .5rem; }\n .pt3-m { padding-top: 1rem; }\n .pt4-m { padding-top: 2rem; }\n .pt5-m { padding-top: 4rem; }\n .pt6-m { padding-top: 8rem; }\n .pt7-m { padding-top: 16rem; }\n .pv0-m { padding-top: 0; padding-bottom: 0; }\n .pv1-m { padding-top: .25rem; padding-bottom: .25rem; }\n .pv2-m { padding-top: .5rem; padding-bottom: .5rem; }\n .pv3-m { padding-top: 1rem; padding-bottom: 1rem; }\n .pv4-m { padding-top: 2rem; padding-bottom: 2rem; }\n .pv5-m { padding-top: 4rem; padding-bottom: 4rem; }\n .pv6-m { padding-top: 8rem; padding-bottom: 8rem; }\n .pv7-m { padding-top: 16rem; padding-bottom: 16rem; }\n .ph0-m { padding-left: 0; padding-right: 0; }\n .ph1-m { padding-left: .25rem; padding-right: .25rem; }\n .ph2-m { padding-left: .5rem; padding-right: .5rem; }\n .ph3-m { padding-left: 1rem; padding-right: 1rem; }\n .ph4-m { padding-left: 2rem; padding-right: 2rem; }\n .ph5-m { padding-left: 4rem; padding-right: 4rem; }\n .ph6-m { padding-left: 8rem; padding-right: 8rem; }\n .ph7-m { padding-left: 16rem; padding-right: 16rem; }\n .ma0-m { margin: 0; }\n .ma1-m { margin: .25rem; }\n .ma2-m { margin: .5rem; }\n .ma3-m { margin: 1rem; }\n .ma4-m { margin: 2rem; }\n .ma5-m { margin: 4rem; }\n .ma6-m { margin: 8rem; }\n .ma7-m { margin: 16rem; }\n .ml0-m { margin-left: 0; }\n .ml1-m { margin-left: .25rem; }\n .ml2-m { margin-left: .5rem; }\n .ml3-m { margin-left: 1rem; }\n .ml4-m { margin-left: 2rem; }\n .ml5-m { margin-left: 4rem; }\n .ml6-m { margin-left: 8rem; }\n .ml7-m { margin-left: 16rem; }\n .mr0-m { margin-right: 0; }\n .mr1-m { margin-right: .25rem; }\n .mr2-m { margin-right: .5rem; }\n .mr3-m { margin-right: 1rem; }\n .mr4-m { margin-right: 2rem; }\n .mr5-m { margin-right: 4rem; }\n .mr6-m { margin-right: 8rem; }\n .mr7-m { margin-right: 16rem; }\n .mb0-m { margin-bottom: 0; }\n .mb1-m { margin-bottom: .25rem; }\n .mb2-m { margin-bottom: .5rem; }\n .mb3-m { margin-bottom: 1rem; }\n .mb4-m { margin-bottom: 2rem; }\n .mb5-m { margin-bottom: 4rem; }\n .mb6-m { margin-bottom: 8rem; }\n .mb7-m { margin-bottom: 16rem; }\n .mt0-m { margin-top: 0; }\n .mt1-m { margin-top: .25rem; }\n .mt2-m { margin-top: .5rem; }\n .mt3-m { margin-top: 1rem; }\n .mt4-m { margin-top: 2rem; }\n .mt5-m { margin-top: 4rem; }\n .mt6-m { margin-top: 8rem; }\n .mt7-m { margin-top: 16rem; }\n .mv0-m { margin-top: 0; margin-bottom: 0; }\n .mv1-m { margin-top: .25rem; margin-bottom: .25rem; }\n .mv2-m { margin-top: .5rem; margin-bottom: .5rem; }\n .mv3-m { margin-top: 1rem; margin-bottom: 1rem; }\n .mv4-m { margin-top: 2rem; margin-bottom: 2rem; }\n .mv5-m { margin-top: 4rem; margin-bottom: 4rem; }\n .mv6-m { margin-top: 8rem; margin-bottom: 8rem; }\n .mv7-m { margin-top: 16rem; margin-bottom: 16rem; }\n .mh0-m { margin-left: 0; margin-right: 0; }\n .mh1-m { margin-left: .25rem; margin-right: .25rem; }\n .mh2-m { margin-left: .5rem; margin-right: .5rem; }\n .mh3-m { margin-left: 1rem; margin-right: 1rem; }\n .mh4-m { margin-left: 2rem; margin-right: 2rem; }\n .mh5-m { margin-left: 4rem; margin-right: 4rem; }\n .mh6-m { margin-left: 8rem; margin-right: 8rem; }\n .mh7-m { margin-left: 16rem; margin-right: 16rem; }\n .na1-m { margin: -.25rem; }\n .na2-m { margin: -.5rem; }\n .na3-m { margin: -1rem; }\n .na4-m { margin: -2rem; }\n .na5-m { margin: -4rem; }\n .na6-m { margin: -8rem; }\n .na7-m { margin: -16rem; }\n .nl1-m { margin-left: -.25rem; }\n .nl2-m { margin-left: -.5rem; }\n .nl3-m { margin-left: -1rem; }\n .nl4-m { margin-left: -2rem; }\n .nl5-m { margin-left: -4rem; }\n .nl6-m { margin-left: -8rem; }\n .nl7-m { margin-left: -16rem; }\n .nr1-m { margin-right: -.25rem; }\n .nr2-m { margin-right: -.5rem; }\n .nr3-m { margin-right: -1rem; }\n .nr4-m { margin-right: -2rem; }\n .nr5-m { margin-right: -4rem; }\n .nr6-m { margin-right: -8rem; }\n .nr7-m { margin-right: -16rem; }\n .nb1-m { margin-bottom: -.25rem; }\n .nb2-m { margin-bottom: -.5rem; }\n .nb3-m { margin-bottom: -1rem; }\n .nb4-m { margin-bottom: -2rem; }\n .nb5-m { margin-bottom: -4rem; }\n .nb6-m { margin-bottom: -8rem; }\n .nb7-m { margin-bottom: -16rem; }\n .nt1-m { margin-top: -.25rem; }\n .nt2-m { margin-top: -.5rem; }\n .nt3-m { margin-top: -1rem; }\n .nt4-m { margin-top: -2rem; }\n .nt5-m { margin-top: -4rem; }\n .nt6-m { margin-top: -8rem; }\n .nt7-m { margin-top: -16rem; }\n .strike-m { text-decoration: line-through; }\n .underline-m { text-decoration: underline; }\n .no-underline-m { text-decoration: none; }\n .tl-m { text-align: left; }\n .tr-m { text-align: right; }\n .tc-m { text-align: center; }\n .tj-m { text-align: justify; }\n .ttc-m { text-transform: capitalize; }\n .ttl-m { text-transform: lowercase; }\n .ttu-m { text-transform: uppercase; }\n .ttn-m { text-transform: none; }\n .f-6-m, .f-headline-m { font-size: 6rem; }\n .f-5-m, .f-subheadline-m { font-size: 5rem; }\n .f1-m { font-size: 3rem; }\n .f2-m { font-size: 2.25rem; }\n .f3-m { font-size: 1.5rem; }\n .f4-m { font-size: 1.25rem; }\n .f5-m { font-size: 1rem; }\n .f6-m { font-size: .875rem; }\n .f7-m { font-size: .75rem; }\n .measure-m { max-width: 30em; }\n .measure-wide-m { max-width: 34em; }\n .measure-narrow-m { max-width: 20em; }\n .indent-m { text-indent: 1em; margin-top: 0; margin-bottom: 0; }\n .small-caps-m { font-variant: small-caps; }\n .truncate-m { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n .center-m { margin-right: auto; margin-left: auto; }\n .mr-auto-m { margin-right: auto; }\n .ml-auto-m { margin-left: auto; }\n .clip-m { position: fixed !important; position: absolute !important; clip: rect( 1px 1px 1px 1px ); /* IE6, IE7 */ clip: rect( 1px, 1px, 1px, 1px ); }\n .ws-normal-m { white-space: normal; }\n .nowrap-m { white-space: nowrap; }\n .pre-m { white-space: pre; }\n .v-base-m { vertical-align: baseline; }\n .v-mid-m { vertical-align: middle; }\n .v-top-m { vertical-align: top; }\n .v-btm-m { vertical-align: bottom; }\n}\n@media screen and (min-width: 60em) {\n .aspect-ratio-l { height: 0; position: relative; }\n .aspect-ratio--16x9-l { padding-bottom: 56.25%; }\n .aspect-ratio--9x16-l { padding-bottom: 177.77%; }\n .aspect-ratio--4x3-l { padding-bottom: 75%; }\n .aspect-ratio--3x4-l { padding-bottom: 133.33%; }\n .aspect-ratio--6x4-l { padding-bottom: 66.6%; }\n .aspect-ratio--4x6-l { padding-bottom: 150%; }\n .aspect-ratio--8x5-l { padding-bottom: 62.5%; }\n .aspect-ratio--5x8-l { padding-bottom: 160%; }\n .aspect-ratio--7x5-l { padding-bottom: 71.42%; }\n .aspect-ratio--5x7-l { padding-bottom: 140%; }\n .aspect-ratio--1x1-l { padding-bottom: 100%; }\n .aspect-ratio--object-l { position: absolute; top: 0; right: 0; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 100; }\n .cover-l { background-size: cover !important; }\n .contain-l { background-size: contain !important; }\n .bg-center-l { background-repeat: no-repeat; background-position: center center; }\n .bg-top-l { background-repeat: no-repeat; background-position: top center; }\n .bg-right-l { background-repeat: no-repeat; background-position: center right; }\n .bg-bottom-l { background-repeat: no-repeat; background-position: bottom center; }\n .bg-left-l { background-repeat: no-repeat; background-position: center left; }\n .outline-l { outline: 1px solid; }\n .outline-transparent-l { outline: 1px solid transparent; }\n .outline-0-l { outline: 0; }\n .ba-l { border-style: solid; border-width: 1px; }\n .bt-l { border-top-style: solid; border-top-width: 1px; }\n .br-l { border-right-style: solid; border-right-width: 1px; }\n .bb-l { border-bottom-style: solid; border-bottom-width: 1px; }\n .bl-l { border-left-style: solid; border-left-width: 1px; }\n .bn-l { border-style: none; border-width: 0; }\n .br0-l { border-radius: 0; }\n .br1-l { border-radius: .125rem; }\n .br2-l { border-radius: .25rem; }\n .br3-l { border-radius: .5rem; }\n .br4-l { border-radius: 1rem; }\n .br-100-l { border-radius: 100%; }\n .br-pill-l { border-radius: 9999px; }\n .br--bottom-l { border-top-left-radius: 0; border-top-right-radius: 0; }\n .br--top-l { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }\n .br--right-l { border-top-left-radius: 0; border-bottom-left-radius: 0; }\n .br--left-l { border-top-right-radius: 0; border-bottom-right-radius: 0; }\n .b--dotted-l { border-style: dotted; }\n .b--dashed-l { border-style: dashed; }\n .b--solid-l { border-style: solid; }\n .b--none-l { border-style: none; }\n .bw0-l { border-width: 0; }\n .bw1-l { border-width: .125rem; }\n .bw2-l { border-width: .25rem; }\n .bw3-l { border-width: .5rem; }\n .bw4-l { border-width: 1rem; }\n .bw5-l { border-width: 2rem; }\n .bt-0-l { border-top-width: 0; }\n .br-0-l { border-right-width: 0; }\n .bb-0-l { border-bottom-width: 0; }\n .bl-0-l { border-left-width: 0; }\n .shadow-1-l { box-shadow: 0 0 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-2-l { box-shadow: 0 0 8px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-3-l { box-shadow: 2px 2px 4px 2px rgba( 0, 0, 0, .2 ); }\n .shadow-4-l { box-shadow: 2px 2px 8px 0 rgba( 0, 0, 0, .2 ); }\n .shadow-5-l { box-shadow: 4px 4px 8px 0 rgba( 0, 0, 0, .2 ); }\n .top-0-l { top: 0; }\n .left-0-l { left: 0; }\n .right-0-l { right: 0; }\n .bottom-0-l { bottom: 0; }\n .top-1-l { top: 1rem; }\n .left-1-l { left: 1rem; }\n .right-1-l { right: 1rem; }\n .bottom-1-l { bottom: 1rem; }\n .top-2-l { top: 2rem; }\n .left-2-l { left: 2rem; }\n .right-2-l { right: 2rem; }\n .bottom-2-l { bottom: 2rem; }\n .top--1-l { top: -1rem; }\n .right--1-l { right: -1rem; }\n .bottom--1-l { bottom: -1rem; }\n .left--1-l { left: -1rem; }\n .top--2-l { top: -2rem; }\n .right--2-l { right: -2rem; }\n .bottom--2-l { bottom: -2rem; }\n .left--2-l { left: -2rem; }\n .absolute--fill-l { top: 0; right: 0; bottom: 0; left: 0; }\n .cl-l { clear: left; }\n .cr-l { clear: right; }\n .cb-l { clear: both; }\n .cn-l { clear: none; }\n .dn-l { display: none; }\n .di-l { display: inline; }\n .db-l { display: block; }\n .dib-l { display: inline-block; }\n .dit-l { display: inline-table; }\n .dt-l { display: table; }\n .dtc-l { display: table-cell; }\n .dt-row-l { display: table-row; }\n .dt-row-group-l { display: table-row-group; }\n .dt-column-l { display: table-column; }\n .dt-column-group-l { display: table-column-group; }\n .dt--fixed-l { table-layout: fixed; width: 100%; }\n .flex-l { display: -webkit-box; display: -ms-flexbox; display: flex; }\n .inline-flex-l { display: -webkit-inline-box; display: -ms-inline-flexbox; display: inline-flex; }\n .flex-auto-l { -webkit-box-flex: 1; -ms-flex: 1 1 auto; flex: 1 1 auto; min-width: 0; /* 1 */ min-height: 0; /* 1 */ }\n .flex-none-l { -webkit-box-flex: 0; -ms-flex: none; flex: none; }\n .flex-column-l { -webkit-box-orient: vertical; -webkit-box-direction: normal; -ms-flex-direction: column; flex-direction: column; }\n .flex-row-l { -webkit-box-orient: horizontal; -webkit-box-direction: normal; -ms-flex-direction: row; flex-direction: row; }\n .flex-wrap-l { -ms-flex-wrap: wrap; flex-wrap: wrap; }\n .flex-nowrap-l { -ms-flex-wrap: nowrap; flex-wrap: nowrap; }\n .flex-wrap-reverse-l { -ms-flex-wrap: wrap-reverse; flex-wrap: wrap-reverse; }\n .flex-column-reverse-l { -webkit-box-orient: vertical; -webkit-box-direction: reverse; -ms-flex-direction: column-reverse; flex-direction: column-reverse; }\n .flex-row-reverse-l { -webkit-box-orient: horizontal; -webkit-box-direction: reverse; -ms-flex-direction: row-reverse; flex-direction: row-reverse; }\n .items-start-l { -webkit-box-align: start; -ms-flex-align: start; align-items: flex-start; }\n .items-end-l { -webkit-box-align: end; -ms-flex-align: end; align-items: flex-end; }\n .items-center-l { -webkit-box-align: center; -ms-flex-align: center; align-items: center; }\n .items-baseline-l { -webkit-box-align: baseline; -ms-flex-align: baseline; align-items: baseline; }\n .items-stretch-l { -webkit-box-align: stretch; -ms-flex-align: stretch; align-items: stretch; }\n .self-start-l { -ms-flex-item-align: start; align-self: flex-start; }\n .self-end-l { -ms-flex-item-align: end; align-self: flex-end; }\n .self-center-l { -ms-flex-item-align: center; -ms-grid-row-align: center; align-self: center; }\n .self-baseline-l { -ms-flex-item-align: baseline; align-self: baseline; }\n .self-stretch-l { -ms-flex-item-align: stretch; -ms-grid-row-align: stretch; align-self: stretch; }\n .justify-start-l { -webkit-box-pack: start; -ms-flex-pack: start; justify-content: flex-start; }\n .justify-end-l { -webkit-box-pack: end; -ms-flex-pack: end; justify-content: flex-end; }\n .justify-center-l { -webkit-box-pack: center; -ms-flex-pack: center; justify-content: center; }\n .justify-between-l { -webkit-box-pack: justify; -ms-flex-pack: justify; justify-content: space-between; }\n .justify-around-l { -ms-flex-pack: distribute; justify-content: space-around; }\n .content-start-l { -ms-flex-line-pack: start; align-content: flex-start; }\n .content-end-l { -ms-flex-line-pack: end; align-content: flex-end; }\n .content-center-l { -ms-flex-line-pack: center; align-content: center; }\n .content-between-l { -ms-flex-line-pack: justify; align-content: space-between; }\n .content-around-l { -ms-flex-line-pack: distribute; align-content: space-around; }\n .content-stretch-l { -ms-flex-line-pack: stretch; align-content: stretch; }\n .order-0-l { -webkit-box-ordinal-group: 1; -ms-flex-order: 0; order: 0; }\n .order-1-l { -webkit-box-ordinal-group: 2; -ms-flex-order: 1; order: 1; }\n .order-2-l { -webkit-box-ordinal-group: 3; -ms-flex-order: 2; order: 2; }\n .order-3-l { -webkit-box-ordinal-group: 4; -ms-flex-order: 3; order: 3; }\n .order-4-l { -webkit-box-ordinal-group: 5; -ms-flex-order: 4; order: 4; }\n .order-5-l { -webkit-box-ordinal-group: 6; -ms-flex-order: 5; order: 5; }\n .order-6-l { -webkit-box-ordinal-group: 7; -ms-flex-order: 6; order: 6; }\n .order-7-l { -webkit-box-ordinal-group: 8; -ms-flex-order: 7; order: 7; }\n .order-8-l { -webkit-box-ordinal-group: 9; -ms-flex-order: 8; order: 8; }\n .order-last-l { -webkit-box-ordinal-group: 100000; -ms-flex-order: 99999; order: 99999; }\n .flex-grow-0-l { -webkit-box-flex: 0; -ms-flex-positive: 0; flex-grow: 0; }\n .flex-grow-1-l { -webkit-box-flex: 1; -ms-flex-positive: 1; flex-grow: 1; }\n .flex-shrink-0-l { -ms-flex-negative: 0; flex-shrink: 0; }\n .flex-shrink-1-l { -ms-flex-negative: 1; flex-shrink: 1; }\n .fl-l { float: left; display: inline; }\n .fr-l { float: right; display: inline; }\n .fn-l { float: none; }\n .i-l { font-style: italic; }\n .fs-normal-l { font-style: normal; }\n .normal-l { font-weight: normal; }\n .b-l { font-weight: bold; }\n .fw1-l { font-weight: 100; }\n .fw2-l { font-weight: 200; }\n .fw3-l { font-weight: 300; }\n .fw4-l { font-weight: 400; }\n .fw5-l { font-weight: 500; }\n .fw6-l { font-weight: 600; }\n .fw7-l { font-weight: 700; }\n .fw8-l { font-weight: 800; }\n .fw9-l { font-weight: 900; }\n .h1-l { height: 1rem; }\n .h2-l { height: 2rem; }\n .h3-l { height: 4rem; }\n .h4-l { height: 8rem; }\n .h5-l { height: 16rem; }\n .h-25-l { height: 25%; }\n .h-50-l { height: 50%; }\n .h-75-l { height: 75%; }\n .h-100-l { height: 100%; }\n .min-h-100-l { min-height: 100%; }\n .vh-25-l { height: 25vh; }\n .vh-50-l { height: 50vh; }\n .vh-75-l { height: 75vh; }\n .vh-100-l { height: 100vh; }\n .min-vh-100-l { min-height: 100vh; }\n .h-auto-l { height: auto; }\n .h-inherit-l { height: inherit; }\n .tracked-l { letter-spacing: .1em; }\n .tracked-tight-l { letter-spacing: -.05em; }\n .tracked-mega-l { letter-spacing: .25em; }\n .lh-solid-l { line-height: 1; }\n .lh-title-l { line-height: 1.25; }\n .lh-copy-l { line-height: 1.5; }\n .mw-100-l { max-width: 100%; }\n .mw1-l { max-width: 1rem; }\n .mw2-l { max-width: 2rem; }\n .mw3-l { max-width: 4rem; }\n .mw4-l { max-width: 8rem; }\n .mw5-l { max-width: 16rem; }\n .mw6-l { max-width: 32rem; }\n .mw7-l { max-width: 48rem; }\n .mw8-l { max-width: 64rem; }\n .mw9-l { max-width: 96rem; }\n .mw-none-l { max-width: none; }\n .w1-l { width: 1rem; }\n .w2-l { width: 2rem; }\n .w3-l { width: 4rem; }\n .w4-l { width: 8rem; }\n .w5-l { width: 16rem; }\n .w-10-l { width: 10%; }\n .w-20-l { width: 20%; }\n .w-25-l { width: 25%; }\n .w-30-l { width: 30%; }\n .w-33-l { width: 33%; }\n .w-34-l { width: 34%; }\n .w-40-l { width: 40%; }\n .w-50-l { width: 50%; }\n .w-60-l { width: 60%; }\n .w-70-l { width: 70%; }\n .w-75-l { width: 75%; }\n .w-80-l { width: 80%; }\n .w-90-l { width: 90%; }\n .w-100-l { width: 100%; }\n .w-third-l { width: calc( 100% / 3 ); }\n .w-two-thirds-l { width: calc( 100% / 1.5 ); }\n .w-auto-l { width: auto; }\n .overflow-visible-l { overflow: visible; }\n .overflow-hidden-l { overflow: hidden; }\n .overflow-scroll-l { overflow: scroll; }\n .overflow-auto-l { overflow: auto; }\n .overflow-x-visible-l { overflow-x: visible; }\n .overflow-x-hidden-l { overflow-x: hidden; }\n .overflow-x-scroll-l { overflow-x: scroll; }\n .overflow-x-auto-l { overflow-x: auto; }\n .overflow-y-visible-l { overflow-y: visible; }\n .overflow-y-hidden-l { overflow-y: hidden; }\n .overflow-y-scroll-l { overflow-y: scroll; }\n .overflow-y-auto-l { overflow-y: auto; }\n .static-l { position: static; }\n .relative-l { position: relative; }\n .absolute-l { position: absolute; }\n .fixed-l { position: fixed; }\n .rotate-45-l { -webkit-transform: rotate( 45deg ); transform: rotate( 45deg ); }\n .rotate-90-l { -webkit-transform: rotate( 90deg ); transform: rotate( 90deg ); }\n .rotate-135-l { -webkit-transform: rotate( 135deg ); transform: rotate( 135deg ); }\n .rotate-180-l { -webkit-transform: rotate( 180deg ); transform: rotate( 180deg ); }\n .rotate-225-l { -webkit-transform: rotate( 225deg ); transform: rotate( 225deg ); }\n .rotate-270-l { -webkit-transform: rotate( 270deg ); transform: rotate( 270deg ); }\n .rotate-315-l { -webkit-transform: rotate( 315deg ); transform: rotate( 315deg ); }\n .pa0-l { padding: 0; }\n .pa1-l { padding: .25rem; }\n .pa2-l { padding: .5rem; }\n .pa3-l { padding: 1rem; }\n .pa4-l { padding: 2rem; }\n .pa5-l { padding: 4rem; }\n .pa6-l { padding: 8rem; }\n .pa7-l { padding: 16rem; }\n .pl0-l { padding-left: 0; }\n .pl1-l { padding-left: .25rem; }\n .pl2-l { padding-left: .5rem; }\n .pl3-l { padding-left: 1rem; }\n .pl4-l { padding-left: 2rem; }\n .pl5-l { padding-left: 4rem; }\n .pl6-l { padding-left: 8rem; }\n .pl7-l { padding-left: 16rem; }\n .pr0-l { padding-right: 0; }\n .pr1-l { padding-right: .25rem; }\n .pr2-l { padding-right: .5rem; }\n .pr3-l { padding-right: 1rem; }\n .pr4-l { padding-right: 2rem; }\n .pr5-l { padding-right: 4rem; }\n .pr6-l { padding-right: 8rem; }\n .pr7-l { padding-right: 16rem; }\n .pb0-l { padding-bottom: 0; }\n .pb1-l { padding-bottom: .25rem; }\n .pb2-l { padding-bottom: .5rem; }\n .pb3-l { padding-bottom: 1rem; }\n .pb4-l { padding-bottom: 2rem; }\n .pb5-l { padding-bottom: 4rem; }\n .pb6-l { padding-bottom: 8rem; }\n .pb7-l { padding-bottom: 16rem; }\n .pt0-l { padding-top: 0; }\n .pt1-l { padding-top: .25rem; }\n .pt2-l { padding-top: .5rem; }\n .pt3-l { padding-top: 1rem; }\n .pt4-l { padding-top: 2rem; }\n .pt5-l { padding-top: 4rem; }\n .pt6-l { padding-top: 8rem; }\n .pt7-l { padding-top: 16rem; }\n .pv0-l { padding-top: 0; padding-bottom: 0; }\n .pv1-l { padding-top: .25rem; padding-bottom: .25rem; }\n .pv2-l { padding-top: .5rem; padding-bottom: .5rem; }\n .pv3-l { padding-top: 1rem; padding-bottom: 1rem; }\n .pv4-l { padding-top: 2rem; padding-bottom: 2rem; }\n .pv5-l { padding-top: 4rem; padding-bottom: 4rem; }\n .pv6-l { padding-top: 8rem; padding-bottom: 8rem; }\n .pv7-l { padding-top: 16rem; padding-bottom: 16rem; }\n .ph0-l { padding-left: 0; padding-right: 0; }\n .ph1-l { padding-left: .25rem; padding-right: .25rem; }\n .ph2-l { padding-left: .5rem; padding-right: .5rem; }\n .ph3-l { padding-left: 1rem; padding-right: 1rem; }\n .ph4-l { padding-left: 2rem; padding-right: 2rem; }\n .ph5-l { padding-left: 4rem; padding-right: 4rem; }\n .ph6-l { padding-left: 8rem; padding-right: 8rem; }\n .ph7-l { padding-left: 16rem; padding-right: 16rem; }\n .ma0-l { margin: 0; }\n .ma1-l { margin: .25rem; }\n .ma2-l { margin: .5rem; }\n .ma3-l { margin: 1rem; }\n .ma4-l { margin: 2rem; }\n .ma5-l { margin: 4rem; }\n .ma6-l { margin: 8rem; }\n .ma7-l { margin: 16rem; }\n .ml0-l { margin-left: 0; }\n .ml1-l { margin-left: .25rem; }\n .ml2-l { margin-left: .5rem; }\n .ml3-l { margin-left: 1rem; }\n .ml4-l { margin-left: 2rem; }\n .ml5-l { margin-left: 4rem; }\n .ml6-l { margin-left: 8rem; }\n .ml7-l { margin-left: 16rem; }\n .mr0-l { margin-right: 0; }\n .mr1-l { margin-right: .25rem; }\n .mr2-l { margin-right: .5rem; }\n .mr3-l { margin-right: 1rem; }\n .mr4-l { margin-right: 2rem; }\n .mr5-l { margin-right: 4rem; }\n .mr6-l { margin-right: 8rem; }\n .mr7-l { margin-right: 16rem; }\n .mb0-l { margin-bottom: 0; }\n .mb1-l { margin-bottom: .25rem; }\n .mb2-l { margin-bottom: .5rem; }\n .mb3-l { margin-bottom: 1rem; }\n .mb4-l { margin-bottom: 2rem; }\n .mb5-l { margin-bottom: 4rem; }\n .mb6-l { margin-bottom: 8rem; }\n .mb7-l { margin-bottom: 16rem; }\n .mt0-l { margin-top: 0; }\n .mt1-l { margin-top: .25rem; }\n .mt2-l { margin-top: .5rem; }\n .mt3-l { margin-top: 1rem; }\n .mt4-l { margin-top: 2rem; }\n .mt5-l { margin-top: 4rem; }\n .mt6-l { margin-top: 8rem; }\n .mt7-l { margin-top: 16rem; }\n .mv0-l { margin-top: 0; margin-bottom: 0; }\n .mv1-l { margin-top: .25rem; margin-bottom: .25rem; }\n .mv2-l { margin-top: .5rem; margin-bottom: .5rem; }\n .mv3-l { margin-top: 1rem; margin-bottom: 1rem; }\n .mv4-l { margin-top: 2rem; margin-bottom: 2rem; }\n .mv5-l { margin-top: 4rem; margin-bottom: 4rem; }\n .mv6-l { margin-top: 8rem; margin-bottom: 8rem; }\n .mv7-l { margin-top: 16rem; margin-bottom: 16rem; }\n .mh0-l { margin-left: 0; margin-right: 0; }\n .mh1-l { margin-left: .25rem; margin-right: .25rem; }\n .mh2-l { margin-left: .5rem; margin-right: .5rem; }\n .mh3-l { margin-left: 1rem; margin-right: 1rem; }\n .mh4-l { margin-left: 2rem; margin-right: 2rem; }\n .mh5-l { margin-left: 4rem; margin-right: 4rem; }\n .mh6-l { margin-left: 8rem; margin-right: 8rem; }\n .mh7-l { margin-left: 16rem; margin-right: 16rem; }\n .na1-l { margin: -.25rem; }\n .na2-l { margin: -.5rem; }\n .na3-l { margin: -1rem; }\n .na4-l { margin: -2rem; }\n .na5-l { margin: -4rem; }\n .na6-l { margin: -8rem; }\n .na7-l { margin: -16rem; }\n .nl1-l { margin-left: -.25rem; }\n .nl2-l { margin-left: -.5rem; }\n .nl3-l { margin-left: -1rem; }\n .nl4-l { margin-left: -2rem; }\n .nl5-l { margin-left: -4rem; }\n .nl6-l { margin-left: -8rem; }\n .nl7-l { margin-left: -16rem; }\n .nr1-l { margin-right: -.25rem; }\n .nr2-l { margin-right: -.5rem; }\n .nr3-l { margin-right: -1rem; }\n .nr4-l { margin-right: -2rem; }\n .nr5-l { margin-right: -4rem; }\n .nr6-l { margin-right: -8rem; }\n .nr7-l { margin-right: -16rem; }\n .nb1-l { margin-bottom: -.25rem; }\n .nb2-l { margin-bottom: -.5rem; }\n .nb3-l { margin-bottom: -1rem; }\n .nb4-l { margin-bottom: -2rem; }\n .nb5-l { margin-bottom: -4rem; }\n .nb6-l { margin-bottom: -8rem; }\n .nb7-l { margin-bottom: -16rem; }\n .nt1-l { margin-top: -.25rem; }\n .nt2-l { margin-top: -.5rem; }\n .nt3-l { margin-top: -1rem; }\n .nt4-l { margin-top: -2rem; }\n .nt5-l { margin-top: -4rem; }\n .nt6-l { margin-top: -8rem; }\n .nt7-l { margin-top: -16rem; }\n .strike-l { text-decoration: line-through; }\n .underline-l { text-decoration: underline; }\n .no-underline-l { text-decoration: none; }\n .tl-l { text-align: left; }\n .tr-l { text-align: right; }\n .tc-l { text-align: center; }\n .tj-l { text-align: justify; }\n .ttc-l { text-transform: capitalize; }\n .ttl-l { text-transform: lowercase; }\n .ttu-l { text-transform: uppercase; }\n .ttn-l { text-transform: none; }\n .f-6-l, .f-headline-l { font-size: 6rem; }\n .f-5-l, .f-subheadline-l { font-size: 5rem; }\n .f1-l { font-size: 3rem; }\n .f2-l { font-size: 2.25rem; }\n .f3-l { font-size: 1.5rem; }\n .f4-l { font-size: 1.25rem; }\n .f5-l { font-size: 1rem; }\n .f6-l { font-size: .875rem; }\n .f7-l { font-size: .75rem; }\n .measure-l { max-width: 30em; }\n .measure-wide-l { max-width: 34em; }\n .measure-narrow-l { max-width: 20em; }\n .indent-l { text-indent: 1em; margin-top: 0; margin-bottom: 0; }\n .small-caps-l { font-variant: small-caps; }\n .truncate-l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n .center-l { margin-right: auto; margin-left: auto; }\n .mr-auto-l { margin-right: auto; }\n .ml-auto-l { margin-left: auto; }\n .clip-l { position: fixed !important; position: absolute !important; clip: rect( 1px 1px 1px 1px ); /* IE6, IE7 */ clip: rect( 1px, 1px, 1px, 1px ); }\n .ws-normal-l { white-space: normal; }\n .nowrap-l { white-space: nowrap; }\n .pre-l { white-space: pre; }\n .v-base-l { vertical-align: baseline; }\n .v-mid-l { vertical-align: middle; }\n .v-top-l { vertical-align: top; }\n .v-btm-l { vertical-align: bottom; }\n}\n\n";
/*
 * Returns a javascript representation from a tachyons string
 */
function getJSObjectRules (tachyons, cb) {
  getCSSRules(tachyons, (err, ruleObj) => {
    cb(null, {
      defaultRules: getRulesJs(ruleObj.defaultRules),
      nsRules: getRulesJs(ruleObj.nsRules),
      mRules: getRulesJs(ruleObj.mRules),
      lRules: getRulesJs(ruleObj.lRules)
    })
  })
}

function getCSSRules (tachyons, cb) {
  const defaultRules = []
  const atoms = tachyons.trim().split(' ')
  const nsRules = []
  const mRules = []
  const lRules = []

  const fstream = intoStream(tachyonsStr)
  fstream.pipe(split()).pipe(extractRules(atoms, defaultRules, nsRules, mRules, lRules))

  fstream.on('end', function (err) {
    if (err) {
      return cb(err)
    }
    cb(null, {
      defaultRules: defaultRules,
      nsRules: nsRules,
      mRules: mRules,
      lRules: lRules
    })
  })
}

/* Returns a stream that adds the rule to its corresponding array
 * depending on the atom name
 */
const extractRules = function (atoms, defaultRules, nsRules, mRules, lRules) {
  return through2(function (d, enc, next) {
    const self = this
    const classd = d.toString()
    const exp = /(\.[^\{]+)\s\{(.+)\}/
    const m = classd.match(exp)
    if (m === null) {
      return next()
    }
    var ruleset

    const p1 = m[1]
    const p2 = m[2]

    // First part contains the class declaration
    // can be multiple classess '.c1,.c2'
    // Second part contains rules name:value; name:value;

    // Check if the current declaration contains any of the classes
    const classess = p1.split(' ')
    const declrules = p2.split(';')
    classess.forEach(function (cl) {
      const cname = cl.replace('.', '')
      if (cname.endsWith('-ns')) {
        ruleset = nsRules
      } else if (cname.endsWith('-m')) {
        ruleset = mRules
      } else if (cname.endsWith('-l')) {
        ruleset = lRules
      } else {
        ruleset = defaultRules
      }

      if (atoms.indexOf(cname) >= 0) {
     // atom found, save rules
        declrules.forEach(function (drule) {
          drule = drule.trim()
          self.push(drule)
          ruleset.push(drule)
        })
      }
    })

    // We have the rules that apply to this class declaration. continue
    next(null)
  })
}

function printAllRules (format) {
  const printRules = format === 'js' ? printRulesJs : printRules
  console.log('Default')
  printRules(rules)

  console.log('Not small')
  printRules(rulesns)

  console.log('Medium')
  printRules(rulesm)

  console.log('Large')
  printRules(rulesl)
}

function toJSProperty (rule) {

}

function getRulesJs (rules) {
  const validRules = rules.filter((e) => { return e && e.trim().length > 0 })
  const obj = {}
  validRules.forEach((rule, ix) => {
    const parts = rule.split(': ')
    const prop = toJSNameFromCSS(parts[0])
    const val = parts[1]
    obj[prop] = val
  })
  return obj
}

/* convert the css property name to its js equivalent */
function toJSNameFromCSS (prop) {
    // background-size => backgroundSize
  const parts = prop.split('-').map(function (e, ix) {
    if (ix > 0) {
      return e.charAt(0).toUpperCase() + e.slice(1)
    }
    return e
  })

  return parts.join('')
}
function getCSSFormat (tachyons, cb) {
  function formatRule (rules) {
    let astr = []
    astr.push('{')
    const validRules = rules.filter((e) => { return e.trim().length > 0 })
    validRules.forEach((rule) => {
      const parts = rule.split(': ')
      const prop = parts[0]
      const val = parts[1]
      const frule = prop + ': ' + val + ';'
      astr.push(frule)
    })
    astr.push('}')
    return astr.join(' ')
  }
  getCSSRules(tachyons, (err, rules) => {
    cb(null, {
      defaultRules: formatRule(rules.defaultRules),
      nsRules: formatRule(rules.nsRules),
      mRules: formatRule(rules.mRules),
      lRules: formatRule(rules.lRules)
    })
  })
}
function printRules (rules) {
  console.log('{')
  rules.forEach((rule) => {
    if (rule && rule.trim().length > 0) {
      console.log(rule.trim() + ';')
    }
  })
  console.log('}')
}

function processString (tachyons, options, cb) {
  if (options.js) {
    var result = []
    getJSObjectRules(tachyons, function (err, obj) {
      result.push('->Defaults:')
      result.push(util.inspect(obj.defaultRules, false, null))
      if (Object.keys(obj.nsRules).length > 0) {
        result.push('->Not small:')
        result.push(util.inspect(obj.nsRules, false, null))
      }
      if (Object.keys(obj.mRules).length > 0) {
        result.push('->Medium:')
        result.push(util.inspect(obj.mRules, false, null))
      }
      if (Object.keys(obj.lRules).length > 0) {
        result.push('->Large:')
        result.push(util.inspect(obj.lRules, false, null))
      }
      cb(null, result.join('\n'))
    })
  } else {
    getCSSFormat(tachyons, function (err, obj) {
      var result = []
        result.push(obj.defaultRules)
      if (obj.nsRules.length > 3) {
        result.push('--- Not small:')
        result.push(obj.nsRules)
      }
      if (obj.mRules.length > 3) {
        result.push('---- Medium:')
        result.push(obj.mRules)
      }
      if (obj.lRules.length > 3) {
        result.push('---- Large:')
        result.push(obj.lRules)
      }
      cb(null, result.join('\n\n'))
    })
  }
}
module.exports.process = processString;
module.exports.getCSSRules = getCSSRules;
module.exports.getJSObjectRules = getJSObjectRules;
module.exports.getCSSFormat = getCSSFormat;

},{"end-of-stream":5,"into-stream":10,"join-stream":12,"path":16,"split":34,"through2":38,"util":42}]},{},[45]);
