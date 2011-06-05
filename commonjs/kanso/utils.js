/*global window: false */

/**
 * General utility functions used by Kanso. Some functions were moved here from
 * other modules (such as core), to avoid a circular dependency bug in CouchDB.
 *
 * This module also stores some useful properties such as 'isBrowser', which is
 * true if the code is running in a browser environment, and 'initial_hit' which
 * is set to true when a page is first requested from CouchDB (and set to false
 * for subsequent requests).
 *
 * @module
 */

/**
 * Module dependencies
 */

var settings = require('./settings'), // settings module is auto-generated
    _ = require('./underscore')._;


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 *
 * You should not need to change this value during normal usage.
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and db.js ...once circular dependencies in
// couchdb's commonjs implementation are fixed it can be moved back into
// core.js. For now, this is also exported from core.js and should
// be accessed from there.
exports.isBrowser = false;
if (typeof window !== 'undefined') {
    exports.isBrowser = true;
}

/**
 * This is because the first page hit also triggers kanso to handle the url
 * client-side. Knowing it is the first page being loaded means we can stop
 * the pageTracker code from submitting the URL twice. Exported because this
 * might be useful information to other modules, it should not be modified
 * by them.
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and session.js
exports.initial_hit = true;



/**
 * Used to store userCtx, periodically updated like on session.login and
 * session.logout.
 */

// TODO: added to utils to avoid circular dependency bug in couchdb
exports.userCtx = null;

/**
 * Caches extended session info (like the current authentication db) after
 * a call to session.info
 */
exports.session = null;


/**
 * This is used to make unit testing in the browser easier.
 * Because it can be overridden without actually changing the window's location.
 * (and navigating away from the test suite)
 */

exports.getWindowLocation = function () {
    return window.location;
};


/**
 * Returns the path to prefix to any URLs. When running behind a
 * virtual host, there is nothing to prefix URLs with. When accessing the
 * app directly, URLs need to be prefixed with /db/_design/appname/_rewrite.
 *
 * The request object argument is only required when run server-side, but its
 * a good idea to include it whenever you call getBaseURL.
 *
 * @name getBaseURL(req)
 * @param {Object} req
 * @returns {String}
 * @api public
 */

// TODO: this was moved to this module from core.js to avoid a circular
// dependency between core.js and db.js ...once circular dependencies in
// couchdb's commonjs implementation are fixed it can be moved back into
// core.js. For now, this is also exported from core.js and should
// be accessed from there.
exports.getBaseURL = function (req) {
    if ('baseURL' in settings) {
        return settings.baseURL;
    }
    if (exports.isBrowser) {
        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(exports.getWindowLocation().pathname);
        if (match) {
            return match[1];
        }
        return '';
    }
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};


/**
 * Traverses an object and its sub-objects using an array of property names.
 * Returns the value of the matched path, or undefined if the property does not
 * exist.
 *
 * If a string if used for the path, it is assumed to be a path with a single
 * key (the given string).
 *
 * <pre>
 * getPropertyPath({a: {b: 'foo'}}, ['a','b']) -> 'foo'
 * getPropertyPath({a: {b: 'foo'}}, 'a') -> {b: 'foo'}
 * </pre>
 *
 * @name getPropertyPath(obj, path)
 * @param {Object} obj
 * @param {Array|String} path
 * @api public
 */

exports.getPropertyPath = function (obj, path) {
    if (!_.isArray(path)) {
        path = [path];
    }
    if (!path.length || !obj) {
        return obj;
    }
    return exports.getPropertyPath(obj[path[0]], path.slice(1));
};

/**
 * Traverses an object and its sub-objects using an array of property names.
 * Sets the value of the matched property.
 *
 * If a string if used for the path, it is assumed to be a path with a single
 * key (the given string).
 *
 * <pre>
 * setPropertyPath({}, ['a','b'], 'foo') -> {a: {b: 'foo'}}
 * setPropertyPath({}, 'a', 'foo') -> {a: 'foo'}
 * </pre>
 *
 * @name setPropertyPath(obj, path, val)
 * @param {Object} obj
 * @param {Array|String} path
 * @api public
 */

exports.setPropertyPath = function (obj, path, val) {
    if (!_.isArray(path)) {
        path = [path];
    }
    if (!path.length) {
        throw new Error('No property path given');
    }
    if (path.length === 1) {
        obj[path[0]] = val;
        return;
    }
    var next = path[0];
    path = path.slice(1);
    if (obj[next] === undefined) {
        obj[next] = {};
    }
    else if (typeof obj[next] !== 'object' && path.length) {
        throw new Error('Property path conflicts with existing value');
    }
    exports.setPropertyPath(obj[next], path, val);
};

/**
 * Returns the name of the constructor function for an object. This is used
 * as a workaround for CouchDB's lack of a module cache, where instanceof checks
 * can break if a module is re-eval'd.
 *
 * @name constructorName(obj)
 * @param {Object} obj
 * @returns {String}
 * @api public
 */

exports.constructorName = function (obj) {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (obj.constructor.name) {
        return obj.constructor.name;
    }
    var match = new RegExp('function (.+)\\(').exec(obj.constructor.toString());
    return (match && match.length > 1) ? match[1] : undefined;
};


