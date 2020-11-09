/**
 *
 *    Copyright (c) 2020 Silicon Labs
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

const templateUtil = require('./template-util.js')
const queryPackage = require('../db/query-package.js')

/**
 * This module contains the API for templating. For more detailed instructions, read {@tutorial template-tutorial}
 *
 * @module Templating API: toplevel utility helpers
 */

/**
 * Produces the top-of-the-file header for a C file.
 *
 * @returns The header content
 */
function zap_header() {
  return `// This file is generated by ZCL Advanced Platform generator. Please don't edit manually.`
}

/**
 * Simple helper that produces an approved size of identation.
 *
 * @returns whitespace that is the identation.
 */
function ident(cnt) {
  if (Number.isInteger(cnt)) {
    return '  '.repeat(cnt)
  } else {
    return '  '
  }
}

/**
 * Block helper that iterates over the package options of a given category.
 *
 * @param {*} category
 * @param {*} options
 */
function template_options(options) {
  return templateUtil
    .ensureTemplatePackageId(this)
    .then((packageId) =>
      queryPackage.selectAllOptionsValues(
        this.global.db,
        packageId,
        options.hash.category
      )
    )
    .then((ens) => templateUtil.collectBlocks(ens, options, this))
}

/**
 * Inside an iterator, this helper allows you to specify the content that will be output only
 * during the first element.
 *
 * @param {*} options
 * @returns content, if it's the first element inside an operator, empty otherwise.
 */
function first(options) {
  if (this.index != null && this.count != null && this.index == 0) {
    return options.fn(this)
  }
}

/**
 * Inside an iterator, this helper allows you to specify the content that will be output only
 * during the last element.
 *
 * @param {*} options
 * @returns content, if it's the last element inside an operator, empty otherwise.
 */
function last(options) {
  if (
    this.index != null &&
    this.count != null &&
    this.index == this.count - 1
  ) {
    return options.fn(this)
  }
}

/**
 * Inside an iterator. the block is output only if this is NOT the last item.
 * Useful for wrapping commas in the list of arguments and such.
 *
 * @param {*} optionms
 * @returns content, if it's not the last element inside a block, empty otherwise.
 */
function not_last(options) {
  if (
    this.index != null &&
    this.count != null &&
    this.index != this.count - 1
  ) {
    return options.fn(this)
  }
}

/**
 * Inside an iterator, this helper allows you to specify the content that will be output only
 * during the non-first and no-last element.
 *
 * @param {*} options
 * @returns content, if it's the middle element inside an operator, empty otherwise.
 */
function middle(options) {
  if (
    this.index != null &&
    this.count != null &&
    this.index != 0 &&
    this.index != this.count - 1
  ) {
    return options.fn(this)
  }
}

/**
 * This fetches a promise which returns template options if provided
 *
 * @param {*} options
 * @param {*} key
 */
function template_option_with_code(options, key) {
  return templateUtil
    .ensureTemplatePackageId(this)
    .then((packageId) =>
      queryPackage.selectSpecificOptionValue(
        this.global.db,
        packageId,
        options,
        key
      )
    )
}

/**
 * This returns a boolean if the 2 strings are same
 *
 * @param {*} string_a
 * @param {*} string_b
 */
function isEqual(string_a, string_b) {
  return string_a.trim() === string_b.trim()
}

function toggle(condition, trueResult, falseResult) {
  return condition ? trueResult : falseResult
}

/**
 * Remove leading and trailing spaces from a string
 *
 * @param {*} str
 * @returns A string with no leading and trailing spaces
 */
function trim_string(str) {
  var result = str.trim()
  return result
}

/**
 * Split the string based on spaces and return the last word
 * @param {*} str
 */
function asLastWord(str) {
  var strings = str.trim().split(' ')
  if (strings.length > 0) {
    return strings[strings.length - 1]
  }
  return str.trim()
}

/**
 * Iteration block.
 */
function iterate(options) {
  var hash = options.hash
  var ret = ''
  for (var i = 0; i < hash.count; i++) {
    var newContext = {
      global: this.global,
      parent: this,
      index: i,
      count: hash.count,
    }
    ret = ret.concat(options.fn(newContext))
  }
  return ret
}

function addToAccumulator(accumulator, value) {
  if (!('accumulators' in this.global)) {
    this.global.accumulators = {}
  }
  if (!(accumulator in this.global.accumulators)) {
    this.global.accumulators[accumulator] = {
      value: [],
      sum: [],
      currentSum: 0,
    }
  }
  this.global.accumulators[accumulator].value.push(value)
  var lastSum = this.global.accumulators[accumulator].currentSum
  var newSum
  if (value != null) {
    newSum = lastSum + value
  } else {
    newSum = lastSum
  }
  this.global.accumulators[accumulator].sum.push(newSum)
  this.global.accumulators[accumulator].currentSum = newSum
}

function iterateAccumulator(options) {
  var hash = options.hash
  if (!('accumulators' in this.global)) {
    return ''
  }
  var accumulator = this.global.accumulators[hash.accumulator]
  var ret = ''
  if (accumulator != null) {
    for (var i = 0; i < accumulator.value.length; i++) {
      var newContext = {
        global: this.global,
        parent: this,
        index: i,
        count: accumulator.value.length,
        sum: accumulator.sum[i],
        value: accumulator.value[i],
      }
      ret = ret.concat(options.fn(newContext))
    }
  }
  return ret
}

function waitForSynchronousPromise(pollInterval, promise, resolve, reject) {
  if (promise.isResolved()) {
    resolve()
  } else if (promise.isRejected()) {
    reject()
  } else {
    setTimeout(
      () => waitForSynchronousPromise(pollInterval, promise, resolve, reject),
      pollInterval
    )
  }
}

function promiseToResolveAllPreviousPromises(globalPromises) {
  if (globalPromises.length == 0) {
    return Promise.resolve()
  } else {
    var promises = []
    globalPromises.forEach((promise) => {
      promises.push(
        new Promise((resolve, reject) => {
          waitForSynchronousPromise(100, promise, resolve, reject)
        })
      )
    })
    return Promise.all(promises).then(() => Promise.resolve())
  }
}

function after(options) {
  return promiseToResolveAllPreviousPromises(this.global.promises).then(() => {
    var newContext = {
      global: this.global,
      parent: this,
    }
    return options.fn(newContext)
  })
}

// WARNING! WARNING! WARNING! WARNING! WARNING! WARNING!
//
// Note: these exports are public API. Templates that might have been created in the past and are
// available in the wild might depend on these names.
// If you rename the functions, you need to still maintain old exports list.
exports.zap_header = zap_header
exports.ident = ident
exports.template_options = template_options
exports.last = last
exports.not_last = not_last
exports.first = first
exports.middle = middle
exports.template_option_with_code = template_option_with_code
exports.isEqual = isEqual
exports.trim_string = trim_string
exports.asLastWord = asLastWord
exports.iterate = iterate
exports.addToAccumulator = addToAccumulator
exports.iterateAccumulator = iterateAccumulator
exports.after = after
exports.toggle = toggle