/**
 * Call function with arguments, catch any errors and add to an array,
 * returning the modified array.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Array} args
 * @returns {Array}
 * @api private
 */

exports.getErrors = function (fn, args) {
    var arr = [];
    try {
        arr = arr.concat(fn.apply(this, args) || []);
    }
    catch (e) {
        arr.push(e);
    }
    return arr;
};

/**
 * Encodes required characters as HTML entities so a string can be included
 * in a page.
 *
 * @name escapeHTML(s)
 * @param {String} s
 * @returns {String}
 * @api public
 */

exports.escapeHTML = function (s) {
    s = '' + s; /* Coerce to string */
    s = s.replace(/&/g, '&amp;');
    s = s.replace(/</g, '&lt;');
    s = s.replace(/>/g, '&gt;');
    s = s.replace(/"/g, '&quot;');
    s = s.replace(/'/g, '&#39;');
    return s;
};

/**
 * Parse CSV strings into an array of rows, each row an array of values.
 * Used by the array field's default CSV widget.
 *
 * @name parseCSV(csvString)
 * @param {String} csvString
 * @returns {Array}
 * @api public
 */

// Parsing comma-separated values (CSV) in JavaScript by M. A. SRIDHAR
// http://yawgb.blogspot.com/2009/03/parsing-comma-separated-values-in.html
exports.parseCSV = function (csvString) {
    var fieldEndMarker  = /([,\015\012] *)/g;
    var qFieldEndMarker = /("")*"([,\015\012] *)/g;
    var startIndex = 0;
    var records = [], currentRecord = [];
    do {
        var ch = csvString.charAt(startIndex);
        var endMarkerRE = (ch === '"') ? qFieldEndMarker : fieldEndMarker;
        endMarkerRE.lastIndex = startIndex;
        var matchArray = endMarkerRE.exec(csvString);
        if (!matchArray || !matchArray.length) {
            break;
        }
        var endIndex = endMarkerRE.lastIndex;
        endIndex -= matchArray[matchArray.length - 1].length;
        var match = csvString.substring(startIndex, endIndex);
        if (match.charAt(0) === '"') {
            match = match.substring(1, match.length - 1).replace(/""/g, '"');
        }
        currentRecord.push(match);
        var marker = matchArray[0];
        if (marker.indexOf(',') < 0) {
            records.push(currentRecord);
            currentRecord = [];
        }
        startIndex = endMarkerRE.lastIndex;
    } while (true);
    if (startIndex < csvString.length) {
        var remaining = csvString.substring(startIndex).trim();
        if (remaining) {
            currentRecord.push(remaining);
        }
    }
    if (currentRecord.length > 0) {
        records.push(currentRecord);
    }
    return records;
};

/**
 * Creates CouchDB response object for returning from a show, list or update
 * function, which redirects to the given app url (automatically prepending the
 * baseURL)
 *
 * @name redirect(req, url)
 * @param {Object} req
 * @param {String} url
 * @returns {Object}
 * @api public
 */

exports.redirect = function (req, url) {
    var baseURL = exports.getBaseURL(req);
    return {code: 302, headers: {'Location': baseURL + url}};
};


/**
 * Recursively copies properties of an object, handling circular references
 * and returning a new object completely seperate from the original.
 *
 * Modifications to the new object will not affect the original copy.
 *
 * @name deepCopy(obj, [limit])
 * @param obj - the object to copy
 * @param {Number} limit - the recursion depth before throwing (optional)
 * @api public
 */

exports.deepCopy = function (obj, limit) {
    // for handling circular references:
    var seen = [];   // store references to original objects
    var clones = []; // store references to copied objects

    var fn = function (obj, limit) {
        if (!limit) {
            throw new Error('deepCopy recursion limit reached');
        }

        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
        else if (typeof obj === 'object') {

            // check for a circular reference
            var i = _.indexOf(seen, obj);
            if (i !== -1) {
                return clones[i];
            }

            var newObj;
            if (obj instanceof Array) {
                newObj = [];
            }
            else {
                // to fix instanceof and constructorName checks
                var F = function () {};
                F.prototype = obj;
                newObj = new F();
            }

            // add cloned object to list of references, so we
            // can check for circular references later
            seen.push(obj);
            clones.push(newObj);

            // deepCopy all properties
            for (var k in obj) {
                newObj[k] = fn(obj[k], limit - 1);
            }
            return newObj;
        }
        return obj;
    };
    return fn(obj, limit || 1000);
};


/**
 * A destructive merge of two JSON objects. The values in 'b' override the
 * values already existing in 'a'. If a value existing in 'b', but not in 'a',
 * it is added. If a value exists in 'a', but not 'b', it is retained.
 *
 * The 'a' object is updated in-place.
 *
 * @name override(a, b)
 * @param {Object} a
 * @param {Object} b
 * @api public
 */

exports.override = function (a, b) {
    if (a instanceof Object && b instanceof Object) {
        for (var k in b) {
            a[k] = exports.override(a[k], b[k]);
        }
        return a;
    }
    return b;
};
