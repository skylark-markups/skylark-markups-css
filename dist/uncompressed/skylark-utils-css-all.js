/**
 * skylark-utils-css - The skylark css utility library.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0-beta
 * @link www.skylarkjs.org
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                exports: null
            };
            require(id);
        } else {
            map[id] = factory;
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.exports) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(window, args);
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx/skylark");

    if (isCmd) {
      exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-langx/skylark',[], function() {
    var skylark = {

    };
    return skylark;
});

define('skylark-utils/skylark',["skylark-langx/skylark"], function(skylark) {
    return skylark;
});

define('skylark-langx/langx',["./skylark"], function(skylark) {
    "use strict";
    var toString = {}.toString,
        concat = Array.prototype.concat,
        indexOf = Array.prototype.indexOf,
        slice = Array.prototype.slice,
        filter = Array.prototype.filter,
        hasOwnProperty = Object.prototype.hasOwnProperty;


    var  PGLISTENERS = Symbol ? Symbol() : '__pglisteners';

    // An internal function for creating assigner functions.
    function createAssigner(keysFunc, defaults) {
        return function(obj) {
          var length = arguments.length;
          if (defaults) obj = Object(obj);
          if (length < 2 || obj == null) return obj;
          for (var index = 1; index < length; index++) {
            var source = arguments[index],
                keys = keysFunc(source),
                l = keys.length;
            for (var i = 0; i < l; i++) {
              var key = keys[i];
              if (!defaults || obj[key] === void 0) obj[key] = source[key];
            }
          }
          return obj;
       };
    }

    // Internal recursive comparison function for `isEqual`.
    var eq, deepEq;
    var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

    eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b) return a !== 0 || 1 / a === 1 / b;
        // `null` or `undefined` only equal to itself (strict comparison).
        if (a == null || b == null) return false;
        // `NaN`s are equivalent, but non-reflexive.
        if (a !== a) return b !== b;
        // Exhaust primitive checks
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
        return deepEq(a, b, aStack, bStack);
    };

    // Internal recursive comparison function for `isEqual`.
    deepEq = function(a, b, aStack, bStack) {
        // Unwrap any wrapped objects.
        //if (a instanceof _) a = a._wrapped;
        //if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className !== toString.call(b)) return false;
        switch (className) {
            // Strings, numbers, regular expressions, dates, and booleans are compared by value.
            case '[object RegExp]':
            // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
            case '[object String]':
                // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
                // equivalent to `new String("5")`.
                return '' + a === '' + b;
            case '[object Number]':
                // `NaN`s are equivalent, but non-reflexive.
                // Object(NaN) is equivalent to NaN.
                if (+a !== +a) return +b !== +b;
                // An `egal` comparison is performed for other numeric values.
                return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
                // Coerce dates and booleans to numeric primitive values. Dates are compared by their
                // millisecond representations. Note that invalid dates with millisecond representations
                // of `NaN` are not equivalent.
                return +a === +b;
            case '[object Symbol]':
                return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
        }

        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object') return false;
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                               isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

        // Initializing stack of traversed objects.
        // It's done here since we only need them for objects and arrays comparison.
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a) return bStack[length] === b;
        }

        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);

        // Recursively compare objects and arrays.
        if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length) return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack)) return false;
            }
        } else {
            // Deep compare objects.
            var keys = Object.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (Object.keys(b).length !== length) return false;
            while (length--) {
                // Deep compare each member
                key = keys[length];
                if (!(b[key]!==undefined && eq(a[key], b[key], aStack, bStack))) return false;
            }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return true;
    };

    var undefined, nextId = 0;
    function advise(dispatcher, type, advice, receiveArguments){
        var previous = dispatcher[type];
        var around = type == "around";
        var signal;
        if(around){
            var advised = advice(function(){
                return previous.advice(this, arguments);
            });
            signal = {
                remove: function(){
                    if(advised){
                        advised = dispatcher = advice = null;
                    }
                },
                advice: function(target, args){
                    return advised ?
                        advised.apply(target, args) :  // called the advised function
                        previous.advice(target, args); // cancelled, skip to next one
                }
            };
        }else{
            // create the remove handler
            signal = {
                remove: function(){
                    if(signal.advice){
                        var previous = signal.previous;
                        var next = signal.next;
                        if(!next && !previous){
                            delete dispatcher[type];
                        }else{
                            if(previous){
                                previous.next = next;
                            }else{
                                dispatcher[type] = next;
                            }
                            if(next){
                                next.previous = previous;
                            }
                        }

                        // remove the advice to signal that this signal has been removed
                        dispatcher = advice = signal.advice = null;
                    }
                },
                id: nextId++,
                advice: advice,
                receiveArguments: receiveArguments
            };
        }
        if(previous && !around){
            if(type == "after"){
                // add the listener to the end of the list
                // note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
                while(previous.next && (previous = previous.next)){}
                previous.next = signal;
                signal.previous = previous;
            }else if(type == "before"){
                // add to beginning
                dispatcher[type] = signal;
                signal.next = previous;
                previous.previous = signal;
            }
        }else{
            // around or first one just replaces
            dispatcher[type] = signal;
        }
        return signal;
    }
    function aspect(type){
        return function(target, methodName, advice, receiveArguments){
            var existing = target[methodName], dispatcher;
            if(!existing || existing.target != target){
                // no dispatcher in place
                target[methodName] = dispatcher = function(){
                    var executionId = nextId;
                    // before advice
                    var args = arguments;
                    var before = dispatcher.before;
                    while(before){
                        args = before.advice.apply(this, args) || args;
                        before = before.next;
                    }
                    // around advice
                    if(dispatcher.around){
                        var results = dispatcher.around.advice(this, args);
                    }
                    // after advice
                    var after = dispatcher.after;
                    while(after && after.id < executionId){
                        if(after.receiveArguments){
                            var newResults = after.advice.apply(this, args);
                            // change the return value only if a new value was returned
                            results = newResults === undefined ? results : newResults;
                        }else{
                            results = after.advice.call(this, results, args);
                        }
                        after = after.next;
                    }
                    return results;
                };
                if(existing){
                    dispatcher.around = {advice: function(target, args){
                        return existing.apply(target, args);
                    }};
                }
                dispatcher.target = target;
            }
            var results = advise((dispatcher || existing), type, advice, receiveArguments);
            advice = null;
            return results;
        };
    }

    var f1 = function() {
        function extendClass(ctor, props, options) {
            // Copy the properties to the prototype of the class.
            var proto = ctor.prototype,
                _super = ctor.superclass.prototype,
                noOverrided = options && options.noOverrided;

            for (var name in props) {
                if (name === "constructor") {
                    continue;
                }

                // Check if we're overwriting an existing function
                var prop = props[name];
                if (typeof props[name] == "function") {
                    proto[name] =  !prop._constructor && !noOverrided && typeof _super[name] == "function" ?
                          (function(name, fn, superFn) {
                            return function() {
                                var tmp = this.overrided;

                                // Add a new ._super() method that is the same method
                                // but on the super-class
                                this.overrided = superFn;

                                // The method only need to be bound temporarily, so we
                                // remove it when we're done executing
                                var ret = fn.apply(this, arguments);

                                this.overrided = tmp;

                                return ret;
                            };
                        })(name, prop, _super[name]) :
                        prop;
                } else if (typeof prop == "object" && prop!==null && (prop.get || prop.value !== undefined)) {
                    Object.defineProperty(proto,name,prop);
                } else {
                    proto[name] = prop;
                }
            }
            return ctor;
        }

        function serialMixins(ctor,mixins) {
            var result = [];

            mixins.forEach(function(mixin){
                if (has(mixin,"__mixins__")) {
                     throw new Error("nested mixins");
                }
                var clss = [];
                while (mixin) {
                    clss.unshift(mixin);
                    mixin = mixin.superclass;
                }
                result = result.concat(clss);
            });

            result = uniq(result);

            result = result.filter(function(mixin){
                var cls = ctor;
                while (cls) {
                    if (mixin === cls) {
                        return false;
                    }
                    if (has(cls,"__mixins__")) {
                        var clsMixines = cls["__mixins__"];
                        for (var i=0; i<clsMixines.length;i++) {
                            if (clsMixines[i]===mixin) {
                                return false;
                            }
                        }
                    }
                    cls = cls.superclass;
                }
                return true;
            });

            if (result.length>0) {
                return result;
            } else {
                return false;
            }
        }

        function mergeMixins(ctor,mixins) {
            var newCtor =ctor;
            for (var i=0;i<mixins.length;i++) {
                var xtor = new Function();
                xtor.prototype = Object.create(newCtor.prototype);
                xtor.__proto__ = newCtor;
                xtor.superclass = null;
                mixin(xtor.prototype,mixins[i].prototype);
                xtor.prototype.__mixin__ = mixins[i];
                newCtor = xtor;
            }

            return newCtor;
        }

        return function createClass(props, parent, mixins,options) {
            if (isArray(parent)) {
                options = mixins;
                mixins = parent;
                parent = null;
            }
            parent = parent || Object;

            if (isDefined(mixins) && !isArray(mixins)) {
                options = mixins;
                mixins = false;
            }

            var innerParent = parent;

            if (mixins) {
                mixins = serialMixins(innerParent,mixins);
            }

            if (mixins) {
                innerParent = mergeMixins(innerParent,mixins);
            }


            var _constructor = props.constructor;
            if (_constructor === Object) {
                _constructor = function() {
                    if (this.init) {
                        return this.init.apply(this, arguments);
                    }
                };
            };

            var klassName = props.klassName || "",
                ctor = new Function(
                    "return function " + klassName + "() {" +
                    "var inst = this," +
                    " ctor = arguments.callee;" +
                    "if (!(inst instanceof ctor)) {" +
                    "inst = Object.create(ctor.prototype);" +
                    "}" +
                    "return ctor._constructor.apply(inst, arguments) || inst;" + 
                    "}"
                )();


            ctor._constructor = _constructor;
            // Populate our constructed prototype object
            ctor.prototype = Object.create(innerParent.prototype);

            // Enforce the constructor to be what we expect
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent;

            // And make this class extendable
            ctor.__proto__ = innerParent;

            if (mixins) {
                ctor.__mixins__ = mixins;
            }

            if (!ctor.partial) {
                ctor.partial = function(props, options) {
                    return extendClass(this, props, options);
                };
            }
            if (!ctor.inherit) {
                ctor.inherit = function(props, mixins,options) {
                    return createClass(props, this, mixins,options);
                };
            }

            ctor.partial(props, options);

            return ctor;
        };
    }

    var createClass = f1();


    // Retrieve all the property names of an object.
    function allKeys(obj) {
        if (!isObject(obj)) return [];
        var keys = [];
        for (var key in obj) keys.push(key);
        return keys;
    }

    function createEvent(type, props) {
        var e = new CustomEvent(type, props);

        return safeMixin(e, props);
    }
    
    function debounce(fn, wait) {
        var timeout,
            args,
            later = function() {
                fn.apply(null, args);
            };

        return function() {
            args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    var delegate = (function() {
        // boodman/crockford delegation w/ cornford optimization
        function TMP() {}
        return function(obj, props) {
            TMP.prototype = obj;
            var tmp = new TMP();
            TMP.prototype = null;
            if (props) {
                mixin(tmp, props);
            }
            return tmp; // Object
        };
    })();


    // Retrieve the values of an object's properties.
    function values(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    }
    
    function clone( /*anything*/ src,checkCloneMethod) {
        var copy;
        if (src === undefined || src === null) {
            copy = src;
        } else if (checkCloneMethod && src.clone) {
            copy = src.clone();
        } else if (isArray(src)) {
            copy = [];
            for (var i = 0; i < src.length; i++) {
                copy.push(clone(src[i]));
            }
        } else if (isPlainObject(src)) {
            copy = {};
            for (var key in src) {
                copy[key] = clone(src[key]);
            }
        } else {
            copy = src;
        }

        return copy;

    }

    function compact(array) {
        return filter.call(array, function(item) {
            return item != null;
        });
    }

    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase();
    }

    function deserializeValue(value) {
        try {
            return value ?
                value == "true" ||
                (value == "false" ? false :
                    value == "null" ? null :
                    +value + "" == value ? +value :
                    /^[\[\{]/.test(value) ? JSON.parse(value) :
                    value) : value;
        } catch (e) {
            return value;
        }
    }

    function each(obj, callback) {
        var length, key, i, undef, value;

        if (obj) {
            length = obj.length;

            if (length === undef) {
                // Loop object items
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        value = obj[key];
                        if (callback.call(value, key, value) === false) {
                            break;
                        }
                    }
                }
            } else {
                // Loop array items
                for (i = 0; i < length; i++) {
                    value = obj[i];
                    if (callback.call(value, i, value) === false) {
                        break;
                    }
                }
            }
        }

        return this;
    }

    function flatten(array) {
        if (isArrayLike(array)) {
            var result = [];
            for (var i = 0; i < array.length; i++) {
                var item = array[i];
                if (isArrayLike(item)) {
                    for (var j = 0; j < item.length; j++) {
                        result.push(item[j]);
                    }
                } else {
                    result.push(item);
                }
            }
            return result;
        } else {
            return array;
        }
        //return array.length > 0 ? concat.apply([], array) : array;
    }

    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg;
    }

    var getAbsoluteUrl = (function() {
        var a;

        return function(url) {
            if (!a) a = document.createElement('a');
            a.href = url;

            return a.href;
        };
    })();

    function getQueryParams(url) {
        var url = url || window.location.href,
            segs = url.split("?"),
            params = {};

        if (segs.length > 1) {
            segs[1].split("&").forEach(function(queryParam) {
                var nv = queryParam.split('=');
                params[nv[0]] = nv[1];
            });
        }
        return params;
    }

    function grep(array, callback) {
        var out = [];

        each(array, function(i, item) {
            if (callback(item, i)) {
                out.push(item);
            }
        });

        return out;
    }


    function has(obj, path) {
        if (!isArray(path)) {
            return obj != null && hasOwnProperty.call(obj, path);
        }
        var length = path.length;
        for (var i = 0; i < length; i++) {
            var key = path[i];
            if (obj == null || !hasOwnProperty.call(obj, key)) {
                return false;
            }
            obj = obj[key];
        }
        return !!length;
    }

    function inArray(item, array) {
        if (!array) {
            return -1;
        }
        var i;

        if (array.indexOf) {
            return array.indexOf(item);
        }

        i = array.length;
        while (i--) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    }

    function inherit(ctor, base) {
        var f = function() {};
        f.prototype = base.prototype;

        ctor.prototype = new f();
    }

    function isArray(object) {
        return object && object.constructor === Array;
    }

    function isArrayLike(obj) {
        return !isString(obj) && !isHtmlNode(obj) && typeof obj.length == 'number' && !isFunction(obj);
    }

    function isBoolean(obj) {
        return typeof(obj) === "boolean";
    }

    function isDocument(obj) {
        return obj != null && obj.nodeType == obj.DOCUMENT_NODE;
    }



  // Perform a deep comparison to check if two objects are equal.
    function isEqual(a, b) {
        return eq(a, b);
    }

    function isFunction(value) {
        return type(value) == "function";
    }

    function isObject(obj) {
        return type(obj) == "object";
    }

    function isPlainObject(obj) {
        return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype;
    }

    function isString(obj) {
        return typeof obj === 'string';
    }

    function isWindow(obj) {
        return obj && obj == obj.window;
    }

    function isDefined(obj) {
        return typeof obj !== 'undefined';
    }

    function isHtmlNode(obj) {
        return obj && (obj instanceof Node);
    }

    function isInstanceOf( /*Object*/ value, /*Type*/ type) {
        //Tests whether the value is an instance of a type.
        if (value === undefined) {
            return false;
        } else if (value === null || type == Object) {
            return true;
        } else if (typeof value === "number") {
            return type === Number;
        } else if (typeof value === "string") {
            return type === String;
        } else if (typeof value === "boolean") {
            return type === Boolean;
        } else if (typeof value === "string") {
            return type === String;
        } else {
            return (value instanceof type) || (value && value.isInstanceOf ? value.isInstanceOf(type) : false);
        }
    }

    function isNumber(obj) {
        return typeof obj == 'number';
    }

    function isSameOrigin(href) {
        if (href) {
            var origin = location.protocol + '//' + location.hostname;
            if (location.port) {
                origin += ':' + location.port;
            }
            return href.startsWith(origin);
        }
    }


    function isEmptyObject(obj) {
        var name;
        for (name in obj) {
            if (obj[name] !== null) {
                return false;
            }
        }
        return true;
    }

    // Returns whether an object has a given set of `key:value` pairs.
    function isMatch(object, attrs) {
        var keys = keys(attrs), length = keys.length;
        if (object == null) return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
          var key = keys[i];
          if (attrs[key] !== obj[key] || !(key in obj)) return false;
        }
        return true;
    }    

    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`.
    function keys(obj) {
        if (isObject(obj)) return [];
        var keys = [];
        for (var key in obj) if (has(obj, key)) keys.push(key);
        return keys;
    }

    function makeArray(obj, offset, startWith) {
       if (isArrayLike(obj) ) {
        return (startWith || []).concat(Array.prototype.slice.call(obj, offset || 0));
      }

      // array of single index
      return [ obj ];             
    }



    function map(elements, callback) {
        var value, values = [],
            i, key
        if (isArrayLike(elements))
            for (i = 0; i < elements.length; i++) {
                value = callback.call(elements[i], elements[i], i);
                if (value != null) values.push(value)
            }
        else
            for (key in elements) {
                value = callback.call(elements[key], elements[key], key);
                if (value != null) values.push(value)
            }
        return flatten(values)
    }

    function defer(fn) {
        if (requestAnimationFrame) {
            requestAnimationFrame(fn);
        } else {
            setTimeoutout(fn);
        }
        return this;
    }

    function noop() {
    }

    function proxy(fn, context) {
        var args = (2 in arguments) && slice.call(arguments, 2)
        if (isFunction(fn)) {
            var proxyFn = function() {
                return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments);
            }
            return proxyFn;
        } else if (isString(context)) {
            if (args) {
                args.unshift(fn[context], fn)
                return proxy.apply(null, args)
            } else {
                return proxy(fn[context], fn);
            }
        } else {
            throw new TypeError("expected function");
        }
    }


    function toPixel(value) {
        // style values can be floats, client code may want
        // to round for integer pixels.
        return parseFloat(value) || 0;
    }

    var type = (function() {
        var class2type = {};

        // Populate the class2type map
        each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase();
        });

        return function type(obj) {
            return obj == null ? String(obj) :
                class2type[toString.call(obj)] || "object";
        };
    })();

    function trim(str) {
        return str == null ? "" : String.prototype.trim.call(str);
    }

    function removeItem(items, item) {
        if (isArray(items)) {
            var idx = items.indexOf(item);
            if (idx != -1) {
                items.splice(idx, 1);
            }
        } else if (isPlainObject(items)) {
            for (var key in items) {
                if (items[key] == item) {
                    delete items[key];
                    break;
                }
            }
        }

        return this;
    }

    function _mixin(target, source, deep, safe) {
        for (var key in source) {
            if (!source.hasOwnProperty(key)) {
                continue;
            }
            if (safe && target[key] !== undefined) {
                continue;
            }
            if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
                if (isPlainObject(source[key]) && !isPlainObject(target[key])) {
                    target[key] = {};
                }
                if (isArray(source[key]) && !isArray(target[key])) {
                    target[key] = [];
                }
                _mixin(target[key], source[key], deep, safe);
            } else if (source[key] !== undefined) {
                target[key] = source[key]
            }
        }
        return target;
    }

    function _parseMixinArgs(args) {
        var params = slice.call(arguments, 0),
            target = params.shift(),
            deep = false;
        if (isBoolean(params[params.length - 1])) {
            deep = params.pop();
        }

        return {
            target: target,
            sources: params,
            deep: deep
        };
    }

    function mixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, false);
        });
        return args.target;
    }

    function result(obj, path, fallback) {
        if (!isArray(path)) {
            path = [path]
        };
        var length = path.length;
        if (!length) {
          return isFunction(fallback) ? fallback.call(obj) : fallback;
        }
        for (var i = 0; i < length; i++) {
          var prop = obj == null ? void 0 : obj[path[i]];
          if (prop === void 0) {
            prop = fallback;
            i = length; // Ensure we don't continue iterating.
          }
          obj = isFunction(prop) ? prop.call(obj) : prop;
        }

        return obj;
    }

    function safeMixin() {
        var args = _parseMixinArgs.apply(this, arguments);

        args.sources.forEach(function(source) {
            _mixin(args.target, source, args.deep, true);
        });
        return args.target;
    }

    function substitute( /*String*/ template,
        /*Object|Array*/
        map,
        /*Function?*/
        transform,
        /*Object?*/
        thisObject) {
        // summary:
        //    Performs parameterized substitutions on a string. Throws an
        //    exception if any parameter is unmatched.
        // template:
        //    a string with expressions in the form `${key}` to be replaced or
        //    `${key:format}` which specifies a format function. keys are case-sensitive.
        // map:
        //    hash to search for substitutions
        // transform:
        //    a function to process all parameters before substitution takes


        thisObject = thisObject || window;
        transform = transform ?
            proxy(thisObject, transform) : function(v) {
                return v;
            };

        function getObject(key, map) {
            if (key.match(/\./)) {
                var retVal,
                    getValue = function(keys, obj) {
                        var _k = keys.pop();
                        if (_k) {
                            if (!obj[_k]) return null;
                            return getValue(keys, retVal = obj[_k]);
                        } else {
                            return retVal;
                        }
                    };
                return getValue(key.split(".").reverse(), map);
            } else {
                return map[key];
            }
        }

        return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
            function(match, key, format) {
                var value = getObject(key, map);
                if (format) {
                    value = getObject(format, thisObject).call(thisObject, value, key);
                }
                return transform(value, key).toString();
            }); // String
    }

    var _uid = 1;

    function uid(obj) {
        return obj._uid || (obj._uid = _uid++);
    }

    function uniq(array) {
        return filter.call(array, function(item, idx) {
            return array.indexOf(item) == idx;
        })
    }

    var idCounter = 0;
    function uniqueId (prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    }

    var Deferred = function() {
        var self = this,
            p = this.promise = new Promise(function(resolve, reject) {
                self._resolve = resolve;
                self._reject = reject;
            }),
           added = {
                state : function() {
                    if (self.isResolved()) {
                        return 'resolved';
                    }
                    if (self.isRejected()) {
                        return 'rejected';
                    }
                    return 'pending';
                },
                then : function(onResolved,onRejected,onProgress) {
                    if (onProgress) {
                        this.progress(onProgress);
                    }
                    return mixin(Promise.prototype.then.call(this,
                            onResolved && function(args) {
                                if (args && args.__ctx__ !== undefined) {
                                    return onResolved.apply(args.__ctx__,args);
                                } else {
                                    return onResolved(args);
                                }
                            },
                            onRejected && function(args){
                                if (args && args.__ctx__ !== undefined) {
                                    return onRejected.apply(args.__ctx__,args);
                                } else {
                                    return onRejected(args);
                                }
                            }),added);
                },
                always: function(handler) {
                    //this.done(handler);
                    //this.fail(handler);
                    this.then(handler,handler);
                    return this;
                },
                done : function(handler) {
                    return this.then(handler);
                },
                fail : function(handler) { 
                    //return mixin(Promise.prototype.catch.call(this,handler),added);
                    return this.then(null,handler);
                }, 
                progress : function(handler) {
                    self[PGLISTENERS].push(handler);
                    return this;
                }

            };

        added.pipe = added.then;
        mixin(p,added);

        this[PGLISTENERS] = [];

        //this.resolve = Deferred.prototype.resolve.bind(this);
        //this.reject = Deferred.prototype.reject.bind(this);
        //this.progress = Deferred.prototype.progress.bind(this);

    };

    Deferred.prototype.resolve = function(value) {
        var args = slice.call(arguments);
        return this.resolveWith(null,args);
    };

    Deferred.prototype.resolveWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._resolve(args);
        this._resolved = true;
        return this;
    };

    Deferred.prototype.progress = function(value) {
        try {
          return this[PGLISTENERS].forEach(function (listener) {
            return listener(value);
          });
        } catch (error) {
          this.reject(error);
        }
        return this;
    };

    Deferred.prototype.reject = function(reason) {
        var args = slice.call(arguments);
        return this.rejectWith(null,args);
    };

    Deferred.prototype.rejectWith = function(context,args) {
        args = args ? makeArray(args) : []; 
        args.__ctx__ = context;
        this._reject(args);
        this._rejected = true;
        return this;
    };

    Deferred.prototype.isResolved = function() {
        return !!this._resolved;
    };

    Deferred.prototype.isRejected = function() {
        return !!this._rejected;
    };

    Deferred.prototype.then = function(callback, errback, progback) {
        var p = result(this,"promise");
        return p.then(callback, errback, progback);
    };

    Deferred.prototype.done  = Deferred.prototype.then;

    Deferred.all = function(array) {
        return Promise.all(array);
    };

    Deferred.first = function(array) {
        return Promise.race(array);
    };


    Deferred.when = function(valueOrPromise, callback, errback, progback) {
        var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
        var nativePromise = receivedPromise && valueOrPromise instanceof Promise;

        if (!receivedPromise) {
            if (arguments.length > 1) {
                return callback ? callback(valueOrPromise) : valueOrPromise;
            } else {
                return new Deferred().resolve(valueOrPromise);
            }
//        } else if (!nativePromise) {
//            var deferred = new Deferred(valueOrPromise.cancel);
//            valueOrPromise.then(deferred.resolve, deferred.reject, deferred.progress);
//            valueOrPromise = deferred.promise;
        }

        if (callback || errback || progback) {
            return valueOrPromise.then(callback, errback, progback);
        }
        return valueOrPromise;
    };

    Deferred.reject = function(err) {
        var d = new Deferred();
        d.reject(err);
        return d.promise;
    };

    Deferred.resolve = function(data) {
        var d = new Deferred();
        d.resolve(data);
        return d.promise;
    };

    Deferred.immediate = Deferred.resolve;

    var Evented = createClass({
        on: function(events, selector, data, callback, ctx, /*used internally*/ one) {
            var self = this,
                _hub = this._hub || (this._hub = {});

            if (isPlainObject(events)) {
                ctx = callback;
                each(events, function(type, fn) {
                    self.on(type, selector, data, fn, ctx, one);
                });
                return this;
            }

            if (!isString(selector) && !isFunction(callback)) {
                ctx = callback;
                callback = data;
                data = selector;
                selector = undefined;
            }

            if (isFunction(data)) {
                ctx = callback;
                callback = data;
                data = null;
            }

            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                (_hub[name] || (_hub[name] = [])).push({
                    fn: callback,
                    selector: selector,
                    data: data,
                    ctx: ctx,
                    one: one
                });
            });

            return this;
        },

        one: function(events, selector, data, callback, ctx) {
            return this.on(events, selector, data, callback, ctx, 1);
        },

        trigger: function(e /*,argument list*/ ) {
            if (!this._hub) {
                return this;
            }

            var self = this;

            if (isString(e)) {
                e = new CustomEvent(e);
            }

            Object.defineProperty(e,"target",{
                value : this
            });

            var args = slice.call(arguments, 1);
            if (isDefined(args)) {
                args = [e].concat(args);
            } else {
                args = [e];
            }
            [e.type || e.name, "all"].forEach(function(eventName) {
                var listeners = self._hub[eventName];
                if (!listeners) {
                    return;
                }

                var len = listeners.length,
                    reCompact = false;

                for (var i = 0; i < len; i++) {
                    var listener = listeners[i];
                    if (e.data) {
                        if (listener.data) {
                            e.data = mixin({}, listener.data, e.data);
                        }
                    } else {
                        e.data = listener.data || null;
                    }
                    listener.fn.apply(listener.ctx, args);
                    if (listener.one) {
                        listeners[i] = null;
                        reCompact = true;
                    }
                }

                if (reCompact) {
                    self._hub[eventName] = compact(listeners);
                }

            });
            return this;
        },

        listened: function(event) {
            var evtArr = ((this._hub || (this._events = {}))[event] || []);
            return evtArr.length > 0;
        },

        listenTo: function(obj, event, callback, /*used internally*/ one) {
            if (!obj) {
                return this;
            }

            // Bind callbacks on obj,
            if (isString(callback)) {
                callback = this[callback];
            }

            if (one) {
                obj.one(event, callback, this);
            } else {
                obj.on(event, callback, this);
            }

            //keep track of them on listening.
            var listeningTo = this._listeningTo || (this._listeningTo = []),
                listening;

            for (var i = 0; i < listeningTo.length; i++) {
                if (listeningTo[i].obj == obj) {
                    listening = listeningTo[i];
                    break;
                }
            }
            if (!listening) {
                listeningTo.push(
                    listening = {
                        obj: obj,
                        events: {}
                    }
                );
            }
            var listeningEvents = listening.events,
                listeningEvent = listeningEvents[event] = listeningEvents[event] || [];
            if (listeningEvent.indexOf(callback) == -1) {
                listeningEvent.push(callback);
            }

            return this;
        },

        listenToOnce: function(obj, event, callback) {
            return this.listenTo(obj, event, callback, 1);
        },

        off: function(events, callback) {
            var _hub = this._hub || (this._hub = {});
            if (isString(events)) {
                events = events.split(/\s/)
            }

            events.forEach(function(name) {
                var evts = _hub[name];
                var liveEvents = [];

                if (evts && callback) {
                    for (var i = 0, len = evts.length; i < len; i++) {
                        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
                            liveEvents.push(evts[i]);
                    }
                }

                if (liveEvents.length) {
                    _hub[name] = liveEvents;
                } else {
                    delete _hub[name];
                }
            });

            return this;
        },
        unlistenTo: function(obj, event, callback) {
            var listeningTo = this._listeningTo;
            if (!listeningTo) {
                return this;
            }
            for (var i = 0; i < listeningTo.length; i++) {
                var listening = listeningTo[i];

                if (obj && obj != listening.obj) {
                    continue;
                }

                var listeningEvents = listening.events;
                for (var eventName in listeningEvents) {
                    if (event && event != eventName) {
                        continue;
                    }

                    listeningEvent = listeningEvents[eventName];

                    for (var j = 0; j < listeningEvent.length; j++) {
                        if (!callback || callback == listeningEvent[i]) {
                            listening.obj.off(eventName, listeningEvent[i], this);
                            listeningEvent[i] = null;
                        }
                    }

                    listeningEvent = listeningEvents[eventName] = compact(listeningEvent);

                    if (isEmptyObject(listeningEvent)) {
                        listeningEvents[eventName] = null;
                    }

                }

                if (isEmptyObject(listeningEvents)) {
                    listeningTo[i] = null;
                }
            }

            listeningTo = this._listeningTo = compact(listeningTo);
            if (isEmptyObject(listeningTo)) {
                this._listeningTo = null;
            }

            return this;
        }
    });

    var Stateful = Evented.inherit({
        init : function(attributes, options) {
            var attrs = attributes || {};
            options || (options = {});
            this.cid = uniqueId(this.cidPrefix);
            this.attributes = {};
            if (options.collection) this.collection = options.collection;
            if (options.parse) attrs = this.parse(attrs, options) || {};
            var defaults = result(this, 'defaults');
            attrs = mixin({}, defaults, attrs);
            this.set(attrs, options);
            this.changed = {};
        },

        // A hash of attributes whose current and previous value differ.
        changed: null,

        // The value returned during the last failed validation.
        validationError: null,

        // The default name for the JSON `id` attribute is `"id"`. MongoDB and
        // CouchDB users may want to set this to `"_id"`.
        idAttribute: 'id',

        // The prefix is used to create the client id which is used to identify models locally.
        // You may want to override this if you're experiencing name clashes with model ids.
        cidPrefix: 'c',


        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
          return clone(this.attributes);
        },


        // Get the value of an attribute.
        get: function(attr) {
          return this.attributes[attr];
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function(attr) {
          return this.get(attr) != null;
        },

        // Set a hash of model attributes on the object, firing `"change"`. This is
        // the core primitive operation of a model, updating the data and notifying
        // anyone who needs to know about the change in state. The heart of the beast.
        set: function(key, val, options) {
          if (key == null) return this;

          // Handle both `"key", value` and `{key: value}` -style arguments.
          var attrs;
          if (typeof key === 'object') {
            attrs = key;
            options = val;
          } else {
            (attrs = {})[key] = val;
          }

          options || (options = {});

          // Run validation.
          if (!this._validate(attrs, options)) return false;

          // Extract attributes and options.
          var unset      = options.unset;
          var silent     = options.silent;
          var changes    = [];
          var changing   = this._changing;
          this._changing = true;

          if (!changing) {
            this._previousAttributes = clone(this.attributes);
            this.changed = {};
          }

          var current = this.attributes;
          var changed = this.changed;
          var prev    = this._previousAttributes;

          // For each `set` attribute, update or delete the current value.
          for (var attr in attrs) {
            val = attrs[attr];
            if (!isEqual(current[attr], val)) changes.push(attr);
            if (!isEqual(prev[attr], val)) {
              changed[attr] = val;
            } else {
              delete changed[attr];
            }
            unset ? delete current[attr] : current[attr] = val;
          }

          // Update the `id`.
          if (this.idAttribute in attrs) this.id = this.get(this.idAttribute);

          // Trigger all relevant attribute changes.
          if (!silent) {
            if (changes.length) this._pending = options;
            for (var i = 0; i < changes.length; i++) {
              this.trigger('change:' + changes[i], this, current[changes[i]], options);
            }
          }

          // You might be wondering why there's a `while` loop here. Changes can
          // be recursively nested within `"change"` events.
          if (changing) return this;
          if (!silent) {
            while (this._pending) {
              options = this._pending;
              this._pending = false;
              this.trigger('change', this, options);
            }
          }
          this._pending = false;
          this._changing = false;
          return this;
        },

        // Remove an attribute from the model, firing `"change"`. `unset` is a noop
        // if the attribute doesn't exist.
        unset: function(attr, options) {
          return this.set(attr, void 0, mixin({}, options, {unset: true}));
        },

        // Clear all attributes on the model, firing `"change"`.
        clear: function(options) {
          var attrs = {};
          for (var key in this.attributes) attrs[key] = void 0;
          return this.set(attrs, mixin({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
          if (attr == null) return !isEmptyObject(this.changed);
          return this.changed[attr] !== undefined;
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
          if (!diff) return this.hasChanged() ? clone(this.changed) : false;
          var old = this._changing ? this._previousAttributes : this.attributes;
          var changed = {};
          for (var attr in diff) {
            var val = diff[attr];
            if (isEqual(old[attr], val)) continue;
            changed[attr] = val;
          }
          return !isEmptyObject(changed) ? changed : false;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
          if (attr == null || !this._previousAttributes) return null;
          return this._previousAttributes[attr];
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
          return clone(this._previousAttributes);
        },

        // Create a new model with identical attributes to this one.
        clone: function() {
          return new this.constructor(this.attributes);
        },

        // A model is new if it has never been saved to the server, and lacks an id.
        isNew: function() {
          return !this.has(this.idAttribute);
        },

        // Check if the model is currently in a valid state.
        isValid: function(options) {
          return this._validate({}, mixin({}, options, {validate: true}));
        },

        // Run validation against the next complete set of model attributes,
        // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
        _validate: function(attrs, options) {
          if (!options.validate || !this.validate) return true;
          attrs = mixin({}, this.attributes, attrs);
          var error = this.validationError = this.validate(attrs, options) || null;
          if (!error) return true;
          this.trigger('invalid', this, error, mixin(options, {validationError: error}));
          return false;
        }
    });

    var SimpleQueryEngine = function(query, options){
        // summary:
        //      Simple query engine that matches using filter functions, named filter
        //      functions or objects by name-value on a query object hash
        //
        // description:
        //      The SimpleQueryEngine provides a way of getting a QueryResults through
        //      the use of a simple object hash as a filter.  The hash will be used to
        //      match properties on data objects with the corresponding value given. In
        //      other words, only exact matches will be returned.
        //
        //      This function can be used as a template for more complex query engines;
        //      for example, an engine can be created that accepts an object hash that
        //      contains filtering functions, or a string that gets evaluated, etc.
        //
        //      When creating a new dojo.store, simply set the store's queryEngine
        //      field as a reference to this function.
        //
        // query: Object
        //      An object hash with fields that may match fields of items in the store.
        //      Values in the hash will be compared by normal == operator, but regular expressions
        //      or any object that provides a test() method are also supported and can be
        //      used to match strings by more complex expressions
        //      (and then the regex's or object's test() method will be used to match values).
        //
        // options: dojo/store/api/Store.QueryOptions?
        //      An object that contains optional information such as sort, start, and count.
        //
        // returns: Function
        //      A function that caches the passed query under the field "matches".  See any
        //      of the "query" methods on dojo.stores.
        //
        // example:
        //      Define a store with a reference to this engine, and set up a query method.
        //
        //  |   var myStore = function(options){
        //  |       //  ...more properties here
        //  |       this.queryEngine = SimpleQueryEngine;
        //  |       //  define our query method
        //  |       this.query = function(query, options){
        //  |           return QueryResults(this.queryEngine(query, options)(this.data));
        //  |       };
        //  |   };

        // create our matching query function
        switch(typeof query){
            default:
                throw new Error("Can not query with a " + typeof query);
            case "object": case "undefined":
                var queryObject = query;
                query = function(object){
                    for(var key in queryObject){
                        var required = queryObject[key];
                        if(required && required.test){
                            // an object can provide a test method, which makes it work with regex
                            if(!required.test(object[key], object)){
                                return false;
                            }
                        }else if(required != object[key]){
                            return false;
                        }
                    }
                    return true;
                };
                break;
            case "string":
                // named query
                if(!this[query]){
                    throw new Error("No filter function " + query + " was found in store");
                }
                query = this[query];
                // fall through
            case "function":
                // fall through
        }
        
        function filter(arr, callback, thisObject){
            // summary:
            //      Returns a new Array with those items from arr that match the
            //      condition implemented by callback.
            // arr: Array
            //      the array to iterate over.
            // callback: Function|String
            //      a function that is invoked with three arguments (item,
            //      index, array). The return of this function is expected to
            //      be a boolean which determines whether the passed-in item
            //      will be included in the returned array.
            // thisObject: Object?
            //      may be used to scope the call to callback
            // returns: Array
            // description:
            //      This function corresponds to the JavaScript 1.6 Array.filter() method, with one difference: when
            //      run over sparse arrays, this implementation passes the "holes" in the sparse array to
            //      the callback function with a value of undefined. JavaScript 1.6's filter skips the holes in the sparse array.
            //      For more details, see:
            //      https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
            // example:
            //  | // returns [2, 3, 4]
            //  | array.filter([1, 2, 3, 4], function(item){ return item>1; });

            // TODO: do we need "Ctr" here like in map()?
            var i = 0, l = arr && arr.length || 0, out = [], value;
            if(l && typeof arr == "string") arr = arr.split("");
            if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
            if(thisObject){
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback.call(thisObject, value, i, arr)){
                        out.push(value);
                    }
                }
            }else{
                for(; i < l; ++i){
                    value = arr[i];
                    if(callback(value, i, arr)){
                        out.push(value);
                    }
                }
            }
            return out; // Array
        }

        function execute(array){
            // execute the whole query, first we filter
            var results = filter(array, query);
            // next we sort
            var sortSet = options && options.sort;
            if(sortSet){
                results.sort(typeof sortSet == "function" ? sortSet : function(a, b){
                    for(var sort, i=0; sort = sortSet[i]; i++){
                        var aValue = a[sort.attribute];
                        var bValue = b[sort.attribute];
                        // valueOf enables proper comparison of dates
                        aValue = aValue != null ? aValue.valueOf() : aValue;
                        bValue = bValue != null ? bValue.valueOf() : bValue;
                        if (aValue != bValue){
                            // modified by lwf 2016/07/09
                            //return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                            return !!sort.descending == (aValue == null || aValue > bValue) ? -1 : 1;
                        }
                    }
                    return 0;
                });
            }
            // now we paginate
            if(options && (options.start || options.count)){
                var total = results.length;
                results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
                results.total = total;
            }
            return results;
        }
        execute.matches = query;
        return execute;
    };

    var QueryResults = function(results){
        // summary:
        //      A function that wraps the results of a store query with additional
        //      methods.
        // description:
        //      QueryResults is a basic wrapper that allows for array-like iteration
        //      over any kind of returned data from a query.  While the simplest store
        //      will return a plain array of data, other stores may return deferreds or
        //      promises; this wrapper makes sure that *all* results can be treated
        //      the same.
        //
        //      Additional methods include `forEach`, `filter` and `map`.
        // results: Array|dojo/promise/Promise
        //      The result set as an array, or a promise for an array.
        // returns:
        //      An array-like object that can be used for iterating over.
        // example:
        //      Query a store and iterate over the results.
        //
        //  |   store.query({ prime: true }).forEach(function(item){
        //  |       //  do something
        //  |   });

        if(!results){
            return results;
        }

        var isPromise = !!results.then;
        // if it is a promise it may be frozen
        if(isPromise){
            results = Object.delegate(results);
        }
        function addIterativeMethod(method){
            // Always add the iterative methods so a QueryResults is
            // returned whether the environment is ES3 or ES5
            results[method] = function(){
                var args = arguments;
                var result = Deferred.when(results, function(results){
                    //Array.prototype.unshift.call(args, results);
                    return QueryResults(Array.prototype[method].apply(results, args));
                });
                // forEach should only return the result of when()
                // when we're wrapping a promise
                if(method !== "forEach" || isPromise){
                    return result;
                }
            };
        }

        addIterativeMethod("forEach");
        addIterativeMethod("filter");
        addIterativeMethod("map");
        if(results.total == null){
            results.total = Deferred.when(results, function(results){
                return results.length;
            });
        }
        return results; // Object
    };

    var async = {
        parallel : function(arr,args,ctx) {
            var rets = [];
            ctx = ctx || null;
            args = args || [];

            each(arr,function(i,func){
                rets.push(func.apply(ctx,args));
            });

            return Deferred.all(rets);
        },

        series : function(arr,args,ctx) {
            var rets = [],
                d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolve();
            each(arr,function(i,func){
                p = p.then(function(){
                    return func.apply(ctx,args);
                });
                rets.push(p);
            });

            return Deferred.all(rets);
        },

        waterful : function(arr,args,ctx) {
            var d = new Deferred(),
                p = d.promise;

            ctx = ctx || null;
            args = args || [];

            d.resolveWith(ctx,args);

            each(arr,function(i,func){
                p = p.then(func);
            });
            return p;
        }
    };

    var ArrayStore = createClass({
        "klassName": "ArrayStore",

        "queryEngine": SimpleQueryEngine,
        
        "idProperty": "id",


        get: function(id){
            // summary:
            //      Retrieves an object by its identity
            // id: Number
            //      The identity to use to lookup the object
            // returns: Object
            //      The object in the store that matches the given id.
            return this.data[this.index[id]];
        },

        getIdentity: function(object){
            return object[this.idProperty];
        },

        put: function(object, options){
            var data = this.data,
                index = this.index,
                idProperty = this.idProperty;
            var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
            if(id in index){
                // object exists
                if(options && options.overwrite === false){
                    throw new Error("Object already exists");
                }
                // replace the entry in data
                data[index[id]] = object;
            }else{
                // add the new object
                index[id] = data.push(object) - 1;
            }
            return id;
        },

        add: function(object, options){
            (options = options || {}).overwrite = false;
            // call put with overwrite being false
            return this.put(object, options);
        },

        remove: function(id){
            // summary:
            //      Deletes an object by its identity
            // id: Number
            //      The identity to use to delete the object
            // returns: Boolean
            //      Returns true if an object was removed, falsy (undefined) if no object matched the id
            var index = this.index;
            var data = this.data;
            if(id in index){
                data.splice(index[id], 1);
                // now we have to reindex
                this.setData(data);
                return true;
            }
        },
        query: function(query, options){
            // summary:
            //      Queries the store for objects.
            // query: Object
            //      The query to use for retrieving objects from the store.
            // options: dojo/store/api/Store.QueryOptions?
            //      The optional arguments to apply to the resultset.
            // returns: dojo/store/api/Store.QueryResults
            //      The results of the query, extended with iterative methods.
            //
            // example:
            //      Given the following store:
            //
            //  |   var store = new Memory({
            //  |       data: [
            //  |           {id: 1, name: "one", prime: false },
            //  |           {id: 2, name: "two", even: true, prime: true},
            //  |           {id: 3, name: "three", prime: true},
            //  |           {id: 4, name: "four", even: true, prime: false},
            //  |           {id: 5, name: "five", prime: true}
            //  |       ]
            //  |   });
            //
            //  ...find all items where "prime" is true:
            //
            //  |   var results = store.query({ prime: true });
            //
            //  ...or find all items where "even" is true:
            //
            //  |   var results = store.query({ even: true });
            return QueryResults(this.queryEngine(query, options)(this.data));
        },

        setData: function(data){
            // summary:
            //      Sets the given data as the source for this store, and indexes it
            // data: Object[]
            //      An array of objects to use as the source of data.
            if(data.items){
                // just for convenience with the data format IFRS expects
                this.idProperty = data.identifier || this.idProperty;
                data = this.data = data.items;
            }else{
                this.data = data;
            }
            this.index = {};
            for(var i = 0, l = data.length; i < l; i++){
                this.index[data[i][this.idProperty]] = i;
            }
        },

        init: function(options) {
            for(var i in options){
                this[i] = options[i];
            }
            this.setData(this.data || []);
        }

    });

    var Xhr = (function(){
        var jsonpID = 0,
            document = window.document,
            key,
            name,
            rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            scriptTypeRE = /^(?:text|application)\/javascript/i,
            xmlTypeRE = /^(?:text|application)\/xml/i,
            jsonType = 'application/json',
            htmlType = 'text/html',
            blankRE = /^\s*$/;

        var XhrDefaultOptions = {
            async: true,

            // Default type of request
            type: 'GET',
            // Callback that is executed before request
            beforeSend: noop,
            // Callback that is executed if the request succeeds
            success: noop,
            // Callback that is executed the the server drops error
            error: noop,
            // Callback that is executed on request complete (both: error and success)
            complete: noop,
            // The context for the callbacks
            context: null,
            // Whether to trigger "global" Ajax events
            global: true,

            // MIME types mapping
            // IIS returns Javascript as "application/x-javascript"
            accepts: {
                script: 'text/javascript, application/javascript, application/x-javascript',
                json: 'application/json',
                xml: 'application/xml, text/xml',
                html: 'text/html',
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
            // Default timeout
            timeout: 0,
            // Whether data should be serialized to string
            processData: true,
            // Whether the browser should be allowed to cache GET responses
            cache: true,

            xhrFields : {
                withCredentials : true
            }
        };

        function mimeToDataType(mime) {
            if (mime) {
                mime = mime.split(';', 2)[0];
            }
            if (mime) {
                if (mime == htmlType) {
                    return "html";
                } else if (mime == jsonType) {
                    return "json";
                } else if (scriptTypeRE.test(mime)) {
                    return "script";
                } else if (xmlTypeRE.test(mime)) {
                    return "xml";
                }
            }
            return "text";
        }

        function appendQuery(url, query) {
            if (query == '') return url
            return (url + '&' + query).replace(/[&?]{1,2}/, '?')
        }

        // serialize payload and append it to the URL for GET requests
        function serializeData(options) {
            options.data = options.data || options.query;
            if (options.processData && options.data && type(options.data) != "string") {
                options.data = param(options.data, options.traditional);
            }
            if (options.data && (!options.type || options.type.toUpperCase() == 'GET')) {
                options.url = appendQuery(options.url, options.data);
                options.data = undefined;
            }
        }

        function serialize(params, obj, traditional, scope) {
            var t, array = isArray(obj),
                hash = isPlainObject(obj)
            each(obj, function(key, value) {
                t =type(value);
                if (scope) key = traditional ? scope :
                    scope + '[' + (hash || t == 'object' || t == 'array' ? key : '') + ']'
                // handle data in serializeArray() format
                if (!scope && array) params.add(value.name, value.value)
                // recurse into nested objects
                else if (t == "array" || (!traditional && t == "object"))
                    serialize(params, value, traditional, key)
                else params.add(key, value)
            })
        }

        var param = function(obj, traditional) {
            var params = []
            params.add = function(key, value) {
                if (isFunction(value)) value = value()
                if (value == null) value = ""
                this.push(escape(key) + '=' + escape(value))
            }
            serialize(params, obj, traditional)
            return params.join('&').replace(/%20/g, '+')
        };

        var Xhr = Evented.inherit({
            klassName : "Xhr",

            _request  : function(args) {
                var _ = this._,
                    self = this,
                    options = mixin({},XhrDefaultOptions,_.options,args),
                    xhr = _.xhr = new XMLHttpRequest();

                serializeData(options)

                var dataType = options.dataType || options.handleAs,
                    mime = options.mimeType || options.accepts[dataType],
                    headers = options.headers,
                    xhrFields = options.xhrFields,
                    isFormData = options.data && options.data instanceof FormData,
                    basicAuthorizationToken = options.basicAuthorizationToken,
                    type = options.type,
                    url = options.url,
                    async = options.async,
                    user = options.user , 
                    password = options.password,
                    deferred = new Deferred(),
                    contentType = isFormData ? false : 'application/x-www-form-urlencoded';

                if (xhrFields) {
                    for (name in xhrFields) {
                        xhr[name] = xhrFields[name];
                    }
                }

                if (mime && mime.indexOf(',') > -1) {
                    mime = mime.split(',', 2)[0];
                }
                if (mime && xhr.overrideMimeType) {
                    xhr.overrideMimeType(mime);
                }

                //if (dataType) {
                //    xhr.responseType = dataType;
                //}

                var finish = function() {
                    xhr.onloadend = noop;
                    xhr.onabort = noop;
                    xhr.onprogress = noop;
                    xhr.ontimeout = noop;
                    xhr = null;
                }
                var onloadend = function() {
                    var result, error = false
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && getAbsoluteUrl(url).startsWith('file:'))) {
                        dataType = dataType || mimeToDataType(options.mimeType || xhr.getResponseHeader('content-type'));

                        result = xhr.responseText;
                        try {
                            if (dataType == 'script') {
                                eval(result);
                            } else if (dataType == 'xml') {
                                result = xhr.responseXML;
                            } else if (dataType == 'json') {
                                result = blankRE.test(result) ? null : JSON.parse(result);
                            } else if (dataType == "blob") {
                                result = Blob([xhrObj.response]);
                            } else if (dataType == "arraybuffer") {
                                result = xhr.reponse;
                            }
                        } catch (e) { 
                            error = e;
                        }

                        if (error) {
                            deferred.reject(error,xhr.status,xhr);
                        } else {
                            deferred.resolve(result,xhr.status,xhr);
                        }
                    } else {
                        deferred.reject(new Error(xhr.statusText),xhr.status,xhr);
                    }
                    finish();
                };

                var onabort = function() {
                    if (deferred) {
                        deferred.reject(new Error("abort"),xhr.status,xhr);
                    }
                    finish();                 
                }
 
                var ontimeout = function() {
                    if (deferred) {
                        deferred.reject(new Error("timeout"),xhr.status,xhr);
                    }
                    finish();                 
                }

                var onprogress = function(evt) {
                    if (deferred) {
                        deferred.progress(evt,xhr.status,xhr);
                    }
                }

                xhr.onloadend = onloadend;
                xhr.onabort = onabort;
                xhr.ontimeout = ontimeout;
                xhr.onprogress = onprogress;

                xhr.open(type, url, async, user, password);
               
                if (headers) {
                    for ( var key in headers) {
                        var value = headers[key];
 
                        if(key.toLowerCase() === 'content-type'){
                            contentType = headers[hdr];
                        } else {
                           xhr.setRequestHeader(key, value);
                        }
                    }
                }   

                if  (contentType && contentType !== false){
                    xhr.setRequestHeader('Content-Type', contentType);
                }

                if(!headers || !('X-Requested-With' in headers)){
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }


                //If basicAuthorizationToken is defined set its value into "Authorization" header
                if (basicAuthorizationToken) {
                    xhr.setRequestHeader("Authorization", basicAuthorizationToken);
                }

                xhr.send(options.data ? options.data : null);

                return deferred.promise;

            },

            "abort": function() {
                var _ = this._,
                    xhr = _.xhr;

                if (xhr) {
                    xhr.abort();
                }    
            },


            "request": function(args) {
                return this._request(args);
            },

            get : function(args) {
                args = args || {};
                args.type = "GET";
                return this._request(args);
            },

            post : function(args) {
                args = args || {};
                args.type = "POST";
                return this._request(args);
            },

            patch : function(args) {
                args = args || {};
                args.type = "PATCH";
                return this._request(args);
            },

            put : function(args) {
                args = args || {};
                args.type = "PUT";
                return this._request(args);
            },

            del : function(args) {
                args = args || {};
                args.type = "DELETE";
                return this._request(args);
            },

            "init": function(options) {
                this._ = {
                    options : options || {}
                };
            }
        });

        ["request","get","post","put","del","patch"].forEach(function(name){
            Xhr[name] = function(url,args) {
                var xhr = new Xhr({"url" : url});
                return xhr[name](args);
            };
        });

        Xhr.defaultOptions = XhrDefaultOptions;
        Xhr.param = param;

        return Xhr;
    })();

    var Restful = Evented.inherit({
        "klassName" : "Restful",

        "idAttribute": "id",
        
        getBaseUrl : function(args) {
            //$$baseEndpoint : "/files/${fileId}/comments",
            var baseEndpoint = String.substitute(this.baseEndpoint,args),
                baseUrl = this.server + this.basePath + baseEndpoint;
            if (args[this.idAttribute]!==undefined) {
                baseUrl = baseUrl + "/" + args[this.idAttribute]; 
            }
            return baseUrl;
        },
        _head : function(args) {
            //get resource metadata .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
        },
        _get : function(args) {
            //get resource ,one or list .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, null if list
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            return Xhr.get(this.getBaseUrl(args),args);
        },
        _post  : function(args,verb) {
            //create or move resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.post(url, args);
        },

        _put  : function(args,verb) {
            //update resource .
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            //verb : the verb ,ex: copy,touch,trash,untrash,watch
            var url = this.getBaseUrl(args);
            if (verb) {
                url = url + "/" + verb;
            }
            return Xhr.put(url, args);
        },

        _delete : function(args) {
            //delete resource . 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}         

            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            var url = this.getBaseUrl(args);
            return Xhr.del(url);
        },

        _patch : function(args){
            //update resource metadata. 
            //args : id and other info for the resource ,ex
            //{
            //  "id" : 234,  // the own id, required
            //  "data" : body // the own data,required
            //  "fileId"   : 2 // the parent resource id, option by resource
            //}
            var url = this.getBaseUrl(args);
            return Xhr.patch(url, args);
        },
        query: function(params) {
            
            return this._post(params);
        },

        retrieve: function(params) {
            return this._get(params);
        },

        create: function(params) {
            return this._post(params);
        },

        update: function(params) {
            return this._put(params);
        },

        delete: function(params) {
            // HTTP request : DELETE http://center.utilhub.com/registry/v1/apps/{appid}
            return this._delete(params);
        },

        patch: function(params) {
           // HTTP request : PATCH http://center.utilhub.com/registry/v1/apps/{appid}
            return this._patch(params);
        },
        init: function(params) {
            mixin(this,params);
 //           this._xhr = XHRx();
       }


    });

    function langx() {
        return langx;
    }

    mixin(langx, {
        after: aspect("after"),

        allKeys: allKeys,

        around: aspect("around"),

        ArrayStore : ArrayStore,

        async : async,
        
        before: aspect("before"),

        camelCase: function(str) {
            return str.replace(/-([\da-z])/g, function(a) {
                return a.toUpperCase().replace('-', '');
            });
        },

        clone: clone,

        compact: compact,

        createEvent : createEvent,

        dasherize: dasherize,

        debounce: debounce,

        defaults : createAssigner(allKeys, true),

        delegate: delegate,

        Deferred: Deferred,

        Evented: Evented,

        defer: defer,

        deserializeValue: deserializeValue,

        each: each,

        first : function(items,n) {
            if (n) {
                return items.slice(0,n);
            } else {
                return items[0];
            }
        },

        flatten: flatten,

        funcArg: funcArg,

        getQueryParams: getQueryParams,

        has: has,

        inArray: inArray,

        isArray: isArray,

        isArrayLike: isArrayLike,

        isBoolean: isBoolean,

        isDefined: function(v) {
            return v !== undefined;
        },

        isDocument: isDocument,

        isEmptyObject: isEmptyObject,

        isEqual: isEqual,

        isFunction: isFunction,

        isHtmlNode: isHtmlNode,

        isMatch: isMatch,

        isNumber: isNumber,

        isObject: isObject,

        isPlainObject: isPlainObject,

        isString: isString,

        isSameOrigin: isSameOrigin,

        isWindow: isWindow,

        keys: keys,

        klass: function(props, parent,mixins, options) {
            return createClass(props, parent, mixins,options);
        },

        lowerFirst: function(str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        },

        makeArray: makeArray,

        map: map,

        mixin: mixin,

        noop : noop,

        proxy: proxy,

        removeItem: removeItem,

        Restful: Restful,

        result : result,
        
        returnTrue: function() {
            return true;
        },

        returnFalse: function() {
            return false;
        },

        safeMixin: safeMixin,

        serializeValue: function(value) {
            return JSON.stringify(value)
        },

        Stateful: Stateful,

        substitute: substitute,

        toPixel: toPixel,

        trim: trim,

        type: type,

        uid: uid,

        uniq: uniq,

        uniqueId: uniqueId,

        upperFirst: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        URL: typeof window !== "undefined" ? window.URL || window.webkitURL : null,

        values: values,

        Xhr: Xhr

    });

    return skylark.langx = langx;
});
define('skylark-utils/langx',[
    "skylark-langx/langx"
], function(langx) {
    return langx;
});

define('skylark-utils/styler',[
    "./skylark",
    "./langx"
], function(skylark, langx) {
    var every = Array.prototype.every,
        forEach = Array.prototype.forEach,
        camelCase = langx.camelCase,
        dasherize = langx.dasherize;

    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }

    var cssNumber = {
            'column-count': 1,
            'columns': 1,
            'font-weight': 1,
            'line-height': 1,
            'opacity': 1,
            'z-index': 1,
            'zoom': 1
        },
        classReCache = {

        };

    function classRE(name) {
        return name in classReCache ?
            classReCache[name] : (classReCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'));
    }

    // access className property while respecting SVGAnimatedString
    function className(node, value) {
        var klass = node.className || '',
            svg = klass && klass.baseVal !== undefined

        if (value === undefined) return svg ? klass.baseVal : klass
        svg ? (klass.baseVal = value) : (node.className = value)
    }


    var elementDisplay = {};

    function defaultDisplay(nodeName) {
        var element, display
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName)
            document.body.appendChild(element)
            display = getComputedStyle(element, '').getPropertyValue("display")
            element.parentNode.removeChild(element)
            display == "none" && (display = "block")
            elementDisplay[nodeName] = display
        }
        return elementDisplay[nodeName]
    }

    function show(elm) {
        styler.css(elm, "display", "");
        if (styler.css(elm, "display") == "none") {
            styler.css(elm, "display", defaultDisplay(elm.nodeName));
        }
        return this;
    }

    function isInvisible(elm) {
        return styler.css(elm, "display") == "none" || styler.css(elm, "opacity") == 0;
    }

    function hide(elm) {
        styler.css(elm, "display", "none");
        return this;
    }

    function addClass(elm, name) {
        if (!name) return this
        var cls = className(elm),
            names;
        if (langx.isString(name)) {
            names = name.split(/\s+/g);
        } else {
            names = name;
        }
        names.forEach(function(klass) {
            var re = classRE(klass);
            if (!cls.match(re)) {
                cls += (cls ? " " : "") + klass;
            }
        });

        className(elm, cls);

        return this;
    }

    function css(elm, property, value) {
        if (arguments.length < 3) {
            var computedStyle,
                computedStyle = getComputedStyle(elm, '')
            if (langx.isString(property)) {
                return elm.style[camelCase(property)] || computedStyle.getPropertyValue(property)
            } else if (langx.isArrayLike(property)) {
                var props = {}
                forEach.call(property, function(prop) {
                    props[prop] = (elm.style[camelCase(prop)] || computedStyle.getPropertyValue(prop))
                })
                return props
            }
        }

        var css = '';
        if (typeof(property) == 'string') {
            if (!value && value !== 0) {
                elm.style.removeProperty(dasherize(property));
            } else {
                css = dasherize(property) + ":" + maybeAddPx(property, value)
            }
        } else {
            for (key in property) {
                if (property[key] === undefined) {
                    continue;
                }
                if (!property[key] && property[key] !== 0) {
                    elm.style.removeProperty(dasherize(key));
                } else {
                    css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }
            }
        }

        elm.style.cssText += ';' + css;
        return this;
    }


    function hasClass(elm, name) {
        var re = classRE(name);
        return elm.className && elm.className.match(re);
    }

    function removeClass(elm, name) {
        if (name) {
            var cls = className(elm),
                names;

            if (langx.isString(name)) {
                names = name.split(/\s+/g);
            } else {
                names = name;
            }

            names.forEach(function(klass) {
                var re = classRE(klass);
                if (cls.match(re)) {
                    cls = cls.replace(re, " ");
                }
            });

            className(elm, cls.trim());
        } else {
            className(elm,"");
        }

        return this;
    }

    function toggleClass(elm, name, when) {
        var self = this;
        name.split(/\s+/g).forEach(function(klass) {
            if (when === undefined) {
                when = !self.hasClass(elm, klass);
            }
            if (when) {
                self.addClass(elm, klass);
            } else {
                self.removeClass(elm, klass)
            }
        });

        return self;
    }

    var styler = function() {
        return styler;
    };

    langx.mixin(styler, {
        autocssfix: false,
        cssHooks : {

        },
        
        addClass: addClass,
        className: className,
        css: css,
        hasClass: hasClass,
        hide: hide,
        isInvisible: isInvisible,
        removeClass: removeClass,
        show: show,
        toggleClass: toggleClass
    });

    return skylark.styler = styler;
});

define('skylark-utils/noder',[
    "./skylark",
    "./langx",
    "./styler"
], function(skylark, langx, styler) {
    var isIE = !!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g),
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,
        singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,
        div = document.createElement("div"),
        table = document.createElement('table'),
        tableBody = document.createElement('tbody'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': tableBody,
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': div
        },
        rootNodeRE = /^(?:body|html)$/i,
        map = Array.prototype.map,
        slice = Array.prototype.slice;

    function ensureNodes(nodes, copyByClone) {
        if (!langx.isArrayLike(nodes)) {
            nodes = [nodes];
        }
        if (copyByClone) {
            nodes = map.call(nodes, function(node) {
                return node.cloneNode(true);
            });
        }
        return langx.flatten(nodes);
    }

    function nodeName(elm, chkName) {
        var name = elm.nodeName && elm.nodeName.toLowerCase();
        if (chkName !== undefined) {
            return name === chkName.toLowerCase();
        }
        return name;
    };

    function after(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone),
                refNode = refNode.nextSibling;

            for (var i = 0; i < nodes.length; i++) {
                if (refNode) {
                    parent.insertBefore(nodes[i], refNode);
                } else {
                    parent.appendChild(nodes[i]);
                }
            }
        }
        return this;
    }

    function append(node, placing, copyByClone) {
        var parentNode = node,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            parentNode.appendChild(nodes[i]);
        }
        return this;
    }

    function before(node, placing, copyByClone) {
        var refNode = node,
            parent = refNode.parentNode;
        if (parent) {
            var nodes = ensureNodes(placing, copyByClone);
            for (var i = 0; i < nodes.length; i++) {
                parent.insertBefore(nodes[i], refNode);
            }
        }
        return this;
    }

    function contents(elm) {
        if (nodeName(elm, "iframe")) {
            return elm.contentDocument;
        }
        return elm.childNodes;
    }

    function createElement(tag, props,parent) {
        var node = document.createElement(tag);
        if (props) {
            for (var name in props) {
                node.setAttribute(name, props[name]);
            }
        }
        if (parent) {
            append(parent,node);
        }
        return node;
    }

    function createFragment(html) {
        // A special case optimization for a single tag
        html = langx.trim(html);
        if (singleTagRE.test(html)) {
            return [createElement(RegExp.$1)];
        }

        var name = fragmentRE.test(html) && RegExp.$1
        if (!(name in containers)) {
            name = "*"
        }
        var container = containers[name];
        container.innerHTML = "" + html;
        dom = slice.call(container.childNodes);

        dom.forEach(function(node) {
            container.removeChild(node);
        })

        return dom;
    }

    function clone(node, deep) {
        var self = this,
            clone;

        // TODO: Add feature detection here in the future
        if (!isIE || node.nodeType !== 1 || deep) {
            return node.cloneNode(deep);
        }

        // Make a HTML5 safe shallow copy
        if (!deep) {
            clone = document.createElement(node.nodeName);

            // Copy attribs
            each(self.getAttribs(node), function(attr) {
                self.setAttrib(clone, attr.nodeName, self.getAttrib(node, attr.nodeName));
            });

            return clone;
        }
    }

    function contains(node, child) {
        return isChildOf(child, node);
    }

    function createTextNode(text) {
        return document.createTextNode(text);
    }

    function doc() {
        return document;
    }

    function empty(node) {
        while (node.hasChildNodes()) {
            var child = node.firstChild;
            node.removeChild(child);
        }
        return this;
    }

    function html(node, html) {
        if (html === undefined) {
            return node.innerHTML;
        } else {
            this.empty(node);
            html = html || "";
            if (langx.isString(html) || langx.isNumber(html)) {
                node.innerHTML = html;
            } else if (langx.isArrayLike(html)) {
                for (var i = 0; i < html.length; i++) {
                    node.appendChild(html[i]);
                }
            } else {
                node.appendChild(html);
            }
        }
    }

    function isChildOf(node, parent,directly) {
        if (directly) {
            return node.parentNode === parent;
        }
        if (document.documentElement.contains) {
            return parent.contains(node);
        }
        while (node) {
            if (parent === node) {
                return true;
            }

            node = node.parentNode;
        }

        return false;
    }

    function isDoc(node) {
        return node != null && node.nodeType == node.DOCUMENT_NODE
    }

    function ownerDoc(elm) {
        if (!elm) {
            return document;
        }

        if (elm.nodeType == 9) {
            return elm;
        }

        return elm.ownerDocument;
    }

    function ownerWindow(elm) {
        var doc = ownerDoc(elm);
        return  doc.defaultView || doc.parentWindow;
    } 


    function prepend(node, placing, copyByClone) {
        var parentNode = node,
            refNode = parentNode.firstChild,
            nodes = ensureNodes(placing, copyByClone);
        for (var i = 0; i < nodes.length; i++) {
            if (refNode) {
                parentNode.insertBefore(nodes[i], refNode);
            } else {
                parentNode.appendChild(nodes[i]);
            }
        }
        return this;
    }


    function offsetParent(elm) {
        var parent = elm.offsetParent || document.body;
        while (parent && !rootNodeRE.test(parent.nodeName) && styler.css(parent, "position") == "static") {
            parent = parent.offsetParent;
        }
        return parent;
    }

    function overlay(elm, params) {
        var overlayDiv = createElement("div", params);
        styler.css(overlayDiv, {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0x7FFFFFFF,
            opacity: 0.7
        });
        elm.appendChild(overlayDiv);
        return overlayDiv;

    }



    function remove(node) {
        if (node && node.parentNode) {
            try {
               node.parentNode.removeChild(node);
            } catch (e) {
                console.warn("The node is already removed",e);
            }
         }
        return this;
    }

    function replace(node, oldNode) {
        oldNode.parentNode.replaceChild(node, oldNode);
        return this;
    }

    function throb(elm, params) {
        params = params || {};
        var self = this,
            text = params.text,
            style = params.style,
            time = params.time,
            callback = params.callback,
            timer,
            throbber = this.createElement("div", {
                className: params.className || "throbber",
                style: style
            }),
            _overlay = overlay(throbber, {
                className: 'overlay fade'
            }),
            throb = this.createElement("div", {
                className: "throb"
            }),
            textNode = this.createTextNode(text || ""),
            remove = function() {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                if (throbber) {
                    self.remove(throbber);
                    throbber = null;
                }
            },
            update = function(params) {
                if (params && params.text && throbber) {
                    textNode.nodeValue = params.text;
                }
            };
        throb.appendChild(textNode);
        throbber.appendChild(throb);
        elm.appendChild(throbber);
        var end = function() {
            remove();
            if (callback) callback();
        };
        if (time) {
            timer = setTimeout(end, time);
        }

        return {
            remove: remove,
            update: update
        };
    }

    function traverse(node, fn) {
        fn(node)
        for (var i = 0, len = node.childNodes.length; i < len; i++) {
            traverse(node.childNodes[i], fn);
        }
        return this;
    }

    function reverse(node) {
        var firstChild = node.firstChild;
        for (var i = node.children.length - 1; i > 0; i--) {
            if (i > 0) {
                var child = node.children[i];
                node.insertBefore(child, firstChild);
            }
        }
    }

    function wrapper(node, wrapperNode) {
        if (langx.isString(wrapperNode)) {
            wrapperNode = this.createFragment(wrapperNode).firstChild;
        }
        node.parentNode.insertBefore(wrapperNode, node);
        wrapperNode.appendChild(node);
    }

    function wrapperInner(node, wrapperNode) {
        var childNodes = slice.call(node.childNodes);
        node.appendChild(wrapperNode);
        for (var i = 0; i < childNodes.length; i++) {
            wrapperNode.appendChild(childNodes[i]);
        }
        return this;
    }

    function unwrap(node) {
        var child, parent = node.parentNode;
        if (parent) {
            if (this.isDoc(parent.parentNode)) return;
            parent.parentNode.insertBefore(node, parent);
        }
    }

    function noder() {
        return noder;
    }

    langx.mixin(noder, {
        body : function() {
            return document.body;
        },

        clone: clone,
        contents: contents,

        createElement: createElement,

        createFragment: createFragment,

        contains: contains,

        createTextNode: createTextNode,

        doc: doc,

        empty: empty,

        html: html,

        isChildOf: isChildOf,

        isDoc: isDoc,

        isWindow : langx.isWindow,

        offsetParent : offsetParent,
        
        ownerDoc: ownerDoc,

        ownerWindow : ownerWindow,

        after: after,

        before: before,

        prepend: prepend,

        append: append,

        remove: remove,

        replace: replace,

        throb: throb,

        traverse: traverse,

        reverse: reverse,

        wrapper: wrapper,

        wrapperInner: wrapperInner,

        unwrap: unwrap
    });

    return skylark.noder = noder;
});

define('skylark-utils/css',[
    "./skylark",
    "./langx",
    "./noder"
], function(skylark, langx, construct) {

    var head = document.getElementsByTagName("head")[0],
        count = 0,
        sheetsByUrl = {},
        sheetElementsById = {},
        defaultSheetId = _createStyleSheet(),
        defaultSheet = sheetElementsById[defaultSheetId],
        rulesPropName = ("cssRules" in defaultSheet) ? "cssRules" : "rules",
        insertRuleFunc,
        deleteRuleFunc = defaultSheet.deleteRule || defaultSheet.removeRule;

    if (defaultSheet.insertRule) {
        var _insertRule = defaultSheet.insertRule;
        insertRuleFunc = function(selector, css, index) {
            _insertRule.call(this, selector + "{" + css + "}", index);
        };
    } else {
        insertRuleFunc = defaultSheet.addRule;
    }

    function normalizeSelector(selectorText) {
        var selector = [],
            last, len;
        last = defaultSheet[rulesPropName].length;
        insertRuleFunc.call(defaultSheet, selectorText, ';');
        len = defaultSheet[rulesPropName].length;
        for (var i = len - 1; i >= last; i--) {
            selector.push(_sheet[_rules][i].selectorText);
            deleteRuleFunc.call(defaultSheet, i);
        }
        return selector.reverse().join(', ');
    }

    function _createStyleSheet() {
        var link = document.createElement("link"),
            id = (count++);

        link.rel = "stylesheet";
        link.type = "text/css";
        link.async = false;
        link.defer = false;

        head.appendChild(link);
        sheetElementsById[id] = link;

        return id;
    }

    function css() {
        return css;
    }

    langx.mixin(css, {
        createStyleSheet: function(cssText) {
            return _createStyleSheet();
        },

        loadStyleSheet: function(url, loadedCallback, errorCallback) {
            var sheet = sheetsByUrl[url];
            if (!sheet) {
                sheet = sheetsByUrl[url] = {
                    state: 0, //0:unload,1:loaded,-1:loaderror
                    loadedCallbacks: [],
                    errorCallbacks: []
                };
            }

            sheet.loadedCallbacks.push(loadedCallback);
            sheet.errorCallbacks.push(errorCallback);

            if (sheet.state === 1) {
                sheet.node.onload();
            } else if (sheet.state === -1) {
                sheet.node.onerror();
            } else {
                sheet.id = _createStyleSheet();
                var node = sheet.node = sheetElementsById[sheet.id];

                startTime = new Date().getTime();

                node.onload = function() {
                    sheet.state = 1;
                    sheet.state = -1;
                    var callbacks = sheet.loadedCallbacks,
                        i = callbacks.length;

                    while (i--) {
                        callbacks[i]();
                    }
                    sheet.loadedCallbacks = [];
                    sheet.errorCallbacks = [];
                },
                node.onerror = function() {
                    sheet.state = -1;
                    var callbacks = sheet.errorCallbacks,
                        i = callbacks.length;

                    while (i--) {
                        callbacks[i]();
                    }
                    sheet.loadedCallbacks = [];
                    sheet.errorCallbacks = [];
                };

                node.href = sheet.url = url;

                sheetsByUrl[node.url] = sheet;

            }
            return sheet.id;
        },

        deleteSheetRule: function(sheetId, rule) {
            var sheet = sheetElementsById[sheetId];
            if (langx.isNumber(rule)) {
                deleteRuleFunc.call(sheet, rule);
            } else {
                langx.each(sheet[rulesPropName], function(i, _rule) {
                    if (rule === _rule) {
                        deleteRuleFunc.call(sheet, i);
                        return false;
                    }
                });
            }
        },

        deleteRule: function(rule) {
            this.deleteSheetRule(defaultSheetId, rule);
            return this;
        },

        removeStyleSheet: function(sheetId) {
            if (sheetId === defaultSheetId) {
                throw new Error("The default stylesheet can not be deleted");
            }
            var sheet = sheetElementsById[sheetId];
            delete sheetElementsById[sheetId];


            construct.remove(sheet);
            return this;
        },

        findRules: function(selector, sheetId) {
            //return array of CSSStyleRule objects that match the selector text
            var rules = [],
                filters = parseSelector(selector);
            $(document.styleSheets).each(function(i, styleSheet) {
                if (filterStyleSheet(filters.styleSheet, styleSheet)) {
                    $.merge(rules, $(styleSheet[_rules]).filter(function() {
                        return matchSelector(this, filters.selectorText, filters.styleSheet === "*");
                    }).map(function() {
                        return normalizeRule($.support.nativeCSSStyleRule ? this : new CSSStyleRule(this), styleSheet);
                    }));
                }
            });
            return rules.reverse();
        },

        insertRule: function(selector, css, index) {
            return this.insertSheetRule(defaultSheetId, selector, css, index);
        },

        insertSheetRule: function(sheetId, selector, css, index) {
            if (!selector || !css) {
                return -1;
            }

            var sheet = sheetElementsById[sheetId];
            index = index || sheet[rulesPropName].length;

            return insertRuleFunc.call(sheet, selector, css, index);
        }
    });

    return skylark.css = css;
});

define('skylark-utils-css/css',[
    "skylark-utils/skylark",
    "skylark-utils/css"
], function(skylark, css) {
	
	return css;
});
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

define('skylark-utils-css/primitives/beautify-css',[],function() {
    function css_beautify(source_text, options) {
        options = options || {};
        var indentSize = options.indent_size || 4;
        var indentCharacter = options.indent_char || ' ';
        var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
        var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        // compatibility
        if (typeof indentSize === "string") {
            indentSize = parseInt(indentSize, 10);
        }


        // tokenizer
        var whiteRe = /^\s+$/;
        var wordRe = /[\w$\-_]/;

        var pos = -1,
            ch;

        function next() {
            ch = source_text.charAt(++pos);
            return ch || '';
        }

        function peek(skipWhitespace) {
            var prev_pos = pos;
            if (skipWhitespace) {
                eatWhitespace();
            }
            result = source_text.charAt(pos + 1) || '';
            pos = prev_pos - 1;
            next();
            return result;
        }

        function eatString(endChars) {
            var start = pos;
            while (next()) {
                if (ch === "\\") {
                    next();
                } else if (endChars.indexOf(ch) !== -1) {
                    break;
                } else if (ch === "\n") {
                    break;
                }
            }
            return source_text.substring(start, pos + 1);
        }

        function peekString(endChar) {
            var prev_pos = pos;
            var str = eatString(endChar);
            pos = prev_pos - 1;
            next();
            return str;
        }

        function eatWhitespace() {
            var result = '';
            while (whiteRe.test(peek())) {
                next()
                result += ch;
            }
            return result;
        }

        function skipWhitespace() {
            var result = '';
            if (ch && whiteRe.test(ch)) {
                result = ch;
            }
            while (whiteRe.test(next())) {
                result += ch
            }
            return result;
        }

        function eatComment(singleLine) {
            var start = pos;
            var singleLine = peek() === "/";
            next();
            while (next()) {
                if (!singleLine && ch === "*" && peek() === "/") {
                    next();
                    break;
                } else if (singleLine && ch === "\n") {
                    return source_text.substring(start, pos);
                }
            }

            return source_text.substring(start, pos) + ch;
        }


        function lookBack(str) {
            return source_text.substring(pos - str.length, pos).toLowerCase() ===
                str;
        }

        // Nested pseudo-class if we are insideRule
        // and the next special character found opens
        // a new block
        function foundNestedPseudoClass() {
            for (var i = pos + 1; i < source_text.length; i++){
                var ch = source_text.charAt(i);
                if (ch === "{"){
                    return true;
                } else if (ch === ";" || ch === "}" || ch === ")") {
                    return false;
                }
            }
            return false;
        }

        // printer
        var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
        var singleIndent = new Array(indentSize + 1).join(indentCharacter);
        var indentLevel = 0;
        var nestedLevel = 0;

        function indent() {
            indentLevel++;
            basebaseIndentString += singleIndent;
        }

        function outdent() {
            indentLevel--;
            basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
        }

        var print = {};
        print["{"] = function(ch) {
            print.singleSpace();
            output.push(ch);
            print.newLine();
        };
        print["}"] = function(ch) {
            print.newLine();
            output.push(ch);
            print.newLine();
        };

        print._lastCharWhitespace = function() {
            return whiteRe.test(output[output.length - 1]);
        };

        print.newLine = function(keepWhitespace) {
            if (!keepWhitespace) {
                print.trim();
            }

            if (output.length) {
                output.push('\n');
            }
            if (basebaseIndentString) {
                output.push(basebaseIndentString);
            }
        };
        print.singleSpace = function() {
            if (output.length && !print._lastCharWhitespace()) {
                output.push(' ');
            }
        };

        print.trim = function() {
            while (print._lastCharWhitespace()) {
                output.pop();
            }
        };


        var output = [];
        if (basebaseIndentString) {
            output.push(basebaseIndentString);
        }
        /*_____________________--------------------_____________________*/

        var insideRule = false;
        var enteringConditionalGroup = false;
        var top_ch = '';
        var last_top_ch = '';

        while (true) {
            var whitespace = skipWhitespace();
            var isAfterSpace = whitespace !== '';
            var isAfterNewline = whitespace.indexOf('\n') !== -1;
            var last_top_ch = top_ch;
            var top_ch = ch;

            if (!ch) {
                break;
            } else if (ch === '/' && peek() === '*') { /* css comment */
                var header = lookBack("");
                print.newLine();
                output.push(eatComment());
                print.newLine();
                if (header) {
                    print.newLine(true);
                }
            } else if (ch === '/' && peek() === '/') { // single line comment
                if (!isAfterNewline && last_top_ch !== '{') {
                    print.trim();
                }
                print.singleSpace();
                output.push(eatComment());
                print.newLine();
            } else if (ch === '@') {
                // pass along the space we found as a separate item
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);

                // strip trailing space, if present, for hash property checks
                var variableOrRule = peekString(": ,;{}()[]/='\"").replace(/\s$/, '');

                // might be a nesting at-rule
                if (variableOrRule in css_beautify.NESTED_AT_RULE) {
                    nestedLevel += 1;
                    if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
                        enteringConditionalGroup = true;
                    }
                } else if (': '.indexOf(variableOrRule[variableOrRule.length -1]) >= 0) {
                    //we have a variable, add it and insert one space before continuing
                    next();
                    variableOrRule = eatString(": ").replace(/\s$/, '');
                    output.push(variableOrRule);
                    print.singleSpace();
                }
            } else if (ch === '{') {
                if (peek(true) === '}') {
                    eatWhitespace();
                    next();
                    print.singleSpace();
                    output.push("{}");
                } else {
                    indent();
                    print["{"](ch);
                    // when entering conditional groups, only rulesets are allowed
                    if (enteringConditionalGroup) {
                        enteringConditionalGroup = false;
                        insideRule = (indentLevel > nestedLevel);
                    } else {
                        // otherwise, declarations are also allowed
                        insideRule = (indentLevel >= nestedLevel);
                    }
                }
            } else if (ch === '}') {
                outdent();
                print["}"](ch);
                insideRule = false;
                if (nestedLevel) {
                    nestedLevel--;
                }
            } else if (ch === ":") {
                eatWhitespace();
                if ((insideRule || enteringConditionalGroup) &&
                        !(lookBack("&") || foundNestedPseudoClass())) {
                    // 'property: value' delimiter
                    // which could be in a conditional group query
                    output.push(':');
                    print.singleSpace();
                } else {
                    // sass/less parent reference don't use a space
                    // sass nested pseudo-class don't use a space
                    if (peek() === ":") {
                        // pseudo-element
                        next();
                        output.push("::");
                    } else {
                        // pseudo-class
                        output.push(':');
                    }
                }
            } else if (ch === '"' || ch === '\'') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(eatString(ch));
            } else if (ch === ';') {
                output.push(ch);
                print.newLine();
            } else if (ch === '(') { // may be a url
                if (lookBack("url")) {
                    output.push(ch);
                    eatWhitespace();
                    if (next()) {
                        if (ch !== ')' && ch !== '"' && ch !== '\'') {
                            output.push(eatString(')'));
                        } else {
                            pos--;
                        }
                    }
                } else {
                    if (isAfterSpace) {
                        print.singleSpace();
                    }
                    output.push(ch);
                    eatWhitespace();
                }
            } else if (ch === ')') {
                output.push(ch);
            } else if (ch === ',') {
                output.push(ch);
                eatWhitespace();
                if (!insideRule && selectorSeparatorNewline) {
                    print.newLine();
                } else {
                    print.singleSpace();
                }
            } else if (ch === ']') {
                output.push(ch);
            } else if (ch === '[') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);
            } else if (ch === '=') { // no whitespace before or after
                eatWhitespace();
                output.push(ch);
            } else {
                if (isAfterSpace) {
                    print.singleSpace();
                }

                output.push(ch);
            }
        }


        var sweetCode = output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweetCode += "\n";
        }

        return sweetCode;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    css_beautify.NESTED_AT_RULE = {
        "@page": true,
        "@font-face": true,
        "@keyframes": true,
        // also in CONDITIONAL_GROUP_RULE below
        "@media": true,
        "@supports": true,
        "@document": true
    };
    css_beautify.CONDITIONAL_GROUP_RULE = {
        "@media": true,
        "@supports": true,
        "@document": true
    };

    return {
        css_beautify: css_beautify
    };
});

define('skylark-utils-css/beautify',[
    "./css",
    "./primitives/beautify-css"
], function(css, beautifyCss) {

	return css.beautify = beautifyCss.css_beautify;
});
   /*!
    Parser-Lib
    Copyright (c) 2009-2011 Nicholas C. Zakas. All rights reserved.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

    */
    /* Version v0.2.3, Build time: 19-June-2013 11:16:15 */

define('skylark-utils-css/primitives/parser-lib',[],function(){
    var parserlib = {};


    /**
     * A generic base to inherit from for any object
     * that needs event handling.
     * @class EventTarget
     * @constructor
     */
    function EventTarget(){

        /**
         * The array of listeners for various events.
         * @type Object
         * @property _listeners
         * @private
         */
        this._listeners = {};
    }

    EventTarget.prototype = {

        //restore constructor
        constructor: EventTarget,

        /**
         * Adds a listener for a given event type.
         * @param {String} type The type of event to add a listener for.
         * @param {Function} listener The function to call when the event occurs.
         * @return {void}
         * @method addListener
         */
        addListener: function(type, listener){
            if (!this._listeners[type]){
                this._listeners[type] = [];
            }

            this._listeners[type].push(listener);
        },

        /**
         * Fires an event based on the passed-in object.
         * @param {Object|String} event An object with at least a 'type' attribute
         *      or a string indicating the event name.
         * @return {void}
         * @method fire
         */
        fire: function(event){
            if (typeof event == "string"){
                event = { type: event };
            }
            if (typeof event.target != "undefined"){
                event.target = this;
            }

            if (typeof event.type == "undefined"){
                throw new Error("Event object missing 'type' property.");
            }

            if (this._listeners[event.type]){

                var listeners = this._listeners[event.type].concat();
                for (var i=0, len=listeners.length; i < len; i++){
                    listeners[i].call(this, event);
                }
            }
        },

        /**
         * Removes a listener for a given event type.
         * @param {String} type The type of event to remove a listener from.
         * @param {Function} listener The function to remove from the event.
         * @return {void}
         * @method removeListener
         */
        removeListener: function(type, listener){
            if (this._listeners[type]){
                var listeners = this._listeners[type];
                for (var i=0, len=listeners.length; i < len; i++){
                    if (listeners[i] === listener){
                        listeners.splice(i, 1);
                        break;
                    }
                }


            }
        }
    };
    /**
     * Convenient way to read through strings.
     * @namespace parserlib.util
     * @class StringReader
     * @constructor
     * @param {String} text The text to read.
     */
    function StringReader(text){

        /**
         * The input text with line endings normalized.
         * @property _input
         * @type String
         * @private
         */
        this._input = text.replace(/\n\r?/g, "\n");


        /**
         * The row for the character to be read next.
         * @property _line
         * @type int
         * @private
         */
        this._line = 1;


        /**
         * The column for the character to be read next.
         * @property _col
         * @type int
         * @private
         */
        this._col = 1;

        /**
         * The index of the character in the input to be read next.
         * @property _cursor
         * @type int
         * @private
         */
        this._cursor = 0;
    }

    StringReader.prototype = {

        //restore constructor
        constructor: StringReader,

        //-------------------------------------------------------------------------
        // Position info
        //-------------------------------------------------------------------------

        /**
         * Returns the column of the character to be read next.
         * @return {int} The column of the character to be read next.
         * @method getCol
         */
        getCol: function(){
            return this._col;
        },

        /**
         * Returns the row of the character to be read next.
         * @return {int} The row of the character to be read next.
         * @method getLine
         */
        getLine: function(){
            return this._line ;
        },

        /**
         * Determines if you're at the end of the input.
         * @return {Boolean} True if there's no more input, false otherwise.
         * @method eof
         */
        eof: function(){
            return (this._cursor == this._input.length);
        },

        //-------------------------------------------------------------------------
        // Basic reading
        //-------------------------------------------------------------------------

        /**
         * Reads the next character without advancing the cursor.
         * @param {int} count How many characters to look ahead (default is 1).
         * @return {String} The next character or null if there is no next character.
         * @method peek
         */
        peek: function(count){
            var c = null;
            count = (typeof count == "undefined" ? 1 : count);

            //if we're not at the end of the input...
            if (this._cursor < this._input.length){

                //get character and increment cursor and column
                c = this._input.charAt(this._cursor + count - 1);
            }

            return c;
        },

        /**
         * Reads the next character from the input and adjusts the row and column
         * accordingly.
         * @return {String} The next character or null if there is no next character.
         * @method read
         */
        read: function(){
            var c = null;

            //if we're not at the end of the input...
            if (this._cursor < this._input.length){

                //if the last character was a newline, increment row count
                //and reset column count
                if (this._input.charAt(this._cursor) == "\n"){
                    this._line++;
                    this._col=1;
                } else {
                    this._col++;
                }

                //get character and increment cursor and column
                c = this._input.charAt(this._cursor++);
            }

            return c;
        },

        //-------------------------------------------------------------------------
        // Misc
        //-------------------------------------------------------------------------

        /**
         * Saves the current location so it can be returned to later.
         * @method mark
         * @return {void}
         */
        mark: function(){
            this._bookmark = {
                cursor: this._cursor,
                line:   this._line,
                col:    this._col
            };
        },

        reset: function(){
            if (this._bookmark){
                this._cursor = this._bookmark.cursor;
                this._line = this._bookmark.line;
                this._col = this._bookmark.col;
                delete this._bookmark;
            }
        },

        //-------------------------------------------------------------------------
        // Advanced reading
        //-------------------------------------------------------------------------

        /**
         * Reads up to and including the given string. Throws an error if that
         * string is not found.
         * @param {String} pattern The string to read.
         * @return {String} The string when it is found.
         * @throws Error when the string pattern is not found.
         * @method readTo
         */
        readTo: function(pattern){

            var buffer = "",
                c;

            /*
             * First, buffer must be the same length as the pattern.
             * Then, buffer must end with the pattern or else reach the
             * end of the input.
             */
            while (buffer.length < pattern.length || buffer.lastIndexOf(pattern) != buffer.length - pattern.length){
                c = this.read();
                if (c){
                    buffer += c;
                } else {
                    throw new Error("Expected \"" + pattern + "\" at line " + this._line  + ", col " + this._col + ".");
                }
            }

            return buffer;

        },

        /**
         * Reads characters while each character causes the given
         * filter function to return true. The function is passed
         * in each character and either returns true to continue
         * reading or false to stop.
         * @param {Function} filter The function to read on each character.
         * @return {String} The string made up of all characters that passed the
         *      filter check.
         * @method readWhile
         */
        readWhile: function(filter){

            var buffer = "",
                c = this.read();

            while(c !== null && filter(c)){
                buffer += c;
                c = this.read();
            }

            return buffer;

        },

        /**
         * Reads characters that match either text or a regular expression and
         * returns those characters. If a match is found, the row and column
         * are adjusted; if no match is found, the reader's state is unchanged.
         * reading or false to stop.
         * @param {String|RegExp} matchter If a string, then the literal string
         *      value is searched for. If a regular expression, then any string
         *      matching the pattern is search for.
         * @return {String} The string made up of all characters that matched or
         *      null if there was no match.
         * @method readMatch
         */
        readMatch: function(matcher){

            var source = this._input.substring(this._cursor),
                value = null;

            //if it's a string, just do a straight match
            if (typeof matcher == "string"){
                if (source.indexOf(matcher) === 0){
                    value = this.readCount(matcher.length);
                }
            } else if (matcher instanceof RegExp){
                if (matcher.test(source)){
                    value = this.readCount(RegExp.lastMatch.length);
                }
            }

            return value;
        },


        /**
         * Reads a given number of characters. If the end of the input is reached,
         * it reads only the remaining characters and does not throw an error.
         * @param {int} count The number of characters to read.
         * @return {String} The string made up the read characters.
         * @method readCount
         */
        readCount: function(count){
            var buffer = "";

            while(count--){
                buffer += this.read();
            }

            return buffer;
        }

    };
    /**
     * Type to use when a syntax error occurs.
     * @class SyntaxError
     * @namespace parserlib.util
     * @constructor
     * @param {String} message The error message.
     * @param {int} line The line at which the error occurred.
     * @param {int} col The column at which the error occurred.
     */
    function SyntaxError(message, line, col){

        /**
         * The column at which the error occurred.
         * @type int
         * @property col
         */
        this.col = col;

        /**
         * The line at which the error occurred.
         * @type int
         * @property line
         */
        this.line = line;

        /**
         * The text representation of the unit.
         * @type String
         * @property text
         */
        this.message = message;

    }

    //inherit from Error
    SyntaxError.prototype = new Error();
    /**
     * Base type to represent a single syntactic unit.
     * @class SyntaxUnit
     * @namespace parserlib.util
     * @constructor
     * @param {String} text The text of the unit.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function SyntaxUnit(text, line, col, type){


        /**
         * The column of text on which the unit resides.
         * @type int
         * @property col
         */
        this.col = col;

        /**
         * The line of text on which the unit resides.
         * @type int
         * @property line
         */
        this.line = line;

        /**
         * The text representation of the unit.
         * @type String
         * @property text
         */
        this.text = text;

        /**
         * The type of syntax unit.
         * @type int
         * @property type
         */
        this.type = type;
    }

    /**
     * Create a new syntax unit based solely on the given token.
     * Convenience method for creating a new syntax unit when
     * it represents a single token instead of multiple.
     * @param {Object} token The token object to represent.
     * @return {parserlib.util.SyntaxUnit} The object representing the token.
     * @static
     * @method fromToken
     */
    SyntaxUnit.fromToken = function(token){
        return new SyntaxUnit(token.value, token.startLine, token.startCol);
    };

    SyntaxUnit.prototype = {

        //restore constructor
        constructor: SyntaxUnit,

        /**
         * Returns the text representation of the unit.
         * @return {String} The text representation of the unit.
         * @method valueOf
         */
        valueOf: function(){
            return this.toString();
        },

        /**
         * Returns the text representation of the unit.
         * @return {String} The text representation of the unit.
         * @method toString
         */
        toString: function(){
            return this.text;
        }

    };
    /*global StringReader, SyntaxError*/

    /**
     * Generic TokenStream providing base functionality.
     * @class TokenStreamBase
     * @namespace parserlib.util
     * @constructor
     * @param {String|StringReader} input The text to tokenize or a reader from
     *      which to read the input.
     */
    function TokenStreamBase(input, tokenData){

        /**
         * The string reader for easy access to the text.
         * @type StringReader
         * @property _reader
         * @private
         */
        this._reader = input ? new StringReader(input.toString()) : null;

        /**
         * Token object for the last consumed token.
         * @type Token
         * @property _token
         * @private
         */
        this._token = null;

        /**
         * The array of token information.
         * @type Array
         * @property _tokenData
         * @private
         */
        this._tokenData = tokenData;

        /**
         * Lookahead token buffer.
         * @type Array
         * @property _lt
         * @private
         */
        this._lt = [];

        /**
         * Lookahead token buffer index.
         * @type int
         * @property _ltIndex
         * @private
         */
        this._ltIndex = 0;

        this._ltIndexCache = [];
    }

    /**
     * Accepts an array of token information and outputs
     * an array of token data containing key-value mappings
     * and matching functions that the TokenStream needs.
     * @param {Array} tokens An array of token descriptors.
     * @return {Array} An array of processed token data.
     * @method createTokenData
     * @static
     */
    TokenStreamBase.createTokenData = function(tokens){

        var nameMap     = [],
            typeMap     = {},
            tokenData     = tokens.concat([]),
            i            = 0,
            len            = tokenData.length+1;

        tokenData.UNKNOWN = -1;
        tokenData.unshift({name:"EOF"});

        for (; i < len; i++){
            nameMap.push(tokenData[i].name);
            tokenData[tokenData[i].name] = i;
            if (tokenData[i].text){
                typeMap[tokenData[i].text] = i;
            }
        }

        tokenData.name = function(tt){
            return nameMap[tt];
        };

        tokenData.type = function(c){
            return typeMap[c];
        };

        return tokenData;
    };

    TokenStreamBase.prototype = {

        //restore constructor
        constructor: TokenStreamBase,

        //-------------------------------------------------------------------------
        // Matching methods
        //-------------------------------------------------------------------------

        /**
         * Determines if the next token matches the given token type.
         * If so, that token is consumed; if not, the token is placed
         * back onto the token stream. You can pass in any number of
         * token types and this will return true if any of the token
         * types is found.
         * @param {int|int[]} tokenTypes Either a single token type or an array of
         *      token types that the next token might be. If an array is passed,
         *      it's assumed that the token can be any of these.
         * @param {variant} channel (Optional) The channel to read from. If not
         *      provided, reads from the default (unnamed) channel.
         * @return {Boolean} True if the token type matches, false if not.
         * @method match
         */
        match: function(tokenTypes, channel){

            //always convert to an array, makes things easier
            if (!(tokenTypes instanceof Array)){
                tokenTypes = [tokenTypes];
            }

            var tt  = this.get(channel),
                i   = 0,
                len = tokenTypes.length;

            while(i < len){
                if (tt == tokenTypes[i++]){
                    return true;
                }
            }

            //no match found, put the token back
            this.unget();
            return false;
        },

        /**
         * Determines if the next token matches the given token type.
         * If so, that token is consumed; if not, an error is thrown.
         * @param {int|int[]} tokenTypes Either a single token type or an array of
         *      token types that the next token should be. If an array is passed,
         *      it's assumed that the token must be one of these.
         * @param {variant} channel (Optional) The channel to read from. If not
         *      provided, reads from the default (unnamed) channel.
         * @return {void}
         * @method mustMatch
         */
        mustMatch: function(tokenTypes, channel){

            var token;

            //always convert to an array, makes things easier
            if (!(tokenTypes instanceof Array)){
                tokenTypes = [tokenTypes];
            }

            if (!this.match.apply(this, arguments)){
                token = this.LT(1);
                throw new SyntaxError("Expected " + this._tokenData[tokenTypes[0]].name +
                    " at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
            }
        },

        //-------------------------------------------------------------------------
        // Consuming methods
        //-------------------------------------------------------------------------

        /**
         * Keeps reading from the token stream until either one of the specified
         * token types is found or until the end of the input is reached.
         * @param {int|int[]} tokenTypes Either a single token type or an array of
         *      token types that the next token should be. If an array is passed,
         *      it's assumed that the token must be one of these.
         * @param {variant} channel (Optional) The channel to read from. If not
         *      provided, reads from the default (unnamed) channel.
         * @return {void}
         * @method advance
         */
        advance: function(tokenTypes, channel){

            while(this.LA(0) !== 0 && !this.match(tokenTypes, channel)){
                this.get();
            }

            return this.LA(0);
        },

        /**
         * Consumes the next token from the token stream.
         * @return {int} The token type of the token that was just consumed.
         * @method get
         */
        get: function(channel){

            var tokenInfo   = this._tokenData,
                reader      = this._reader,
                value,
                i           =0,
                len         = tokenInfo.length,
                found       = false,
                token,
                info;

            //check the lookahead buffer first
            if (this._lt.length && this._ltIndex >= 0 && this._ltIndex < this._lt.length){

                i++;
                this._token = this._lt[this._ltIndex++];
                info = tokenInfo[this._token.type];

                //obey channels logic
                while((info.channel !== undefined && channel !== info.channel) &&
                        this._ltIndex < this._lt.length){
                    this._token = this._lt[this._ltIndex++];
                    info = tokenInfo[this._token.type];
                    i++;
                }

                //here be dragons
                if ((info.channel === undefined || channel === info.channel) &&
                        this._ltIndex <= this._lt.length){
                    this._ltIndexCache.push(i);
                    return this._token.type;
                }
            }

            //call token retriever method
            token = this._getToken();

            //if it should be hidden, don't save a token
            if (token.type > -1 && !tokenInfo[token.type].hide){

                //apply token channel
                token.channel = tokenInfo[token.type].channel;

                //save for later
                this._token = token;
                this._lt.push(token);

                //save space that will be moved (must be done before array is truncated)
                this._ltIndexCache.push(this._lt.length - this._ltIndex + i);

                //keep the buffer under 5 items
                if (this._lt.length > 5){
                    this._lt.shift();
                }

                //also keep the shift buffer under 5 items
                if (this._ltIndexCache.length > 5){
                    this._ltIndexCache.shift();
                }

                //update lookahead index
                this._ltIndex = this._lt.length;
            }

            /*
             * Skip to the next token if:
             * 1. The token type is marked as hidden.
             * 2. The token type has a channel specified and it isn't the current channel.
             */
            info = tokenInfo[token.type];
            if (info &&
                    (info.hide ||
                    (info.channel !== undefined && channel !== info.channel))){
                return this.get(channel);
            } else {
                //return just the type
                return token.type;
            }
        },

        /**
         * Looks ahead a certain number of tokens and returns the token type at
         * that position. This will throw an error if you lookahead past the
         * end of input, past the size of the lookahead buffer, or back past
         * the first token in the lookahead buffer.
         * @param {int} The index of the token type to retrieve. 0 for the
         *      current token, 1 for the next, -1 for the previous, etc.
         * @return {int} The token type of the token in the given position.
         * @method LA
         */
        LA: function(index){
            var total = index,
                tt;
            if (index > 0){
                //TODO: Store 5 somewhere
                if (index > 5){
                    throw new Error("Too much lookahead.");
                }

                //get all those tokens
                while(total){
                    tt = this.get();
                    total--;
                }

                //unget all those tokens
                while(total < index){
                    this.unget();
                    total++;
                }
            } else if (index < 0){

                if(this._lt[this._ltIndex+index]){
                    tt = this._lt[this._ltIndex+index].type;
                } else {
                    throw new Error("Too much lookbehind.");
                }

            } else {
                tt = this._token.type;
            }

            return tt;

        },

        /**
         * Looks ahead a certain number of tokens and returns the token at
         * that position. This will throw an error if you lookahead past the
         * end of input, past the size of the lookahead buffer, or back past
         * the first token in the lookahead buffer.
         * @param {int} The index of the token type to retrieve. 0 for the
         *      current token, 1 for the next, -1 for the previous, etc.
         * @return {Object} The token of the token in the given position.
         * @method LA
         */
        LT: function(index){

            //lookahead first to prime the token buffer
            this.LA(index);

            //now find the token, subtract one because _ltIndex is already at the next index
            return this._lt[this._ltIndex+index-1];
        },

        /**
         * Returns the token type for the next token in the stream without
         * consuming it.
         * @return {int} The token type of the next token in the stream.
         * @method peek
         */
        peek: function(){
            return this.LA(1);
        },

        /**
         * Returns the actual token object for the last consumed token.
         * @return {Token} The token object for the last consumed token.
         * @method token
         */
        token: function(){
            return this._token;
        },

        /**
         * Returns the name of the token for the given token type.
         * @param {int} tokenType The type of token to get the name of.
         * @return {String} The name of the token or "UNKNOWN_TOKEN" for any
         *      invalid token type.
         * @method tokenName
         */
        tokenName: function(tokenType){
            if (tokenType < 0 || tokenType > this._tokenData.length){
                return "UNKNOWN_TOKEN";
            } else {
                return this._tokenData[tokenType].name;
            }
        },

        /**
         * Returns the token type value for the given token name.
         * @param {String} tokenName The name of the token whose value should be returned.
         * @return {int} The token type value for the given token name or -1
         *      for an unknown token.
         * @method tokenName
         */
        tokenType: function(tokenName){
            return this._tokenData[tokenName] || -1;
        },

        /**
         * Returns the last consumed token to the token stream.
         * @method unget
         */
        unget: function(){
            //if (this._ltIndex > -1){
            if (this._ltIndexCache.length){
                this._ltIndex -= this._ltIndexCache.pop();//--;
                this._token = this._lt[this._ltIndex - 1];
            } else {
                throw new Error("Too much lookahead.");
            }
        }

    };




    parserlib.util = {
        StringReader: StringReader,
        SyntaxError : SyntaxError,
        SyntaxUnit  : SyntaxUnit,
        EventTarget : EventTarget,
        TokenStreamBase : TokenStreamBase
    };


    var Colors = {
        aliceblue       :"#f0f8ff",
        antiquewhite    :"#faebd7",
        aqua            :"#00ffff",
        aquamarine      :"#7fffd4",
        azure           :"#f0ffff",
        beige           :"#f5f5dc",
        bisque          :"#ffe4c4",
        black           :"#000000",
        blanchedalmond  :"#ffebcd",
        blue            :"#0000ff",
        blueviolet      :"#8a2be2",
        brown           :"#a52a2a",
        burlywood       :"#deb887",
        cadetblue       :"#5f9ea0",
        chartreuse      :"#7fff00",
        chocolate       :"#d2691e",
        coral           :"#ff7f50",
        cornflowerblue  :"#6495ed",
        cornsilk        :"#fff8dc",
        crimson         :"#dc143c",
        cyan            :"#00ffff",
        darkblue        :"#00008b",
        darkcyan        :"#008b8b",
        darkgoldenrod   :"#b8860b",
        darkgray        :"#a9a9a9",
        darkgreen       :"#006400",
        darkkhaki       :"#bdb76b",
        darkmagenta     :"#8b008b",
        darkolivegreen  :"#556b2f",
        darkorange      :"#ff8c00",
        darkorchid      :"#9932cc",
        darkred         :"#8b0000",
        darksalmon      :"#e9967a",
        darkseagreen    :"#8fbc8f",
        darkslateblue   :"#483d8b",
        darkslategray   :"#2f4f4f",
        darkturquoise   :"#00ced1",
        darkviolet      :"#9400d3",
        deeppink        :"#ff1493",
        deepskyblue     :"#00bfff",
        dimgray         :"#696969",
        dodgerblue      :"#1e90ff",
        firebrick       :"#b22222",
        floralwhite     :"#fffaf0",
        forestgreen     :"#228b22",
        fuchsia         :"#ff00ff",
        gainsboro       :"#dcdcdc",
        ghostwhite      :"#f8f8ff",
        gold            :"#ffd700",
        goldenrod       :"#daa520",
        gray            :"#808080",
        green           :"#008000",
        greenyellow     :"#adff2f",
        honeydew        :"#f0fff0",
        hotpink         :"#ff69b4",
        indianred       :"#cd5c5c",
        indigo          :"#4b0082",
        ivory           :"#fffff0",
        khaki           :"#f0e68c",
        lavender        :"#e6e6fa",
        lavenderblush   :"#fff0f5",
        lawngreen       :"#7cfc00",
        lemonchiffon    :"#fffacd",
        lightblue       :"#add8e6",
        lightcoral      :"#f08080",
        lightcyan       :"#e0ffff",
        lightgoldenrodyellow  :"#fafad2",
        lightgray       :"#d3d3d3",
        lightgreen      :"#90ee90",
        lightpink       :"#ffb6c1",
        lightsalmon     :"#ffa07a",
        lightseagreen   :"#20b2aa",
        lightskyblue    :"#87cefa",
        lightslategray  :"#778899",
        lightsteelblue  :"#b0c4de",
        lightyellow     :"#ffffe0",
        lime            :"#00ff00",
        limegreen       :"#32cd32",
        linen           :"#faf0e6",
        magenta         :"#ff00ff",
        maroon          :"#800000",
        mediumaquamarine:"#66cdaa",
        mediumblue      :"#0000cd",
        mediumorchid    :"#ba55d3",
        mediumpurple    :"#9370d8",
        mediumseagreen  :"#3cb371",
        mediumslateblue :"#7b68ee",
        mediumspringgreen   :"#00fa9a",
        mediumturquoise :"#48d1cc",
        mediumvioletred :"#c71585",
        midnightblue    :"#191970",
        mintcream       :"#f5fffa",
        mistyrose       :"#ffe4e1",
        moccasin        :"#ffe4b5",
        navajowhite     :"#ffdead",
        navy            :"#000080",
        oldlace         :"#fdf5e6",
        olive           :"#808000",
        olivedrab       :"#6b8e23",
        orange          :"#ffa500",
        orangered       :"#ff4500",
        orchid          :"#da70d6",
        palegoldenrod   :"#eee8aa",
        palegreen       :"#98fb98",
        paleturquoise   :"#afeeee",
        palevioletred   :"#d87093",
        papayawhip      :"#ffefd5",
        peachpuff       :"#ffdab9",
        peru            :"#cd853f",
        pink            :"#ffc0cb",
        plum            :"#dda0dd",
        powderblue      :"#b0e0e6",
        purple          :"#800080",
        red             :"#ff0000",
        rosybrown       :"#bc8f8f",
        royalblue       :"#4169e1",
        saddlebrown     :"#8b4513",
        salmon          :"#fa8072",
        sandybrown      :"#f4a460",
        seagreen        :"#2e8b57",
        seashell        :"#fff5ee",
        sienna          :"#a0522d",
        silver          :"#c0c0c0",
        skyblue         :"#87ceeb",
        slateblue       :"#6a5acd",
        slategray       :"#708090",
        snow            :"#fffafa",
        springgreen     :"#00ff7f",
        steelblue       :"#4682b4",
        tan             :"#d2b48c",
        teal            :"#008080",
        thistle         :"#d8bfd8",
        tomato          :"#ff6347",
        turquoise       :"#40e0d0",
        violet          :"#ee82ee",
        wheat           :"#f5deb3",
        white           :"#ffffff",
        whitesmoke      :"#f5f5f5",
        yellow          :"#ffff00",
        yellowgreen     :"#9acd32",
        //CSS2 system colors http://www.w3.org/TR/css3-color/#css2-system
        activeBorder        :"Active window border.",
        activecaption       :"Active window caption.",
        appworkspace        :"Background color of multiple document interface.",
        background          :"Desktop background.",
        buttonface          :"The face background color for 3-D elements that appear 3-D due to one layer of surrounding border.",
        buttonhighlight     :"The color of the border facing the light source for 3-D elements that appear 3-D due to one layer of surrounding border.",
        buttonshadow        :"The color of the border away from the light source for 3-D elements that appear 3-D due to one layer of surrounding border.",
        buttontext          :"Text on push buttons.",
        captiontext         :"Text in caption, size box, and scrollbar arrow box.",
        graytext            :"Grayed (disabled) text. This color is set to #000 if the current display driver does not support a solid gray color.",
        highlight           :"Item(s) selected in a control.",
        highlighttext       :"Text of item(s) selected in a control.",
        inactiveborder      :"Inactive window border.",
        inactivecaption     :"Inactive window caption.",
        inactivecaptiontext :"Color of text in an inactive caption.",
        infobackground      :"Background color for tooltip controls.",
        infotext            :"Text color for tooltip controls.",
        menu                :"Menu background.",
        menutext            :"Text in menus.",
        scrollbar           :"Scroll bar gray area.",
        threeddarkshadow    :"The color of the darker (generally outer) of the two borders away from the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
        threedface          :"The face background color for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
        threedhighlight     :"The color of the lighter (generally outer) of the two borders facing the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
        threedlightshadow   :"The color of the darker (generally inner) of the two borders facing the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
        threedshadow        :"The color of the lighter (generally inner) of the two borders away from the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
        window              :"Window background.",
        windowframe         :"Window frame.",
        windowtext          :"Text in windows."
    };
    /*global SyntaxUnit, Parser*/
    /**
     * Represents a selector combinator (whitespace, +, >).
     * @namespace parserlib.css
     * @class Combinator
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {String} text The text representation of the unit.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function Combinator(text, line, col){

        SyntaxUnit.call(this, text, line, col, Parser.COMBINATOR_TYPE);

        /**
         * The type of modifier.
         * @type String
         * @property type
         */
        this.type = "unknown";

        //pretty simple
        if (/^\s+$/.test(text)){
            this.type = "descendant";
        } else if (text == ">"){
            this.type = "child";
        } else if (text == "+"){
            this.type = "adjacent-sibling";
        } else if (text == "~"){
            this.type = "sibling";
        }

    }

    Combinator.prototype = new SyntaxUnit();
    Combinator.prototype.constructor = Combinator;


    /*global SyntaxUnit, Parser*/
    /**
     * Represents a media feature, such as max-width:500.
     * @namespace parserlib.css
     * @class MediaFeature
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {SyntaxUnit} name The name of the feature.
     * @param {SyntaxUnit} value The value of the feature or null if none.
     */
    function MediaFeature(name, value){

        SyntaxUnit.call(this, "(" + name + (value !== null ? ":" + value : "") + ")", name.startLine, name.startCol, Parser.MEDIA_FEATURE_TYPE);

        /**
         * The name of the media feature
         * @type String
         * @property name
         */
        this.name = name;

        /**
         * The value for the feature or null if there is none.
         * @type SyntaxUnit
         * @property value
         */
        this.value = value;
    }

    MediaFeature.prototype = new SyntaxUnit();
    MediaFeature.prototype.constructor = MediaFeature;


    /*global SyntaxUnit, Parser*/
    /**
     * Represents an individual media query.
     * @namespace parserlib.css
     * @class MediaQuery
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {String} modifier The modifier "not" or "only" (or null).
     * @param {String} mediaType The type of media (i.e., "print").
     * @param {Array} parts Array of selectors parts making up this selector.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function MediaQuery(modifier, mediaType, features, line, col){

        SyntaxUnit.call(this, (modifier ? modifier + " ": "") + (mediaType ? mediaType : "") + (mediaType && features.length > 0 ? " and " : "") + features.join(" and "), line, col, Parser.MEDIA_QUERY_TYPE);

        /**
         * The media modifier ("not" or "only")
         * @type String
         * @property modifier
         */
        this.modifier = modifier;

        /**
         * The mediaType (i.e., "print")
         * @type String
         * @property mediaType
         */
        this.mediaType = mediaType;

        /**
         * The parts that make up the selector.
         * @type Array
         * @property features
         */
        this.features = features;

    }

    MediaQuery.prototype = new SyntaxUnit();
    MediaQuery.prototype.constructor = MediaQuery;


    /*global Tokens, TokenStream, SyntaxError, Properties, Validation, ValidationError, SyntaxUnit,
        PropertyValue, PropertyValuePart, SelectorPart, SelectorSubPart, Selector,
        PropertyName, Combinator, MediaFeature, MediaQuery, EventTarget */

    /**
     * A CSS3 parser.
     * @namespace parserlib.css
     * @class Parser
     * @constructor
     * @param {Object} options (Optional) Various options for the parser:
     *      starHack (true|false) to allow IE6 star hack as valid,
     *      underscoreHack (true|false) to interpret leading underscores
     *      as IE6-7 targeting for known properties, ieFilters (true|false)
     *      to indicate that IE < 8 filters should be accepted and not throw
     *      syntax errors.
     */
    function Parser(options){

        //inherit event functionality
        EventTarget.call(this);


        this.options = options || {};

        this._tokenStream = null;
    }

    //Static constants
    Parser.DEFAULT_TYPE = 0;
    Parser.COMBINATOR_TYPE = 1;
    Parser.MEDIA_FEATURE_TYPE = 2;
    Parser.MEDIA_QUERY_TYPE = 3;
    Parser.PROPERTY_NAME_TYPE = 4;
    Parser.PROPERTY_VALUE_TYPE = 5;
    Parser.PROPERTY_VALUE_PART_TYPE = 6;
    Parser.SELECTOR_TYPE = 7;
    Parser.SELECTOR_PART_TYPE = 8;
    Parser.SELECTOR_SUB_PART_TYPE = 9;

    Parser.prototype = function(){

        var proto = new EventTarget(),  //new prototype
            prop,
            additions =  {

                //restore constructor
                constructor: Parser,

                //instance constants - yuck
                DEFAULT_TYPE : 0,
                COMBINATOR_TYPE : 1,
                MEDIA_FEATURE_TYPE : 2,
                MEDIA_QUERY_TYPE : 3,
                PROPERTY_NAME_TYPE : 4,
                PROPERTY_VALUE_TYPE : 5,
                PROPERTY_VALUE_PART_TYPE : 6,
                SELECTOR_TYPE : 7,
                SELECTOR_PART_TYPE : 8,
                SELECTOR_SUB_PART_TYPE : 9,

                //-----------------------------------------------------------------
                // Grammar
                //-----------------------------------------------------------------

                _stylesheet: function(){

                    /*
                     * stylesheet
                     *  : [ CHARSET_SYM S* STRING S* ';' ]?
                     *    [S|CDO|CDC]* [ import [S|CDO|CDC]* ]*
                     *    [ namespace [S|CDO|CDC]* ]*
                     *    [ [ ruleset | media | page | font_face | keyframes ] [S|CDO|CDC]* ]*
                     *  ;
                     */

                    var tokenStream = this._tokenStream,
                        charset     = null,
                        count,
                        token,
                        tt;

                    this.fire("startstylesheet");

                    //try to read character set
                    this._charset();

                    this._skipCruft();

                    //try to read imports - may be more than one
                    while (tokenStream.peek() == Tokens.IMPORT_SYM){
                        this._import();
                        this._skipCruft();
                    }

                    //try to read namespaces - may be more than one
                    while (tokenStream.peek() == Tokens.NAMESPACE_SYM){
                        this._namespace();
                        this._skipCruft();
                    }

                    //get the next token
                    tt = tokenStream.peek();

                    //try to read the rest
                    while(tt > Tokens.EOF){

                        try {

                            switch(tt){
                                case Tokens.MEDIA_SYM:
                                    this._media();
                                    this._skipCruft();
                                    break;
                                case Tokens.PAGE_SYM:
                                    this._page();
                                    this._skipCruft();
                                    break;
                                case Tokens.FONT_FACE_SYM:
                                    this._font_face();
                                    this._skipCruft();
                                    break;
                                case Tokens.KEYFRAMES_SYM:
                                    this._keyframes();
                                    this._skipCruft();
                                    break;
                                case Tokens.VIEWPORT_SYM:
                                    this._viewport();
                                    this._skipCruft();
                                    break;
                                case Tokens.UNKNOWN_SYM:  //unknown @ rule
                                    tokenStream.get();
                                    if (!this.options.strict){

                                        //fire error event
                                        this.fire({
                                            type:       "error",
                                            error:      null,
                                            message:    "Unknown @ rule: " + tokenStream.LT(0).value + ".",
                                            line:       tokenStream.LT(0).startLine,
                                            col:        tokenStream.LT(0).startCol
                                        });

                                        //skip braces
                                        count=0;
                                        while (tokenStream.advance([Tokens.LBRACE, Tokens.RBRACE]) == Tokens.LBRACE){
                                            count++;    //keep track of nesting depth
                                        }

                                        while(count){
                                            tokenStream.advance([Tokens.RBRACE]);
                                            count--;
                                        }

                                    } else {
                                        //not a syntax error, rethrow it
                                        throw new SyntaxError("Unknown @ rule.", tokenStream.LT(0).startLine, tokenStream.LT(0).startCol);
                                    }
                                    break;
                                case Tokens.S:
                                    this._readWhitespace();
                                    break;
                                default:
                                    if(!this._ruleset()){

                                        //error handling for known issues
                                        switch(tt){
                                            case Tokens.CHARSET_SYM:
                                                token = tokenStream.LT(1);
                                                this._charset(false);
                                                throw new SyntaxError("@charset not allowed here.", token.startLine, token.startCol);
                                            case Tokens.IMPORT_SYM:
                                                token = tokenStream.LT(1);
                                                this._import(false);
                                                throw new SyntaxError("@import not allowed here.", token.startLine, token.startCol);
                                            case Tokens.NAMESPACE_SYM:
                                                token = tokenStream.LT(1);
                                                this._namespace(false);
                                                throw new SyntaxError("@namespace not allowed here.", token.startLine, token.startCol);
                                            default:
                                                tokenStream.get();  //get the last token
                                                this._unexpectedToken(tokenStream.token());
                                        }

                                    }
                            }
                        } catch(ex) {
                            if (ex instanceof SyntaxError && !this.options.strict){
                                this.fire({
                                    type:       "error",
                                    error:      ex,
                                    message:    ex.message,
                                    line:       ex.line,
                                    col:        ex.col
                                });
                            } else {
                                throw ex;
                            }
                        }

                        tt = tokenStream.peek();
                    }

                    if (tt != Tokens.EOF){
                        this._unexpectedToken(tokenStream.token());
                    }

                    this.fire("endstylesheet");
                },

                _charset: function(emit){
                    var tokenStream = this._tokenStream,
                        charset,
                        token,
                        line,
                        col;

                    if (tokenStream.match(Tokens.CHARSET_SYM)){
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;

                        this._readWhitespace();
                        tokenStream.mustMatch(Tokens.STRING);

                        token = tokenStream.token();
                        charset = token.value;

                        this._readWhitespace();
                        tokenStream.mustMatch(Tokens.SEMICOLON);

                        if (emit !== false){
                            this.fire({
                                type:   "charset",
                                charset:charset,
                                line:   line,
                                col:    col
                            });
                        }
                    }
                },

                _import: function(emit){
                    /*
                     * import
                     *   : IMPORT_SYM S*
                     *    [STRING|URI] S* media_query_list? ';' S*
                     */

                    var tokenStream = this._tokenStream,
                        tt,
                        uri,
                        importToken,
                        mediaList   = [];

                    //read import symbol
                    tokenStream.mustMatch(Tokens.IMPORT_SYM);
                    importToken = tokenStream.token();
                    this._readWhitespace();

                    tokenStream.mustMatch([Tokens.STRING, Tokens.URI]);

                    //grab the URI value
                    uri = tokenStream.token().value.replace(/(?:url\()?["']([^"']+)["']\)?/, "$1");

                    this._readWhitespace();

                    mediaList = this._media_query_list();

                    //must end with a semicolon
                    tokenStream.mustMatch(Tokens.SEMICOLON);
                    this._readWhitespace();

                    if (emit !== false){
                        this.fire({
                            type:   "import",
                            uri:    uri,
                            media:  mediaList,
                            line:   importToken.startLine,
                            col:    importToken.startCol
                        });
                    }

                },

                _namespace: function(emit){
                    /*
                     * namespace
                     *   : NAMESPACE_SYM S* [namespace_prefix S*]? [STRING|URI] S* ';' S*
                     */

                    var tokenStream = this._tokenStream,
                        line,
                        col,
                        prefix,
                        uri;

                    //read import symbol
                    tokenStream.mustMatch(Tokens.NAMESPACE_SYM);
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;
                    this._readWhitespace();

                    //it's a namespace prefix - no _namespace_prefix() method because it's just an IDENT
                    if (tokenStream.match(Tokens.IDENT)){
                        prefix = tokenStream.token().value;
                        this._readWhitespace();
                    }

                    tokenStream.mustMatch([Tokens.STRING, Tokens.URI]);
                    /*if (!tokenStream.match(Tokens.STRING)){
                        tokenStream.mustMatch(Tokens.URI);
                    }*/

                    //grab the URI value
                    uri = tokenStream.token().value.replace(/(?:url\()?["']([^"']+)["']\)?/, "$1");

                    this._readWhitespace();

                    //must end with a semicolon
                    tokenStream.mustMatch(Tokens.SEMICOLON);
                    this._readWhitespace();

                    if (emit !== false){
                        this.fire({
                            type:   "namespace",
                            prefix: prefix,
                            uri:    uri,
                            line:   line,
                            col:    col
                        });
                    }

                },

                _media: function(){
                    /*
                     * media
                     *   : MEDIA_SYM S* media_query_list S* '{' S* ruleset* '}' S*
                     *   ;
                     */
                    var tokenStream     = this._tokenStream,
                        line,
                        col,
                        mediaList;//       = [];

                    //look for @media
                    tokenStream.mustMatch(Tokens.MEDIA_SYM);
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;

                    this._readWhitespace();

                    mediaList = this._media_query_list();

                    tokenStream.mustMatch(Tokens.LBRACE);
                    this._readWhitespace();

                    this.fire({
                        type:   "startmedia",
                        media:  mediaList,
                        line:   line,
                        col:    col
                    });

                    while(true) {
                        if (tokenStream.peek() == Tokens.PAGE_SYM){
                            this._page();
                        } else   if (tokenStream.peek() == Tokens.FONT_FACE_SYM){
                            this._font_face();
                        } else if (!this._ruleset()){
                            break;
                        }
                    }

                    tokenStream.mustMatch(Tokens.RBRACE);
                    this._readWhitespace();

                    this.fire({
                        type:   "endmedia",
                        media:  mediaList,
                        line:   line,
                        col:    col
                    });
                },


                //CSS3 Media Queries
                _media_query_list: function(){
                    /*
                     * media_query_list
                     *   : S* [media_query [ ',' S* media_query ]* ]?
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        mediaList   = [];


                    this._readWhitespace();

                    if (tokenStream.peek() == Tokens.IDENT || tokenStream.peek() == Tokens.LPAREN){
                        mediaList.push(this._media_query());
                    }

                    while(tokenStream.match(Tokens.COMMA)){
                        this._readWhitespace();
                        mediaList.push(this._media_query());
                    }

                    return mediaList;
                },

                /*
                 * Note: "expression" in the grammar maps to the _media_expression
                 * method.

                 */
                _media_query: function(){
                    /*
                     * media_query
                     *   : [ONLY | NOT]? S* media_type S* [ AND S* expression ]*
                     *   | expression [ AND S* expression ]*
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        type        = null,
                        ident       = null,
                        token       = null,
                        expressions = [];

                    if (tokenStream.match(Tokens.IDENT)){
                        ident = tokenStream.token().value.toLowerCase();

                        //since there's no custom tokens for these, need to manually check
                        if (ident != "only" && ident != "not"){
                            tokenStream.unget();
                            ident = null;
                        } else {
                            token = tokenStream.token();
                        }
                    }

                    this._readWhitespace();

                    if (tokenStream.peek() == Tokens.IDENT){
                        type = this._media_type();
                        if (token === null){
                            token = tokenStream.token();
                        }
                    } else if (tokenStream.peek() == Tokens.LPAREN){
                        if (token === null){
                            token = tokenStream.LT(1);
                        }
                        expressions.push(this._media_expression());
                    }

                    if (type === null && expressions.length === 0){
                        return null;
                    } else {
                        this._readWhitespace();
                        while (tokenStream.match(Tokens.IDENT)){
                            if (tokenStream.token().value.toLowerCase() != "and"){
                                this._unexpectedToken(tokenStream.token());
                            }

                            this._readWhitespace();
                            expressions.push(this._media_expression());
                        }
                    }

                    return new MediaQuery(ident, type, expressions, token.startLine, token.startCol);
                },

                //CSS3 Media Queries
                _media_type: function(){
                    /*
                     * media_type
                     *   : IDENT
                     *   ;
                     */
                    return this._media_feature();
                },

                /**
                 * Note: in CSS3 Media Queries, this is called "expression".
                 * Renamed here to avoid conflict with CSS3 Selectors
                 * definition of "expression". Also note that "expr" in the
                 * grammar now maps to "expression" from CSS3 selectors.
                 * @method _media_expression
                 * @private
                 */
                _media_expression: function(){
                    /*
                     * expression
                     *  : '(' S* media_feature S* [ ':' S* expr ]? ')' S*
                     *  ;
                     */
                    var tokenStream = this._tokenStream,
                        feature     = null,
                        token,
                        expression  = null;

                    tokenStream.mustMatch(Tokens.LPAREN);

                    feature = this._media_feature();
                    this._readWhitespace();

                    if (tokenStream.match(Tokens.COLON)){
                        this._readWhitespace();
                        token = tokenStream.LT(1);
                        expression = this._expression();
                    }

                    tokenStream.mustMatch(Tokens.RPAREN);
                    this._readWhitespace();

                    return new MediaFeature(feature, (expression ? new SyntaxUnit(expression, token.startLine, token.startCol) : null));
                },

                //CSS3 Media Queries
                _media_feature: function(){
                    /*
                     * media_feature
                     *   : IDENT
                     *   ;
                     */
                    var tokenStream = this._tokenStream;

                    tokenStream.mustMatch(Tokens.IDENT);

                    return SyntaxUnit.fromToken(tokenStream.token());
                },

                //CSS3 Paged Media
                _page: function(){
                    /*
                     * page:
                     *    PAGE_SYM S* IDENT? pseudo_page? S*
                     *    '{' S* [ declaration | margin ]? [ ';' S* [ declaration | margin ]? ]* '}' S*
                     *    ;
                     */
                    var tokenStream = this._tokenStream,
                        line,
                        col,
                        identifier  = null,
                        pseudoPage  = null;

                    //look for @page
                    tokenStream.mustMatch(Tokens.PAGE_SYM);
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;

                    this._readWhitespace();

                    if (tokenStream.match(Tokens.IDENT)){
                        identifier = tokenStream.token().value;

                        //The value 'auto' may not be used as a page name and MUST be treated as a syntax error.
                        if (identifier.toLowerCase() === "auto"){
                            this._unexpectedToken(tokenStream.token());
                        }
                    }

                    //see if there's a colon upcoming
                    if (tokenStream.peek() == Tokens.COLON){
                        pseudoPage = this._pseudo_page();
                    }

                    this._readWhitespace();

                    this.fire({
                        type:   "startpage",
                        id:     identifier,
                        pseudo: pseudoPage,
                        line:   line,
                        col:    col
                    });

                    this._readDeclarations(true, true);

                    this.fire({
                        type:   "endpage",
                        id:     identifier,
                        pseudo: pseudoPage,
                        line:   line,
                        col:    col
                    });

                },

                //CSS3 Paged Media
                _margin: function(){
                    /*
                     * margin :
                     *    margin_sym S* '{' declaration [ ';' S* declaration? ]* '}' S*
                     *    ;
                     */
                    var tokenStream = this._tokenStream,
                        line,
                        col,
                        marginSym   = this._margin_sym();

                    if (marginSym){
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;

                        this.fire({
                            type: "startpagemargin",
                            margin: marginSym,
                            line:   line,
                            col:    col
                        });

                        this._readDeclarations(true);

                        this.fire({
                            type: "endpagemargin",
                            margin: marginSym,
                            line:   line,
                            col:    col
                        });
                        return true;
                    } else {
                        return false;
                    }
                },

                //CSS3 Paged Media
                _margin_sym: function(){

                    /*
                     * margin_sym :
                     *    TOPLEFTCORNER_SYM |
                     *    TOPLEFT_SYM |
                     *    TOPCENTER_SYM |
                     *    TOPRIGHT_SYM |
                     *    TOPRIGHTCORNER_SYM |
                     *    BOTTOMLEFTCORNER_SYM |
                     *    BOTTOMLEFT_SYM |
                     *    BOTTOMCENTER_SYM |
                     *    BOTTOMRIGHT_SYM |
                     *    BOTTOMRIGHTCORNER_SYM |
                     *    LEFTTOP_SYM |
                     *    LEFTMIDDLE_SYM |
                     *    LEFTBOTTOM_SYM |
                     *    RIGHTTOP_SYM |
                     *    RIGHTMIDDLE_SYM |
                     *    RIGHTBOTTOM_SYM
                     *    ;
                     */

                    var tokenStream = this._tokenStream;

                    if(tokenStream.match([Tokens.TOPLEFTCORNER_SYM, Tokens.TOPLEFT_SYM,
                            Tokens.TOPCENTER_SYM, Tokens.TOPRIGHT_SYM, Tokens.TOPRIGHTCORNER_SYM,
                            Tokens.BOTTOMLEFTCORNER_SYM, Tokens.BOTTOMLEFT_SYM,
                            Tokens.BOTTOMCENTER_SYM, Tokens.BOTTOMRIGHT_SYM,
                            Tokens.BOTTOMRIGHTCORNER_SYM, Tokens.LEFTTOP_SYM,
                            Tokens.LEFTMIDDLE_SYM, Tokens.LEFTBOTTOM_SYM, Tokens.RIGHTTOP_SYM,
                            Tokens.RIGHTMIDDLE_SYM, Tokens.RIGHTBOTTOM_SYM]))
                    {
                        return SyntaxUnit.fromToken(tokenStream.token());
                    } else {
                        return null;
                    }

                },

                _pseudo_page: function(){
                    /*
                     * pseudo_page
                     *   : ':' IDENT
                     *   ;
                     */

                    var tokenStream = this._tokenStream;

                    tokenStream.mustMatch(Tokens.COLON);
                    tokenStream.mustMatch(Tokens.IDENT);

                    //TODO: CSS3 Paged Media says only "left", "center", and "right" are allowed

                    return tokenStream.token().value;
                },

                _font_face: function(){
                    /*
                     * font_face
                     *   : FONT_FACE_SYM S*
                     *     '{' S* declaration [ ';' S* declaration ]* '}' S*
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        line,
                        col;

                    //look for @page
                    tokenStream.mustMatch(Tokens.FONT_FACE_SYM);
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;

                    this._readWhitespace();

                    this.fire({
                        type:   "startfontface",
                        line:   line,
                        col:    col
                    });

                    this._readDeclarations(true);

                    this.fire({
                        type:   "endfontface",
                        line:   line,
                        col:    col
                    });
                },

                _viewport: function(){
                    /*
                     * viewport
                     *   : VIEWPORT_SYM S*
                     *     '{' S* declaration? [ ';' S* declaration? ]* '}' S*
                     *   ;
                     */
                     var tokenStream = this._tokenStream,
                        line,
                        col;

                        tokenStream.mustMatch(Tokens.VIEWPORT_SYM);
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;

                        this._readWhitespace();

                        this.fire({
                            type:   "startviewport",
                            line:   line,
                            col:    col
                        });

                        this._readDeclarations(true);

                        this.fire({
                            type:   "endviewport",
                            line:   line,
                            col:    col
                        });

                },

                _operator: function(inFunction){

                    /*
                     * operator (outside function)
                     *  : '/' S* | ',' S* | /( empty )/
                     * operator (inside function)
                     *  : '/' S* | '+' S* | '*' S* | '-' S* /( empty )/
                     *  ;
                     */

                    var tokenStream = this._tokenStream,
                        token       = null;

                    if (tokenStream.match([Tokens.SLASH, Tokens.COMMA]) ||
                        (inFunction && tokenStream.match([Tokens.PLUS, Tokens.STAR, Tokens.MINUS]))){
                        token =  tokenStream.token();
                        this._readWhitespace();
                    }
                    return token ? PropertyValuePart.fromToken(token) : null;

                },

                _combinator: function(){

                    /*
                     * combinator
                     *  : PLUS S* | GREATER S* | TILDE S* | S+
                     *  ;
                     */

                    var tokenStream = this._tokenStream,
                        value       = null,
                        token;

                    if(tokenStream.match([Tokens.PLUS, Tokens.GREATER, Tokens.TILDE])){
                        token = tokenStream.token();
                        value = new Combinator(token.value, token.startLine, token.startCol);
                        this._readWhitespace();
                    }

                    return value;
                },

                _unary_operator: function(){

                    /*
                     * unary_operator
                     *  : '-' | '+'
                     *  ;
                     */

                    var tokenStream = this._tokenStream;

                    if (tokenStream.match([Tokens.MINUS, Tokens.PLUS])){
                        return tokenStream.token().value;
                    } else {
                        return null;
                    }
                },

                _property: function(){

                    /*
                     * property
                     *   : IDENT S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        value       = null,
                        hack        = null,
                        tokenValue,
                        token,
                        line,
                        col;

                    //check for star hack - throws error if not allowed
                    if (tokenStream.peek() == Tokens.STAR && this.options.starHack){
                        tokenStream.get();
                        token = tokenStream.token();
                        hack = token.value;
                        line = token.startLine;
                        col = token.startCol;
                    }

                    if(tokenStream.match(Tokens.IDENT)){
                        token = tokenStream.token();
                        tokenValue = token.value;

                        //check for underscore hack - no error if not allowed because it's valid CSS syntax
                        if (tokenValue.charAt(0) == "_" && this.options.underscoreHack){
                            hack = "_";
                            tokenValue = tokenValue.substring(1);
                        }

                        value = new PropertyName(tokenValue, hack, (line||token.startLine), (col||token.startCol));
                        this._readWhitespace();
                    }

                    return value;
                },

                //Augmented with CSS3 Selectors
                _ruleset: function(){
                    /*
                     * ruleset
                     *   : selectors_group
                     *     '{' S* declaration? [ ';' S* declaration? ]* '}' S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        tt,
                        selectors;


                    /*
                     * Error Recovery: If even a single selector fails to parse,
                     * then the entire ruleset should be thrown away.
                     */
                    try {
                        selectors = this._selectors_group();
                    } catch (ex){
                        if (ex instanceof SyntaxError && !this.options.strict){

                            //fire error event
                            this.fire({
                                type:       "error",
                                error:      ex,
                                message:    ex.message,
                                line:       ex.line,
                                col:        ex.col
                            });

                            //skip over everything until closing brace
                            tt = tokenStream.advance([Tokens.RBRACE]);
                            if (tt == Tokens.RBRACE){
                                //if there's a right brace, the rule is finished so don't do anything
                            } else {
                                //otherwise, rethrow the error because it wasn't handled properly
                                throw ex;
                            }

                        } else {
                            //not a syntax error, rethrow it
                            throw ex;
                        }

                        //trigger parser to continue
                        return true;
                    }

                    //if it got here, all selectors parsed
                    if (selectors){

                        this.fire({
                            type:       "startrule",
                            selectors:  selectors,
                            line:       selectors[0].line,
                            col:        selectors[0].col
                        });

                        this._readDeclarations(true);

                        this.fire({
                            type:       "endrule",
                            selectors:  selectors,
                            line:       selectors[0].line,
                            col:        selectors[0].col
                        });

                    }

                    return selectors;

                },

                //CSS3 Selectors
                _selectors_group: function(){

                    /*
                     * selectors_group
                     *   : selector [ COMMA S* selector ]*
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        selectors   = [],
                        selector;

                    selector = this._selector();
                    if (selector !== null){

                        selectors.push(selector);
                        while(tokenStream.match(Tokens.COMMA)){
                            this._readWhitespace();
                            selector = this._selector();
                            if (selector !== null){
                                selectors.push(selector);
                            } else {
                                this._unexpectedToken(tokenStream.LT(1));
                            }
                        }
                    }

                    return selectors.length ? selectors : null;
                },

                //CSS3 Selectors
                _selector: function(){
                    /*
                     * selector
                     *   : simple_selector_sequence [ combinator simple_selector_sequence ]*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        selector    = [],
                        nextSelector = null,
                        combinator  = null,
                        ws          = null;

                    //if there's no simple selector, then there's no selector
                    nextSelector = this._simple_selector_sequence();
                    if (nextSelector === null){
                        return null;
                    }

                    selector.push(nextSelector);

                    do {

                        //look for a combinator
                        combinator = this._combinator();

                        if (combinator !== null){
                            selector.push(combinator);
                            nextSelector = this._simple_selector_sequence();

                            //there must be a next selector
                            if (nextSelector === null){
                                this._unexpectedToken(tokenStream.LT(1));
                            } else {

                                //nextSelector is an instance of SelectorPart
                                selector.push(nextSelector);
                            }
                        } else {

                            //if there's not whitespace, we're done
                            if (this._readWhitespace()){

                                //add whitespace separator
                                ws = new Combinator(tokenStream.token().value, tokenStream.token().startLine, tokenStream.token().startCol);

                                //combinator is not required
                                combinator = this._combinator();

                                //selector is required if there's a combinator
                                nextSelector = this._simple_selector_sequence();
                                if (nextSelector === null){
                                    if (combinator !== null){
                                        this._unexpectedToken(tokenStream.LT(1));
                                    }
                                } else {

                                    if (combinator !== null){
                                        selector.push(combinator);
                                    } else {
                                        selector.push(ws);
                                    }

                                    selector.push(nextSelector);
                                }
                            } else {
                                break;
                            }

                        }
                    } while(true);

                    return new Selector(selector, selector[0].line, selector[0].col);
                },

                //CSS3 Selectors
                _simple_selector_sequence: function(){
                    /*
                     * simple_selector_sequence
                     *   : [ type_selector | universal ]
                     *     [ HASH | class | attrib | pseudo | negation ]*
                     *   | [ HASH | class | attrib | pseudo | negation ]+
                     *   ;
                     */

                    var tokenStream = this._tokenStream,

                        //parts of a simple selector
                        elementName = null,
                        modifiers   = [],

                        //complete selector text
                        selectorText= "",

                        //the different parts after the element name to search for
                        components  = [
                            //HASH
                            function(){
                                return tokenStream.match(Tokens.HASH) ?
                                        new SelectorSubPart(tokenStream.token().value, "id", tokenStream.token().startLine, tokenStream.token().startCol) :
                                        null;
                            },
                            this._class,
                            this._attrib,
                            this._pseudo,
                            this._negation
                        ],
                        i           = 0,
                        len         = components.length,
                        component   = null,
                        found       = false,
                        line,
                        col;


                    //get starting line and column for the selector
                    line = tokenStream.LT(1).startLine;
                    col = tokenStream.LT(1).startCol;

                    elementName = this._type_selector();
                    if (!elementName){
                        elementName = this._universal();
                    }

                    if (elementName !== null){
                        selectorText += elementName;
                    }

                    while(true){

                        //whitespace means we're done
                        if (tokenStream.peek() === Tokens.S){
                            break;
                        }

                        //check for each component
                        while(i < len && component === null){
                            component = components[i++].call(this);
                        }

                        if (component === null){

                            //we don't have a selector
                            if (selectorText === ""){
                                return null;
                            } else {
                                break;
                            }
                        } else {
                            i = 0;
                            modifiers.push(component);
                            selectorText += component.toString();
                            component = null;
                        }
                    }


                    return selectorText !== "" ?
                            new SelectorPart(elementName, modifiers, selectorText, line, col) :
                            null;
                },

                //CSS3 Selectors
                _type_selector: function(){
                    /*
                     * type_selector
                     *   : [ namespace_prefix ]? element_name
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        ns          = this._namespace_prefix(),
                        elementName = this._element_name();

                    if (!elementName){
                        /*
                         * Need to back out the namespace that was read due to both
                         * type_selector and universal reading namespace_prefix
                         * first. Kind of hacky, but only way I can figure out
                         * right now how to not change the grammar.
                         */
                        if (ns){
                            tokenStream.unget();
                            if (ns.length > 1){
                                tokenStream.unget();
                            }
                        }

                        return null;
                    } else {
                        if (ns){
                            elementName.text = ns + elementName.text;
                            elementName.col -= ns.length;
                        }
                        return elementName;
                    }
                },

                //CSS3 Selectors
                _class: function(){
                    /*
                     * class
                     *   : '.' IDENT
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        token;

                    if (tokenStream.match(Tokens.DOT)){
                        tokenStream.mustMatch(Tokens.IDENT);
                        token = tokenStream.token();
                        return new SelectorSubPart("." + token.value, "class", token.startLine, token.startCol - 1);
                    } else {
                        return null;
                    }

                },

                //CSS3 Selectors
                _element_name: function(){
                    /*
                     * element_name
                     *   : IDENT
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        token;

                    if (tokenStream.match(Tokens.IDENT)){
                        token = tokenStream.token();
                        return new SelectorSubPart(token.value, "elementName", token.startLine, token.startCol);

                    } else {
                        return null;
                    }
                },

                //CSS3 Selectors
                _namespace_prefix: function(){
                    /*
                     * namespace_prefix
                     *   : [ IDENT | '*' ]? '|'
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        value       = "";

                    //verify that this is a namespace prefix
                    if (tokenStream.LA(1) === Tokens.PIPE || tokenStream.LA(2) === Tokens.PIPE){

                        if(tokenStream.match([Tokens.IDENT, Tokens.STAR])){
                            value += tokenStream.token().value;
                        }

                        tokenStream.mustMatch(Tokens.PIPE);
                        value += "|";

                    }

                    return value.length ? value : null;
                },

                //CSS3 Selectors
                _universal: function(){
                    /*
                     * universal
                     *   : [ namespace_prefix ]? '*'
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        value       = "",
                        ns;

                    ns = this._namespace_prefix();
                    if(ns){
                        value += ns;
                    }

                    if(tokenStream.match(Tokens.STAR)){
                        value += "*";
                    }

                    return value.length ? value : null;

               },

                //CSS3 Selectors
                _attrib: function(){
                    /*
                     * attrib
                     *   : '[' S* [ namespace_prefix ]? IDENT S*
                     *         [ [ PREFIXMATCH |
                     *             SUFFIXMATCH |
                     *             SUBSTRINGMATCH |
                     *             '=' |
                     *             INCLUDES |
                     *             DASHMATCH ] S* [ IDENT | STRING ] S*
                     *         ]? ']'
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        value       = null,
                        ns,
                        token;

                    if (tokenStream.match(Tokens.LBRACKET)){
                        token = tokenStream.token();
                        value = token.value;
                        value += this._readWhitespace();

                        ns = this._namespace_prefix();

                        if (ns){
                            value += ns;
                        }

                        tokenStream.mustMatch(Tokens.IDENT);
                        value += tokenStream.token().value;
                        value += this._readWhitespace();

                        if(tokenStream.match([Tokens.PREFIXMATCH, Tokens.SUFFIXMATCH, Tokens.SUBSTRINGMATCH,
                                Tokens.EQUALS, Tokens.INCLUDES, Tokens.DASHMATCH])){

                            value += tokenStream.token().value;
                            value += this._readWhitespace();

                            tokenStream.mustMatch([Tokens.IDENT, Tokens.STRING]);
                            value += tokenStream.token().value;
                            value += this._readWhitespace();
                        }

                        tokenStream.mustMatch(Tokens.RBRACKET);

                        return new SelectorSubPart(value + "]", "attribute", token.startLine, token.startCol);
                    } else {
                        return null;
                    }
                },

                //CSS3 Selectors
                _pseudo: function(){

                    /*
                     * pseudo
                     *   : ':' ':'? [ IDENT | functional_pseudo ]
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        pseudo      = null,
                        colons      = ":",
                        line,
                        col;

                    if (tokenStream.match(Tokens.COLON)){

                        if (tokenStream.match(Tokens.COLON)){
                            colons += ":";
                        }

                        if (tokenStream.match(Tokens.IDENT)){
                            pseudo = tokenStream.token().value;
                            line = tokenStream.token().startLine;
                            col = tokenStream.token().startCol - colons.length;
                        } else if (tokenStream.peek() == Tokens.FUNCTION){
                            line = tokenStream.LT(1).startLine;
                            col = tokenStream.LT(1).startCol - colons.length;
                            pseudo = this._functional_pseudo();
                        }

                        if (pseudo){
                            pseudo = new SelectorSubPart(colons + pseudo, "pseudo", line, col);
                        }
                    }

                    return pseudo;
                },

                //CSS3 Selectors
                _functional_pseudo: function(){
                    /*
                     * functional_pseudo
                     *   : FUNCTION S* expression ')'
                     *   ;
                    */

                    var tokenStream = this._tokenStream,
                        value = null;

                    if(tokenStream.match(Tokens.FUNCTION)){
                        value = tokenStream.token().value;
                        value += this._readWhitespace();
                        value += this._expression();
                        tokenStream.mustMatch(Tokens.RPAREN);
                        value += ")";
                    }

                    return value;
                },

                //CSS3 Selectors
                _expression: function(){
                    /*
                     * expression
                     *   : [ [ PLUS | '-' | DIMENSION | NUMBER | STRING | IDENT ] S* ]+
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        value       = "";

                    while(tokenStream.match([Tokens.PLUS, Tokens.MINUS, Tokens.DIMENSION,
                            Tokens.NUMBER, Tokens.STRING, Tokens.IDENT, Tokens.LENGTH,
                            Tokens.FREQ, Tokens.ANGLE, Tokens.TIME,
                            Tokens.RESOLUTION, Tokens.SLASH])){

                        value += tokenStream.token().value;
                        value += this._readWhitespace();
                    }

                    return value.length ? value : null;

                },

                //CSS3 Selectors
                _negation: function(){
                    /*
                     * negation
                     *   : NOT S* negation_arg S* ')'
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        line,
                        col,
                        value       = "",
                        arg,
                        subpart     = null;

                    if (tokenStream.match(Tokens.NOT)){
                        value = tokenStream.token().value;
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;
                        value += this._readWhitespace();
                        arg = this._negation_arg();
                        value += arg;
                        value += this._readWhitespace();
                        tokenStream.match(Tokens.RPAREN);
                        value += tokenStream.token().value;

                        subpart = new SelectorSubPart(value, "not", line, col);
                        subpart.args.push(arg);
                    }

                    return subpart;
                },

                //CSS3 Selectors
                _negation_arg: function(){
                    /*
                     * negation_arg
                     *   : type_selector | universal | HASH | class | attrib | pseudo
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        args        = [
                            this._type_selector,
                            this._universal,
                            function(){
                                return tokenStream.match(Tokens.HASH) ?
                                        new SelectorSubPart(tokenStream.token().value, "id", tokenStream.token().startLine, tokenStream.token().startCol) :
                                        null;
                            },
                            this._class,
                            this._attrib,
                            this._pseudo
                        ],
                        arg         = null,
                        i           = 0,
                        len         = args.length,
                        elementName,
                        line,
                        col,
                        part;

                    line = tokenStream.LT(1).startLine;
                    col = tokenStream.LT(1).startCol;

                    while(i < len && arg === null){

                        arg = args[i].call(this);
                        i++;
                    }

                    //must be a negation arg
                    if (arg === null){
                        this._unexpectedToken(tokenStream.LT(1));
                    }

                    //it's an element name
                    if (arg.type == "elementName"){
                        part = new SelectorPart(arg, [], arg.toString(), line, col);
                    } else {
                        part = new SelectorPart(null, [arg], arg.toString(), line, col);
                    }

                    return part;
                },

                _declaration: function(){

                    /*
                     * declaration
                     *   : property ':' S* expr prio?
                     *   | /( empty )/
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        property    = null,
                        expr        = null,
                        prio        = null,
                        error       = null,
                        invalid     = null,
                        propertyName= "";

                    property = this._property();
                    if (property !== null){

                        tokenStream.mustMatch(Tokens.COLON);
                        this._readWhitespace();

                        expr = this._expr();

                        //if there's no parts for the value, it's an error
                        if (!expr || expr.length === 0){
                            this._unexpectedToken(tokenStream.LT(1));
                        }

                        prio = this._prio();

                        /*
                         * If hacks should be allowed, then only check the root
                         * property. If hacks should not be allowed, treat
                         * _property or *property as invalid properties.
                         */
                        propertyName = property.toString();
                        if (this.options.starHack && property.hack == "*" ||
                                this.options.underscoreHack && property.hack == "_") {

                            propertyName = property.text;
                        }

                        try {
                            this._validateProperty(propertyName, expr);
                        } catch (ex) {
                            invalid = ex;
                        }

                        this.fire({
                            type:       "property",
                            property:   property,
                            value:      expr,
                            important:  prio,
                            line:       property.line,
                            col:        property.col,
                            invalid:    invalid
                        });

                        return true;
                    } else {
                        return false;
                    }
                },

                _prio: function(){
                    /*
                     * prio
                     *   : IMPORTANT_SYM S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        result      = tokenStream.match(Tokens.IMPORTANT_SYM);

                    this._readWhitespace();
                    return result;
                },

                _expr: function(inFunction){
                    /*
                     * expr
                     *   : term [ operator term ]*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        values      = [],
                        //valueParts    = [],
                        value       = null,
                        operator    = null;

                    value = this._term();
                    if (value !== null){

                        values.push(value);

                        do {
                            operator = this._operator(inFunction);

                            //if there's an operator, keep building up the value parts
                            if (operator){
                                values.push(operator);
                            } /*else {
                                //if there's not an operator, you have a full value
                                values.push(new PropertyValue(valueParts, valueParts[0].line, valueParts[0].col));
                                valueParts = [];
                            }*/

                            value = this._term();

                            if (value === null){
                                break;
                            } else {
                                values.push(value);
                            }
                        } while(true);
                    }

                    //cleanup
                    /*if (valueParts.length){
                        values.push(new PropertyValue(valueParts, valueParts[0].line, valueParts[0].col));
                    }*/

                    return values.length > 0 ? new PropertyValue(values, values[0].line, values[0].col) : null;
                },

                _term: function(){

                    /*
                     * term
                     *   : unary_operator?
                     *     [ NUMBER S* | PERCENTAGE S* | LENGTH S* | ANGLE S* |
                     *       TIME S* | FREQ S* | function | ie_function ]
                     *   | STRING S* | IDENT S* | URI S* | UNICODERANGE S* | hexcolor
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        unary       = null,
                        value       = null,
                        token,
                        line,
                        col;

                    //returns the operator or null
                    unary = this._unary_operator();
                    if (unary !== null){
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;
                    }

                    //exception for IE filters
                    if (tokenStream.peek() == Tokens.IE_FUNCTION && this.options.ieFilters){

                        value = this._ie_function();
                        if (unary === null){
                            line = tokenStream.token().startLine;
                            col = tokenStream.token().startCol;
                        }

                    //see if there's a simple match
                    } else if (tokenStream.match([Tokens.NUMBER, Tokens.PERCENTAGE, Tokens.LENGTH,
                            Tokens.ANGLE, Tokens.TIME,
                            Tokens.FREQ, Tokens.STRING, Tokens.IDENT, Tokens.URI, Tokens.UNICODE_RANGE])){

                        value = tokenStream.token().value;
                        if (unary === null){
                            line = tokenStream.token().startLine;
                            col = tokenStream.token().startCol;
                        }
                        this._readWhitespace();
                    } else {

                        //see if it's a color
                        token = this._hexcolor();
                        if (token === null){

                            //if there's no unary, get the start of the next token for line/col info
                            if (unary === null){
                                line = tokenStream.LT(1).startLine;
                                col = tokenStream.LT(1).startCol;
                            }

                            //has to be a function
                            if (value === null){

                                /*
                                 * This checks for alpha(opacity=0) style of IE
                                 * functions. IE_FUNCTION only presents progid: style.
                                 */
                                if (tokenStream.LA(3) == Tokens.EQUALS && this.options.ieFilters){
                                    value = this._ie_function();
                                } else {
                                    value = this._function();
                                }
                            }

                            /*if (value === null){
                                return null;
                                //throw new Error("Expected identifier at line " + tokenStream.token().startLine + ", character " +  tokenStream.token().startCol + ".");
                            }*/

                        } else {
                            value = token.value;
                            if (unary === null){
                                line = token.startLine;
                                col = token.startCol;
                            }
                        }

                    }

                    return value !== null ?
                            new PropertyValuePart(unary !== null ? unary + value : value, line, col) :
                            null;

                },

                _function: function(){

                    /*
                     * function
                     *   : FUNCTION S* expr ')' S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        functionText = null,
                        expr        = null,
                        lt;

                    if (tokenStream.match(Tokens.FUNCTION)){
                        functionText = tokenStream.token().value;
                        this._readWhitespace();
                        expr = this._expr(true);
                        functionText += expr;

                        //START: Horrible hack in case it's an IE filter
                        if (this.options.ieFilters && tokenStream.peek() == Tokens.EQUALS){
                            do {

                                if (this._readWhitespace()){
                                    functionText += tokenStream.token().value;
                                }

                                //might be second time in the loop
                                if (tokenStream.LA(0) == Tokens.COMMA){
                                    functionText += tokenStream.token().value;
                                }

                                tokenStream.match(Tokens.IDENT);
                                functionText += tokenStream.token().value;

                                tokenStream.match(Tokens.EQUALS);
                                functionText += tokenStream.token().value;

                                //functionText += this._term();
                                lt = tokenStream.peek();
                                while(lt != Tokens.COMMA && lt != Tokens.S && lt != Tokens.RPAREN){
                                    tokenStream.get();
                                    functionText += tokenStream.token().value;
                                    lt = tokenStream.peek();
                                }
                            } while(tokenStream.match([Tokens.COMMA, Tokens.S]));
                        }

                        //END: Horrible Hack

                        tokenStream.match(Tokens.RPAREN);
                        functionText += ")";
                        this._readWhitespace();
                    }

                    return functionText;
                },

                _ie_function: function(){

                    /* (My own extension)
                     * ie_function
                     *   : IE_FUNCTION S* IDENT '=' term [S* ','? IDENT '=' term]+ ')' S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        functionText = null,
                        expr        = null,
                        lt;

                    //IE function can begin like a regular function, too
                    if (tokenStream.match([Tokens.IE_FUNCTION, Tokens.FUNCTION])){
                        functionText = tokenStream.token().value;

                        do {

                            if (this._readWhitespace()){
                                functionText += tokenStream.token().value;
                            }

                            //might be second time in the loop
                            if (tokenStream.LA(0) == Tokens.COMMA){
                                functionText += tokenStream.token().value;
                            }

                            tokenStream.match(Tokens.IDENT);
                            functionText += tokenStream.token().value;

                            tokenStream.match(Tokens.EQUALS);
                            functionText += tokenStream.token().value;

                            //functionText += this._term();
                            lt = tokenStream.peek();
                            while(lt != Tokens.COMMA && lt != Tokens.S && lt != Tokens.RPAREN){
                                tokenStream.get();
                                functionText += tokenStream.token().value;
                                lt = tokenStream.peek();
                            }
                        } while(tokenStream.match([Tokens.COMMA, Tokens.S]));

                        tokenStream.match(Tokens.RPAREN);
                        functionText += ")";
                        this._readWhitespace();
                    }

                    return functionText;
                },

                _hexcolor: function(){
                    /*
                     * There is a constraint on the color that it must
                     * have either 3 or 6 hex-digits (i.e., [0-9a-fA-F])
                     * after the "#"; e.g., "#000" is OK, but "#abcd" is not.
                     *
                     * hexcolor
                     *   : HASH S*
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        token = null,
                        color;

                    if(tokenStream.match(Tokens.HASH)){

                        //need to do some validation here

                        token = tokenStream.token();
                        color = token.value;
                        if (!/#[a-f0-9]{3,6}/i.test(color)){
                            throw new SyntaxError("Expected a hex color but found '" + color + "' at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
                        }
                        this._readWhitespace();
                    }

                    return token;
                },

                //-----------------------------------------------------------------
                // Animations methods
                //-----------------------------------------------------------------

                _keyframes: function(){

                    /*
                     * keyframes:
                     *   : KEYFRAMES_SYM S* keyframe_name S* '{' S* keyframe_rule* '}' {
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        token,
                        tt,
                        name,
                        prefix = "";

                    tokenStream.mustMatch(Tokens.KEYFRAMES_SYM);
                    token = tokenStream.token();
                    if (/^@\-([^\-]+)\-/.test(token.value)) {
                        prefix = RegExp.$1;
                    }

                    this._readWhitespace();
                    name = this._keyframe_name();

                    this._readWhitespace();
                    tokenStream.mustMatch(Tokens.LBRACE);

                    this.fire({
                        type:   "startkeyframes",
                        name:   name,
                        prefix: prefix,
                        line:   token.startLine,
                        col:    token.startCol
                    });

                    this._readWhitespace();
                    tt = tokenStream.peek();

                    //check for key
                    while(tt == Tokens.IDENT || tt == Tokens.PERCENTAGE) {
                        this._keyframe_rule();
                        this._readWhitespace();
                        tt = tokenStream.peek();
                    }

                    this.fire({
                        type:   "endkeyframes",
                        name:   name,
                        prefix: prefix,
                        line:   token.startLine,
                        col:    token.startCol
                    });

                    this._readWhitespace();
                    tokenStream.mustMatch(Tokens.RBRACE);

                },

                _keyframe_name: function(){

                    /*
                     * keyframe_name:
                     *   : IDENT
                     *   | STRING
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        token;

                    tokenStream.mustMatch([Tokens.IDENT, Tokens.STRING]);
                    return SyntaxUnit.fromToken(tokenStream.token());
                },

                _keyframe_rule: function(){

                    /*
                     * keyframe_rule:
                     *   : key_list S*
                     *     '{' S* declaration [ ';' S* declaration ]* '}' S*
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        token,
                        keyList = this._key_list();

                    this.fire({
                        type:   "startkeyframerule",
                        keys:   keyList,
                        line:   keyList[0].line,
                        col:    keyList[0].col
                    });

                    this._readDeclarations(true);

                    this.fire({
                        type:   "endkeyframerule",
                        keys:   keyList,
                        line:   keyList[0].line,
                        col:    keyList[0].col
                    });

                },

                _key_list: function(){

                    /*
                     * key_list:
                     *   : key [ S* ',' S* key]*
                     *   ;
                     */
                    var tokenStream = this._tokenStream,
                        token,
                        key,
                        keyList = [];

                    //must be least one key
                    keyList.push(this._key());

                    this._readWhitespace();

                    while(tokenStream.match(Tokens.COMMA)){
                        this._readWhitespace();
                        keyList.push(this._key());
                        this._readWhitespace();
                    }

                    return keyList;
                },

                _key: function(){
                    /*
                     * There is a restriction that IDENT can be only "from" or "to".
                     *
                     * key
                     *   : PERCENTAGE
                     *   | IDENT
                     *   ;
                     */

                    var tokenStream = this._tokenStream,
                        token;

                    if (tokenStream.match(Tokens.PERCENTAGE)){
                        return SyntaxUnit.fromToken(tokenStream.token());
                    } else if (tokenStream.match(Tokens.IDENT)){
                        token = tokenStream.token();

                        if (/from|to/i.test(token.value)){
                            return SyntaxUnit.fromToken(token);
                        }

                        tokenStream.unget();
                    }

                    //if it gets here, there wasn't a valid token, so time to explode
                    this._unexpectedToken(tokenStream.LT(1));
                },

                //-----------------------------------------------------------------
                // Helper methods
                //-----------------------------------------------------------------

                /**
                 * Not part of CSS grammar, but useful for skipping over
                 * combination of white space and HTML-style comments.
                 * @return {void}
                 * @method _skipCruft
                 * @private
                 */
                _skipCruft: function(){
                    while(this._tokenStream.match([Tokens.S, Tokens.CDO, Tokens.CDC])){
                        //noop
                    }
                },

                /**
                 * Not part of CSS grammar, but this pattern occurs frequently
                 * in the official CSS grammar. Split out here to eliminate
                 * duplicate code.
                 * @param {Boolean} checkStart Indicates if the rule should check
                 *      for the left brace at the beginning.
                 * @param {Boolean} readMargins Indicates if the rule should check
                 *      for margin patterns.
                 * @return {void}
                 * @method _readDeclarations
                 * @private
                 */
                _readDeclarations: function(checkStart, readMargins){
                    /*
                     * Reads the pattern
                     * S* '{' S* declaration [ ';' S* declaration ]* '}' S*
                     * or
                     * S* '{' S* [ declaration | margin ]? [ ';' S* [ declaration | margin ]? ]* '}' S*
                     * Note that this is how it is described in CSS3 Paged Media, but is actually incorrect.
                     * A semicolon is only necessary following a declaration is there's another declaration
                     * or margin afterwards.
                     */
                    var tokenStream = this._tokenStream,
                        tt;


                    this._readWhitespace();

                    if (checkStart){
                        tokenStream.mustMatch(Tokens.LBRACE);
                    }

                    this._readWhitespace();

                    try {

                        while(true){

                            if (tokenStream.match(Tokens.SEMICOLON) || (readMargins && this._margin())){
                                //noop
                            } else if (this._declaration()){
                                if (!tokenStream.match(Tokens.SEMICOLON)){
                                    break;
                                }
                            } else {
                                break;
                            }

                            //if ((!this._margin() && !this._declaration()) || !tokenStream.match(Tokens.SEMICOLON)){
                            //    break;
                            //}
                            this._readWhitespace();
                        }

                        tokenStream.mustMatch(Tokens.RBRACE);
                        this._readWhitespace();

                    } catch (ex) {
                        if (ex instanceof SyntaxError && !this.options.strict){

                            //fire error event
                            this.fire({
                                type:       "error",
                                error:      ex,
                                message:    ex.message,
                                line:       ex.line,
                                col:        ex.col
                            });

                            //see if there's another declaration
                            tt = tokenStream.advance([Tokens.SEMICOLON, Tokens.RBRACE]);
                            if (tt == Tokens.SEMICOLON){
                                //if there's a semicolon, then there might be another declaration
                                this._readDeclarations(false, readMargins);
                            } else if (tt != Tokens.RBRACE){
                                //if there's a right brace, the rule is finished so don't do anything
                                //otherwise, rethrow the error because it wasn't handled properly
                                throw ex;
                            }

                        } else {
                            //not a syntax error, rethrow it
                            throw ex;
                        }
                    }

                },

                /**
                 * In some cases, you can end up with two white space tokens in a
                 * row. Instead of making a change in every function that looks for
                 * white space, this function is used to match as much white space
                 * as necessary.
                 * @method _readWhitespace
                 * @return {String} The white space if found, empty string if not.
                 * @private
                 */
                _readWhitespace: function(){

                    var tokenStream = this._tokenStream,
                        ws = "";

                    while(tokenStream.match(Tokens.S)){
                        ws += tokenStream.token().value;
                    }

                    return ws;
                },


                /**
                 * Throws an error when an unexpected token is found.
                 * @param {Object} token The token that was found.
                 * @method _unexpectedToken
                 * @return {void}
                 * @private
                 */
                _unexpectedToken: function(token){
                    throw new SyntaxError("Unexpected token '" + token.value + "' at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
                },

                /**
                 * Helper method used for parsing subparts of a style sheet.
                 * @return {void}
                 * @method _verifyEnd
                 * @private
                 */
                _verifyEnd: function(){
                    if (this._tokenStream.LA(1) != Tokens.EOF){
                        this._unexpectedToken(this._tokenStream.LT(1));
                    }
                },

                //-----------------------------------------------------------------
                // Validation methods
                //-----------------------------------------------------------------
                _validateProperty: function(property, value){
                    Validation.validate(property, value);
                },

                //-----------------------------------------------------------------
                // Parsing methods
                //-----------------------------------------------------------------

                parse: function(input){
                    this._tokenStream = new TokenStream(input, Tokens);
                    this._stylesheet();
                },

                parseStyleSheet: function(input){
                    //just passthrough
                    return this.parse(input);
                },

                parseMediaQuery: function(input){
                    this._tokenStream = new TokenStream(input, Tokens);
                    var result = this._media_query();

                    //if there's anything more, then it's an invalid selector
                    this._verifyEnd();

                    //otherwise return result
                    return result;
                },

                /**
                 * Parses a property value (everything after the semicolon).
                 * @return {parserlib.css.PropertyValue} The property value.
                 * @throws parserlib.util.SyntaxError If an unexpected token is found.
                 * @method parserPropertyValue
                 */
                parsePropertyValue: function(input){

                    this._tokenStream = new TokenStream(input, Tokens);
                    this._readWhitespace();

                    var result = this._expr();

                    //okay to have a trailing white space
                    this._readWhitespace();

                    //if there's anything more, then it's an invalid selector
                    this._verifyEnd();

                    //otherwise return result
                    return result;
                },

                /**
                 * Parses a complete CSS rule, including selectors and
                 * properties.
                 * @param {String} input The text to parser.
                 * @return {Boolean} True if the parse completed successfully, false if not.
                 * @method parseRule
                 */
                parseRule: function(input){
                    this._tokenStream = new TokenStream(input, Tokens);

                    //skip any leading white space
                    this._readWhitespace();

                    var result = this._ruleset();

                    //skip any trailing white space
                    this._readWhitespace();

                    //if there's anything more, then it's an invalid selector
                    this._verifyEnd();

                    //otherwise return result
                    return result;
                },

                /**
                 * Parses a single CSS selector (no comma)
                 * @param {String} input The text to parse as a CSS selector.
                 * @return {Selector} An object representing the selector.
                 * @throws parserlib.util.SyntaxError If an unexpected token is found.
                 * @method parseSelector
                 */
                parseSelector: function(input){

                    this._tokenStream = new TokenStream(input, Tokens);

                    //skip any leading white space
                    this._readWhitespace();

                    var result = this._selector();

                    //skip any trailing white space
                    this._readWhitespace();

                    //if there's anything more, then it's an invalid selector
                    this._verifyEnd();

                    //otherwise return result
                    return result;
                },

                /**
                 * Parses an HTML style attribute: a set of CSS declarations
                 * separated by semicolons.
                 * @param {String} input The text to parse as a style attribute
                 * @return {void}
                 * @method parseStyleAttribute
                 */
                parseStyleAttribute: function(input){
                    input += "}"; // for error recovery in _readDeclarations()
                    this._tokenStream = new TokenStream(input, Tokens);
                    this._readDeclarations();
                }
            };

        //copy over onto prototype
        for (prop in additions){
            if (additions.hasOwnProperty(prop)){
                proto[prop] = additions[prop];
            }
        }

        return proto;
    }();


    /*
    nth
      : S* [ ['-'|'+']? INTEGER? {N} [ S* ['-'|'+'] S* INTEGER ]? |
             ['-'|'+']? INTEGER | {O}{D}{D} | {E}{V}{E}{N} ] S*
      ;
    */

    /*global Validation, ValidationTypes, ValidationError*/
    var Properties = {

        //A
        "alignment-adjust"              : "auto | baseline | before-edge | text-before-edge | middle | central | after-edge | text-after-edge | ideographic | alphabetic | hanging | mathematical | <percentage> | <length>",
        "alignment-baseline"            : "baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
        "animation"                     : 1,
        "animation-delay"               : { multi: "<time>", comma: true },
        "animation-direction"           : { multi: "normal | alternate", comma: true },
        "animation-duration"            : { multi: "<time>", comma: true },
        "animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
        "animation-name"                : { multi: "none | <ident>", comma: true },
        "animation-play-state"          : { multi: "running | paused", comma: true },
        "animation-timing-function"     : 1,

        //vendor prefixed
        "-moz-animation-delay"               : { multi: "<time>", comma: true },
        "-moz-animation-direction"           : { multi: "normal | alternate", comma: true },
        "-moz-animation-duration"            : { multi: "<time>", comma: true },
        "-moz-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
        "-moz-animation-name"                : { multi: "none | <ident>", comma: true },
        "-moz-animation-play-state"          : { multi: "running | paused", comma: true },

        "-ms-animation-delay"               : { multi: "<time>", comma: true },
        "-ms-animation-direction"           : { multi: "normal | alternate", comma: true },
        "-ms-animation-duration"            : { multi: "<time>", comma: true },
        "-ms-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
        "-ms-animation-name"                : { multi: "none | <ident>", comma: true },
        "-ms-animation-play-state"          : { multi: "running | paused", comma: true },

        "-webkit-animation-delay"               : { multi: "<time>", comma: true },
        "-webkit-animation-direction"           : { multi: "normal | alternate", comma: true },
        "-webkit-animation-duration"            : { multi: "<time>", comma: true },
        "-webkit-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
        "-webkit-animation-name"                : { multi: "none | <ident>", comma: true },
        "-webkit-animation-play-state"          : { multi: "running | paused", comma: true },

        "-o-animation-delay"               : { multi: "<time>", comma: true },
        "-o-animation-direction"           : { multi: "normal | alternate", comma: true },
        "-o-animation-duration"            : { multi: "<time>", comma: true },
        "-o-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
        "-o-animation-name"                : { multi: "none | <ident>", comma: true },
        "-o-animation-play-state"          : { multi: "running | paused", comma: true },

        "appearance"                    : "icon | window | desktop | workspace | document | tooltip | dialog | button | push-button | hyperlink | radio-button | checkbox | menu-item | tab | menu | menubar | pull-down-menu | pop-up-menu | list-menu | radio-group | checkbox-group | outline-tree | range | field | combo-box | signature | password | normal | none | inherit",
        "azimuth"                       : function (expression) {
            var simple      = "<angle> | leftwards | rightwards | inherit",
                direction   = "left-side | far-left | left | center-left | center | center-right | right | far-right | right-side",
                behind      = false,
                valid       = false,
                part;

            if (!ValidationTypes.isAny(expression, simple)) {
                if (ValidationTypes.isAny(expression, "behind")) {
                    behind = true;
                    valid = true;
                }

                if (ValidationTypes.isAny(expression, direction)) {
                    valid = true;
                    if (!behind) {
                        ValidationTypes.isAny(expression, "behind");
                    }
                }
            }

            if (expression.hasNext()) {
                part = expression.next();
                if (valid) {
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                    throw new ValidationError("Expected (<'azimuth'>) but found '" + part + "'.", part.line, part.col);
                }
            }
        },

        //B
        "backface-visibility"           : "visible | hidden",
        "background"                    : 1,
        "background-attachment"         : { multi: "<attachment>", comma: true },
        "background-clip"               : { multi: "<box>", comma: true },
        "background-color"              : "<color> | inherit",
        "background-image"              : { multi: "<bg-image>", comma: true },
        "background-origin"             : { multi: "<box>", comma: true },
        "background-position"           : { multi: "<bg-position>", comma: true },
        "background-repeat"             : { multi: "<repeat-style>" },
        "background-size"               : { multi: "<bg-size>", comma: true },
        "baseline-shift"                : "baseline | sub | super | <percentage> | <length>",
        "behavior"                      : 1,
        "binding"                       : 1,
        "bleed"                         : "<length>",
        "bookmark-label"                : "<content> | <attr> | <string>",
        "bookmark-level"                : "none | <integer>",
        "bookmark-state"                : "open | closed",
        "bookmark-target"               : "none | <uri> | <attr>",
        "border"                        : "<border-width> || <border-style> || <color>",
        "border-bottom"                 : "<border-width> || <border-style> || <color>",
        "border-bottom-color"           : "<color> | inherit",
        "border-bottom-left-radius"     :  "<x-one-radius>",
        "border-bottom-right-radius"    :  "<x-one-radius>",
        "border-bottom-style"           : "<border-style>",
        "border-bottom-width"           : "<border-width>",
        "border-collapse"               : "collapse | separate | inherit",
        "border-color"                  : { multi: "<color> | inherit", max: 4 },
        "border-image"                  : 1,
        "border-image-outset"           : { multi: "<length> | <number>", max: 4 },
        "border-image-repeat"           : { multi: "stretch | repeat | round", max: 2 },
        "border-image-slice"            : function(expression) {

            var valid   = false,
                numeric = "<number> | <percentage>",
                fill    = false,
                count   = 0,
                max     = 4,
                part;

            if (ValidationTypes.isAny(expression, "fill")) {
                fill = true;
                valid = true;
            }

            while (expression.hasNext() && count < max) {
                valid = ValidationTypes.isAny(expression, numeric);
                if (!valid) {
                    break;
                }
                count++;
            }


            if (!fill) {
                ValidationTypes.isAny(expression, "fill");
            } else {
                valid = true;
            }

            if (expression.hasNext()) {
                part = expression.next();
                if (valid) {
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                    throw new ValidationError("Expected ([<number> | <percentage>]{1,4} && fill?) but found '" + part + "'.", part.line, part.col);
                }
            }
        },
        "border-image-source"           : "<image> | none",
        "border-image-width"            : { multi: "<length> | <percentage> | <number> | auto", max: 4 },
        "border-left"                   : "<border-width> || <border-style> || <color>",
        "border-left-color"             : "<color> | inherit",
        "border-left-style"             : "<border-style>",
        "border-left-width"             : "<border-width>",
        "border-radius"                 : function(expression) {

            var valid   = false,
                simple = "<length> | <percentage> | inherit",
                slash   = false,
                fill    = false,
                count   = 0,
                max     = 8,
                part;

            while (expression.hasNext() && count < max) {
                valid = ValidationTypes.isAny(expression, simple);
                if (!valid) {

                    if (expression.peek() == "/" && count > 0 && !slash) {
                        slash = true;
                        max = count + 5;
                        expression.next();
                    } else {
                        break;
                    }
                }
                count++;
            }

            if (expression.hasNext()) {
                part = expression.next();
                if (valid) {
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                    throw new ValidationError("Expected (<'border-radius'>) but found '" + part + "'.", part.line, part.col);
                }
            }
        },
        "border-right"                  : "<border-width> || <border-style> || <color>",
        "border-right-color"            : "<color> | inherit",
        "border-right-style"            : "<border-style>",
        "border-right-width"            : "<border-width>",
        "border-spacing"                : { multi: "<length> | inherit", max: 2 },
        "border-style"                  : { multi: "<border-style>", max: 4 },
        "border-top"                    : "<border-width> || <border-style> || <color>",
        "border-top-color"              : "<color> | inherit",
        "border-top-left-radius"        : "<x-one-radius>",
        "border-top-right-radius"       : "<x-one-radius>",
        "border-top-style"              : "<border-style>",
        "border-top-width"              : "<border-width>",
        "border-width"                  : { multi: "<border-width>", max: 4 },
        "bottom"                        : "<margin-width> | inherit",
        "box-align"                     : "start | end | center | baseline | stretch",        //http://www.w3.org/TR/2009/WD-css3-flexbox-20090723/
        "box-decoration-break"          : "slice |clone",
        "box-direction"                 : "normal | reverse | inherit",
        "box-flex"                      : "<number>",
        "box-flex-group"                : "<integer>",
        "box-lines"                     : "single | multiple",
        "box-ordinal-group"             : "<integer>",
        "box-orient"                    : "horizontal | vertical | inline-axis | block-axis | inherit",
        "box-pack"                      : "start | end | center | justify",
        "box-shadow"                    : function (expression) {
            var result      = false,
                part;

            if (!ValidationTypes.isAny(expression, "none")) {
                Validation.multiProperty("<shadow>", expression, true, Infinity);
            } else {
                if (expression.hasNext()) {
                    part = expression.next();
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                }
            }
        },
        "box-sizing"                    : "content-box | border-box | inherit",
        "break-after"                   : "auto | always | avoid | left | right | page | column | avoid-page | avoid-column",
        "break-before"                  : "auto | always | avoid | left | right | page | column | avoid-page | avoid-column",
        "break-inside"                  : "auto | avoid | avoid-page | avoid-column",

        //C
        "caption-side"                  : "top | bottom | inherit",
        "clear"                         : "none | right | left | both | inherit",
        "clip"                          : 1,
        "color"                         : "<color> | inherit",
        "color-profile"                 : 1,
        "column-count"                  : "<integer> | auto",                      //http://www.w3.org/TR/css3-multicol/
        "column-fill"                   : "auto | balance",
        "column-gap"                    : "<length> | normal",
        "column-rule"                   : "<border-width> || <border-style> || <color>",
        "column-rule-color"             : "<color>",
        "column-rule-style"             : "<border-style>",
        "column-rule-width"             : "<border-width>",
        "column-span"                   : "none | all",
        "column-width"                  : "<length> | auto",
        "columns"                       : 1,
        "content"                       : 1,
        "counter-increment"             : 1,
        "counter-reset"                 : 1,
        "crop"                          : "<shape> | auto",
        "cue"                           : "cue-after | cue-before | inherit",
        "cue-after"                     : 1,
        "cue-before"                    : 1,
        "cursor"                        : 1,

        //D
        "direction"                     : "ltr | rtl | inherit",
        "display"                       : "inline | block | list-item | inline-block | table | inline-table | table-row-group | table-header-group | table-footer-group | table-row | table-column-group | table-column | table-cell | table-caption | box | inline-box | grid | inline-grid | none | inherit | -moz-box | -moz-inline-block | -moz-inline-box | -moz-inline-grid | -moz-inline-stack | -moz-inline-table | -moz-grid | -moz-grid-group | -moz-grid-line | -moz-groupbox | -moz-deck | -moz-popup | -moz-stack | -moz-marker | -webkit-box | -webkit-inline-box",
        "dominant-baseline"             : 1,
        "drop-initial-after-adjust"     : "central | middle | after-edge | text-after-edge | ideographic | alphabetic | mathematical | <percentage> | <length>",
        "drop-initial-after-align"      : "baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
        "drop-initial-before-adjust"    : "before-edge | text-before-edge | central | middle | hanging | mathematical | <percentage> | <length>",
        "drop-initial-before-align"     : "caps-height | baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
        "drop-initial-size"             : "auto | line | <length> | <percentage>",
        "drop-initial-value"            : "initial | <integer>",

        //E
        "elevation"                     : "<angle> | below | level | above | higher | lower | inherit",
        "empty-cells"                   : "show | hide | inherit",

        //F
        "filter"                        : 1,
        "fit"                           : "fill | hidden | meet | slice",
        "fit-position"                  : 1,
        "float"                         : "left | right | none | inherit",
        "float-offset"                  : 1,
        "font"                          : 1,
        "font-family"                   : 1,
        "font-size"                     : "<absolute-size> | <relative-size> | <length> | <percentage> | inherit",
        "font-size-adjust"              : "<number> | none | inherit",
        "font-stretch"                  : "normal | ultra-condensed | extra-condensed | condensed | semi-condensed | semi-expanded | expanded | extra-expanded | ultra-expanded | inherit",
        "font-style"                    : "normal | italic | oblique | inherit",
        "font-variant"                  : "normal | small-caps | inherit",
        "font-weight"                   : "normal | bold | bolder | lighter | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | inherit",

        //G
        "grid-cell-stacking"            : "columns | rows | layer",
        "grid-column"                   : 1,
        "grid-columns"                  : 1,
        "grid-column-align"             : "start | end | center | stretch",
        "grid-column-sizing"            : 1,
        "grid-column-span"              : "<integer>",
        "grid-flow"                     : "none | rows | columns",
        "grid-layer"                    : "<integer>",
        "grid-row"                      : 1,
        "grid-rows"                     : 1,
        "grid-row-align"                : "start | end | center | stretch",
        "grid-row-span"                 : "<integer>",
        "grid-row-sizing"               : 1,

        //H
        "hanging-punctuation"           : 1,
        "height"                        : "<margin-width> | inherit",
        "hyphenate-after"               : "<integer> | auto",
        "hyphenate-before"              : "<integer> | auto",
        "hyphenate-character"           : "<string> | auto",
        "hyphenate-lines"               : "no-limit | <integer>",
        "hyphenate-resource"            : 1,
        "hyphens"                       : "none | manual | auto",

        //I
        "icon"                          : 1,
        "image-orientation"             : "angle | auto",
        "image-rendering"               : 1,
        "image-resolution"              : 1,
        "inline-box-align"              : "initial | last | <integer>",

        //L
        "left"                          : "<margin-width> | inherit",
        "letter-spacing"                : "<length> | normal | inherit",
        "line-height"                   : "<number> | <length> | <percentage> | normal | inherit",
        "line-break"                    : "auto | loose | normal | strict",
        "line-stacking"                 : 1,
        "line-stacking-ruby"            : "exclude-ruby | include-ruby",
        "line-stacking-shift"           : "consider-shifts | disregard-shifts",
        "line-stacking-strategy"        : "inline-line-height | block-line-height | max-height | grid-height",
        "list-style"                    : 1,
        "list-style-image"              : "<uri> | none | inherit",
        "list-style-position"           : "inside | outside | inherit",
        "list-style-type"               : "disc | circle | square | decimal | decimal-leading-zero | lower-roman | upper-roman | lower-greek | lower-latin | upper-latin | armenian | georgian | lower-alpha | upper-alpha | none | inherit",

        //M
        "margin"                        : { multi: "<margin-width> | inherit", max: 4 },
        "margin-bottom"                 : "<margin-width> | inherit",
        "margin-left"                   : "<margin-width> | inherit",
        "margin-right"                  : "<margin-width> | inherit",
        "margin-top"                    : "<margin-width> | inherit",
        "mark"                          : 1,
        "mark-after"                    : 1,
        "mark-before"                   : 1,
        "marks"                         : 1,
        "marquee-direction"             : 1,
        "marquee-play-count"            : 1,
        "marquee-speed"                 : 1,
        "marquee-style"                 : 1,
        "max-height"                    : "<length> | <percentage> | none | inherit",
        "max-width"                     : "<length> | <percentage> | none | inherit",
        "min-height"                    : "<length> | <percentage> | inherit",
        "min-width"                     : "<length> | <percentage> | inherit",
        "move-to"                       : 1,

        //N
        "nav-down"                      : 1,
        "nav-index"                     : 1,
        "nav-left"                      : 1,
        "nav-right"                     : 1,
        "nav-up"                        : 1,

        //O
        "opacity"                       : "<number> | inherit",
        "orphans"                       : "<integer> | inherit",
        "outline"                       : 1,
        "outline-color"                 : "<color> | invert | inherit",
        "outline-offset"                : 1,
        "outline-style"                 : "<border-style> | inherit",
        "outline-width"                 : "<border-width> | inherit",
        "overflow"                      : "visible | hidden | scroll | auto | inherit",
        "overflow-style"                : 1,
        "overflow-x"                    : 1,
        "overflow-y"                    : 1,

        //P
        "padding"                       : { multi: "<padding-width> | inherit", max: 4 },
        "padding-bottom"                : "<padding-width> | inherit",
        "padding-left"                  : "<padding-width> | inherit",
        "padding-right"                 : "<padding-width> | inherit",
        "padding-top"                   : "<padding-width> | inherit",
        "page"                          : 1,
        "page-break-after"              : "auto | always | avoid | left | right | inherit",
        "page-break-before"             : "auto | always | avoid | left | right | inherit",
        "page-break-inside"             : "auto | avoid | inherit",
        "page-policy"                   : 1,
        "pause"                         : 1,
        "pause-after"                   : 1,
        "pause-before"                  : 1,
        "perspective"                   : 1,
        "perspective-origin"            : 1,
        "phonemes"                      : 1,
        "pitch"                         : 1,
        "pitch-range"                   : 1,
        "play-during"                   : 1,
        "pointer-events"                : "auto | none | visiblePainted | visibleFill | visibleStroke | visible | painted | fill | stroke | all | inherit",
        "position"                      : "static | relative | absolute | fixed | inherit",
        "presentation-level"            : 1,
        "punctuation-trim"              : 1,

        //Q
        "quotes"                        : 1,

        //R
        "rendering-intent"              : 1,
        "resize"                        : 1,
        "rest"                          : 1,
        "rest-after"                    : 1,
        "rest-before"                   : 1,
        "richness"                      : 1,
        "right"                         : "<margin-width> | inherit",
        "rotation"                      : 1,
        "rotation-point"                : 1,
        "ruby-align"                    : 1,
        "ruby-overhang"                 : 1,
        "ruby-position"                 : 1,
        "ruby-span"                     : 1,

        //S
        "size"                          : 1,
        "speak"                         : "normal | none | spell-out | inherit",
        "speak-header"                  : "once | always | inherit",
        "speak-numeral"                 : "digits | continuous | inherit",
        "speak-punctuation"             : "code | none | inherit",
        "speech-rate"                   : 1,
        "src"                           : 1,
        "stress"                        : 1,
        "string-set"                    : 1,

        "table-layout"                  : "auto | fixed | inherit",
        "tab-size"                      : "<integer> | <length>",
        "target"                        : 1,
        "target-name"                   : 1,
        "target-new"                    : 1,
        "target-position"               : 1,
        "text-align"                    : "left | right | center | justify | inherit" ,
        "text-align-last"               : 1,
        "text-decoration"               : 1,
        "text-emphasis"                 : 1,
        "text-height"                   : 1,
        "text-indent"                   : "<length> | <percentage> | inherit",
        "text-justify"                  : "auto | none | inter-word | inter-ideograph | inter-cluster | distribute | kashida",
        "text-outline"                  : 1,
        "text-overflow"                 : 1,
        "text-rendering"                : "auto | optimizeSpeed | optimizeLegibility | geometricPrecision | inherit",
        "text-shadow"                   : 1,
        "text-transform"                : "capitalize | uppercase | lowercase | none | inherit",
        "text-wrap"                     : "normal | none | avoid",
        "top"                           : "<margin-width> | inherit",
        "transform"                     : 1,
        "transform-origin"              : 1,
        "transform-style"               : 1,
        "transition"                    : 1,
        "transition-delay"              : 1,
        "transition-duration"           : 1,
        "transition-property"           : 1,
        "transition-timing-function"    : 1,

        //U
        "unicode-bidi"                  : "normal | embed | bidi-override | inherit",
        "user-modify"                   : "read-only | read-write | write-only | inherit",
        "user-select"                   : "none | text | toggle | element | elements | all | inherit",

        //V
        "vertical-align"                : "auto | use-script | baseline | sub | super | top | text-top | central | middle | bottom | text-bottom | <percentage> | <length>",
        "visibility"                    : "visible | hidden | collapse | inherit",
        "voice-balance"                 : 1,
        "voice-duration"                : 1,
        "voice-family"                  : 1,
        "voice-pitch"                   : 1,
        "voice-pitch-range"             : 1,
        "voice-rate"                    : 1,
        "voice-stress"                  : 1,
        "voice-volume"                  : 1,
        "volume"                        : 1,

        //W
        "white-space"                   : "normal | pre | nowrap | pre-wrap | pre-line | inherit | -pre-wrap | -o-pre-wrap | -moz-pre-wrap | -hp-pre-wrap", //http://perishablepress.com/wrapping-content/
        "white-space-collapse"          : 1,
        "widows"                        : "<integer> | inherit",
        "width"                         : "<length> | <percentage> | auto | inherit" ,
        "word-break"                    : "normal | keep-all | break-all",
        "word-spacing"                  : "<length> | normal | inherit",
        "word-wrap"                     : 1,

        //Z
        "z-index"                       : "<integer> | auto | inherit",
        "zoom"                          : "<number> | <percentage> | normal"
    };

    /*global SyntaxUnit, Parser*/
    /**
     * Represents a selector combinator (whitespace, +, >).
     * @namespace parserlib.css
     * @class PropertyName
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {String} text The text representation of the unit.
     * @param {String} hack The type of IE hack applied ("*", "_", or null).
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function PropertyName(text, hack, line, col){

        SyntaxUnit.call(this, text, line, col, Parser.PROPERTY_NAME_TYPE);

        /**
         * The type of IE hack applied ("*", "_", or null).
         * @type String
         * @property hack
         */
        this.hack = hack;

    }

    PropertyName.prototype = new SyntaxUnit();
    PropertyName.prototype.constructor = PropertyName;
    PropertyName.prototype.toString = function(){
        return (this.hack ? this.hack : "") + this.text;
    };

    /*global SyntaxUnit, Parser*/
    /**
     * Represents a single part of a CSS property value, meaning that it represents
     * just everything single part between ":" and ";". If there are multiple values
     * separated by commas, this type represents just one of the values.
     * @param {String[]} parts An array of value parts making up this value.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     * @namespace parserlib.css
     * @class PropertyValue
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     */
    function PropertyValue(parts, line, col){

        SyntaxUnit.call(this, parts.join(" "), line, col, Parser.PROPERTY_VALUE_TYPE);

        /**
         * The parts that make up the selector.
         * @type Array
         * @property parts
         */
        this.parts = parts;

    }

    PropertyValue.prototype = new SyntaxUnit();
    PropertyValue.prototype.constructor = PropertyValue;


    /*global SyntaxUnit, Parser*/
    /**
     * A utility class that allows for easy iteration over the various parts of a
     * property value.
     * @param {parserlib.css.PropertyValue} value The property value to iterate over.
     * @namespace parserlib.css
     * @class PropertyValueIterator
     * @constructor
     */
    function PropertyValueIterator(value){

        /**
         * Iterator value
         * @type int
         * @property _i
         * @private
         */
        this._i = 0;

        /**
         * The parts that make up the value.
         * @type Array
         * @property _parts
         * @private
         */
        this._parts = value.parts;

        /**
         * Keeps track of bookmarks along the way.
         * @type Array
         * @property _marks
         * @private
         */
        this._marks = [];

        /**
         * Holds the original property value.
         * @type parserlib.css.PropertyValue
         * @property value
         */
        this.value = value;

    }

    /**
     * Returns the total number of parts in the value.
     * @return {int} The total number of parts in the value.
     * @method count
     */
    PropertyValueIterator.prototype.count = function(){
        return this._parts.length;
    };

    /**
     * Indicates if the iterator is positioned at the first item.
     * @return {Boolean} True if positioned at first item, false if not.
     * @method isFirst
     */
    PropertyValueIterator.prototype.isFirst = function(){
        return this._i === 0;
    };

    /**
     * Indicates if there are more parts of the property value.
     * @return {Boolean} True if there are more parts, false if not.
     * @method hasNext
     */
    PropertyValueIterator.prototype.hasNext = function(){
        return (this._i < this._parts.length);
    };

    /**
     * Marks the current spot in the iteration so it can be restored to
     * later on.
     * @return {void}
     * @method mark
     */
    PropertyValueIterator.prototype.mark = function(){
        this._marks.push(this._i);
    };

    /**
     * Returns the next part of the property value or null if there is no next
     * part. Does not move the internal counter forward.
     * @return {parserlib.css.PropertyValuePart} The next part of the property value or null if there is no next
     * part.
     * @method peek
     */
    PropertyValueIterator.prototype.peek = function(count){
        return this.hasNext() ? this._parts[this._i + (count || 0)] : null;
    };

    /**
     * Returns the next part of the property value or null if there is no next
     * part.
     * @return {parserlib.css.PropertyValuePart} The next part of the property value or null if there is no next
     * part.
     * @method next
     */
    PropertyValueIterator.prototype.next = function(){
        return this.hasNext() ? this._parts[this._i++] : null;
    };

    /**
     * Returns the previous part of the property value or null if there is no
     * previous part.
     * @return {parserlib.css.PropertyValuePart} The previous part of the
     * property value or null if there is no next part.
     * @method previous
     */
    PropertyValueIterator.prototype.previous = function(){
        return this._i > 0 ? this._parts[--this._i] : null;
    };

    /**
     * Restores the last saved bookmark.
     * @return {void}
     * @method restore
     */
    PropertyValueIterator.prototype.restore = function(){
        if (this._marks.length){
            this._i = this._marks.pop();
        }
    };


    /*global SyntaxUnit, Parser, Colors*/
    /**
     * Represents a single part of a CSS property value, meaning that it represents
     * just one part of the data between ":" and ";".
     * @param {String} text The text representation of the unit.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     * @namespace parserlib.css
     * @class PropertyValuePart
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     */
    function PropertyValuePart(text, line, col){

        SyntaxUnit.call(this, text, line, col, Parser.PROPERTY_VALUE_PART_TYPE);

        /**
         * Indicates the type of value unit.
         * @type String
         * @property type
         */
        this.type = "unknown";

        //figure out what type of data it is

        var temp;

        //it is a measurement?
        if (/^([+\-]?[\d\.]+)([a-z]+)$/i.test(text)){  //dimension
            this.type = "dimension";
            this.value = +RegExp.$1;
            this.units = RegExp.$2;

            //try to narrow down
            switch(this.units.toLowerCase()){

                case "em":
                case "rem":
                case "ex":
                case "px":
                case "cm":
                case "mm":
                case "in":
                case "pt":
                case "pc":
                case "ch":
                case "vh":
                case "vw":
                case "vm":
                    this.type = "length";
                    break;

                case "deg":
                case "rad":
                case "grad":
                    this.type = "angle";
                    break;

                case "ms":
                case "s":
                    this.type = "time";
                    break;

                case "hz":
                case "khz":
                    this.type = "frequency";
                    break;

                case "dpi":
                case "dpcm":
                    this.type = "resolution";
                    break;

                //default

            }

        } else if (/^([+\-]?[\d\.]+)%$/i.test(text)){  //percentage
            this.type = "percentage";
            this.value = +RegExp.$1;
        } else if (/^([+\-]?[\d\.]+)%$/i.test(text)){  //percentage
            this.type = "percentage";
            this.value = +RegExp.$1;
        } else if (/^([+\-]?\d+)$/i.test(text)){  //integer
            this.type = "integer";
            this.value = +RegExp.$1;
        } else if (/^([+\-]?[\d\.]+)$/i.test(text)){  //number
            this.type = "number";
            this.value = +RegExp.$1;

        } else if (/^#([a-f0-9]{3,6})/i.test(text)){  //hexcolor
            this.type = "color";
            temp = RegExp.$1;
            if (temp.length == 3){
                this.red    = parseInt(temp.charAt(0)+temp.charAt(0),16);
                this.green  = parseInt(temp.charAt(1)+temp.charAt(1),16);
                this.blue   = parseInt(temp.charAt(2)+temp.charAt(2),16);
            } else {
                this.red    = parseInt(temp.substring(0,2),16);
                this.green  = parseInt(temp.substring(2,4),16);
                this.blue   = parseInt(temp.substring(4,6),16);
            }
        } else if (/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.test(text)){ //rgb() color with absolute numbers
            this.type   = "color";
            this.red    = +RegExp.$1;
            this.green  = +RegExp.$2;
            this.blue   = +RegExp.$3;
        } else if (/^rgb\(\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i.test(text)){ //rgb() color with percentages
            this.type   = "color";
            this.red    = +RegExp.$1 * 255 / 100;
            this.green  = +RegExp.$2 * 255 / 100;
            this.blue   = +RegExp.$3 * 255 / 100;
        } else if (/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //rgba() color with absolute numbers
            this.type   = "color";
            this.red    = +RegExp.$1;
            this.green  = +RegExp.$2;
            this.blue   = +RegExp.$3;
            this.alpha  = +RegExp.$4;
        } else if (/^rgba\(\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //rgba() color with percentages
            this.type   = "color";
            this.red    = +RegExp.$1 * 255 / 100;
            this.green  = +RegExp.$2 * 255 / 100;
            this.blue   = +RegExp.$3 * 255 / 100;
            this.alpha  = +RegExp.$4;
        } else if (/^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i.test(text)){ //hsl()
            this.type   = "color";
            this.hue    = +RegExp.$1;
            this.saturation = +RegExp.$2 / 100;
            this.lightness  = +RegExp.$3 / 100;
        } else if (/^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //hsla() color with percentages
            this.type   = "color";
            this.hue    = +RegExp.$1;
            this.saturation = +RegExp.$2 / 100;
            this.lightness  = +RegExp.$3 / 100;
            this.alpha  = +RegExp.$4;
        } else if (/^url\(["']?([^\)"']+)["']?\)/i.test(text)){ //URI
            this.type   = "uri";
            this.uri    = RegExp.$1;
        } else if (/^([^\(]+)\(/i.test(text)){
            this.type   = "function";
            this.name   = RegExp.$1;
            this.value  = text;
        } else if (/^["'][^"']*["']/.test(text)){    //string
            this.type   = "string";
            this.value  = eval(text);
        } else if (Colors[text.toLowerCase()]){  //named color
            this.type   = "color";
            temp        = Colors[text.toLowerCase()].substring(1);
            this.red    = parseInt(temp.substring(0,2),16);
            this.green  = parseInt(temp.substring(2,4),16);
            this.blue   = parseInt(temp.substring(4,6),16);
        } else if (/^[\,\/]$/.test(text)){
            this.type   = "operator";
            this.value  = text;
        } else if (/^[a-z\-\u0080-\uFFFF][a-z0-9\-\u0080-\uFFFF]*$/i.test(text)){
            this.type   = "identifier";
            this.value  = text;
        }

    }

    PropertyValuePart.prototype = new SyntaxUnit();
    PropertyValuePart.prototype.constructor = PropertyValuePart;

    /**
     * Create a new syntax unit based solely on the given token.
     * Convenience method for creating a new syntax unit when
     * it represents a single token instead of multiple.
     * @param {Object} token The token object to represent.
     * @return {parserlib.css.PropertyValuePart} The object representing the token.
     * @static
     * @method fromToken
     */
    PropertyValuePart.fromToken = function(token){
        return new PropertyValuePart(token.value, token.startLine, token.startCol);
    };
    var Pseudos = {
        ":first-letter": 1,
        ":first-line":   1,
        ":before":       1,
        ":after":        1
    };

    Pseudos.ELEMENT = 1;
    Pseudos.CLASS = 2;

    Pseudos.isElement = function(pseudo){
        return pseudo.indexOf("::") === 0 || Pseudos[pseudo.toLowerCase()] == Pseudos.ELEMENT;
    };
    /*global SyntaxUnit, Parser, Specificity*/
    /**
     * Represents an entire single selector, including all parts but not
     * including multiple selectors (those separated by commas).
     * @namespace parserlib.css
     * @class Selector
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {Array} parts Array of selectors parts making up this selector.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function Selector(parts, line, col){

        SyntaxUnit.call(this, parts.join(" "), line, col, Parser.SELECTOR_TYPE);

        /**
         * The parts that make up the selector.
         * @type Array
         * @property parts
         */
        this.parts = parts;

        /**
         * The specificity of the selector.
         * @type parserlib.css.Specificity
         * @property specificity
         */
        this.specificity = Specificity.calculate(this);

    }

    Selector.prototype = new SyntaxUnit();
    Selector.prototype.constructor = Selector;


    /*global SyntaxUnit, Parser*/
    /**
     * Represents a single part of a selector string, meaning a single set of
     * element name and modifiers. This does not include combinators such as
     * spaces, +, >, etc.
     * @namespace parserlib.css
     * @class SelectorPart
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {String} elementName The element name in the selector or null
     *      if there is no element name.
     * @param {Array} modifiers Array of individual modifiers for the element.
     *      May be empty if there are none.
     * @param {String} text The text representation of the unit.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function SelectorPart(elementName, modifiers, text, line, col){

        SyntaxUnit.call(this, text, line, col, Parser.SELECTOR_PART_TYPE);

        /**
         * The tag name of the element to which this part
         * of the selector affects.
         * @type String
         * @property elementName
         */
        this.elementName = elementName;

        /**
         * The parts that come after the element name, such as class names, IDs,
         * pseudo classes/elements, etc.
         * @type Array
         * @property modifiers
         */
        this.modifiers = modifiers;

    }

    SelectorPart.prototype = new SyntaxUnit();
    SelectorPart.prototype.constructor = SelectorPart;


    /*global SyntaxUnit, Parser*/
    /**
     * Represents a selector modifier string, meaning a class name, element name,
     * element ID, pseudo rule, etc.
     * @namespace parserlib.css
     * @class SelectorSubPart
     * @extends parserlib.util.SyntaxUnit
     * @constructor
     * @param {String} text The text representation of the unit.
     * @param {String} type The type of selector modifier.
     * @param {int} line The line of text on which the unit resides.
     * @param {int} col The column of text on which the unit resides.
     */
    function SelectorSubPart(text, type, line, col){

        SyntaxUnit.call(this, text, line, col, Parser.SELECTOR_SUB_PART_TYPE);

        /**
         * The type of modifier.
         * @type String
         * @property type
         */
        this.type = type;

        /**
         * Some subparts have arguments, this represents them.
         * @type Array
         * @property args
         */
        this.args = [];

    }

    SelectorSubPart.prototype = new SyntaxUnit();
    SelectorSubPart.prototype.constructor = SelectorSubPart;


    /*global Pseudos, SelectorPart*/
    /**
     * Represents a selector's specificity.
     * @namespace parserlib.css
     * @class Specificity
     * @constructor
     * @param {int} a Should be 1 for inline styles, zero for stylesheet styles
     * @param {int} b Number of ID selectors
     * @param {int} c Number of classes and pseudo classes
     * @param {int} d Number of element names and pseudo elements
     */
    function Specificity(a, b, c, d){
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    Specificity.prototype = {
        constructor: Specificity,

        /**
         * Compare this specificity to another.
         * @param {Specificity} other The other specificity to compare to.
         * @return {int} -1 if the other specificity is larger, 1 if smaller, 0 if equal.
         * @method compare
         */
        compare: function(other){
            var comps = ["a", "b", "c", "d"],
                i, len;

            for (i=0, len=comps.length; i < len; i++){
                if (this[comps[i]] < other[comps[i]]){
                    return -1;
                } else if (this[comps[i]] > other[comps[i]]){
                    return 1;
                }
            }

            return 0;
        },

        /**
         * Creates a numeric value for the specificity.
         * @return {int} The numeric value for the specificity.
         * @method valueOf
         */
        valueOf: function(){
            return (this.a * 1000) + (this.b * 100) + (this.c * 10) + this.d;
        },

        /**
         * Returns a string representation for specificity.
         * @return {String} The string representation of specificity.
         * @method toString
         */
        toString: function(){
            return this.a + "," + this.b + "," + this.c + "," + this.d;
        }

    };

    /**
     * Calculates the specificity of the given selector.
     * @param {parserlib.css.Selector} The selector to calculate specificity for.
     * @return {parserlib.css.Specificity} The specificity of the selector.
     * @static
     * @method calculate
     */
    Specificity.calculate = function(selector){

        var i, len,
            part,
            b=0, c=0, d=0;

        function updateValues(part){

            var i, j, len, num,
                elementName = part.elementName ? part.elementName.text : "",
                modifier;

            if (elementName && elementName.charAt(elementName.length-1) != "*") {
                d++;
            }

            for (i=0, len=part.modifiers.length; i < len; i++){
                modifier = part.modifiers[i];
                switch(modifier.type){
                    case "class":
                    case "attribute":
                        c++;
                        break;

                    case "id":
                        b++;
                        break;

                    case "pseudo":
                        if (Pseudos.isElement(modifier.text)){
                            d++;
                        } else {
                            c++;
                        }
                        break;

                    case "not":
                        for (j=0, num=modifier.args.length; j < num; j++){
                            updateValues(modifier.args[j]);
                        }
                }
             }
        }

        for (i=0, len=selector.parts.length; i < len; i++){
            part = selector.parts[i];

            if (part instanceof SelectorPart){
                updateValues(part);
            }
        }

        return new Specificity(0, b, c, d);
    };

    /*global Tokens, TokenStreamBase*/

    var h = /^[0-9a-fA-F]$/,
        nonascii = /^[\u0080-\uFFFF]$/,
        nl = /\n|\r\n|\r|\f/;

    //-----------------------------------------------------------------------------
    // Helper functions
    //-----------------------------------------------------------------------------


    function isHexDigit(c){
        return c !== null && h.test(c);
    }

    function isDigit(c){
        return c !== null && /\d/.test(c);
    }

    function isWhitespace(c){
        return c !== null && /\s/.test(c);
    }

    function isNewLine(c){
        return c !== null && nl.test(c);
    }

    function isNameStart(c){
        return c !== null && (/[a-z_\u0080-\uFFFF\\]/i.test(c));
    }

    function isNameChar(c){
        return c !== null && (isNameStart(c) || /[0-9\-\\]/.test(c));
    }

    function isIdentStart(c){
        return c !== null && (isNameStart(c) || /\-\\/.test(c));
    }

    function mix(receiver, supplier){
        for (var prop in supplier){
            if (supplier.hasOwnProperty(prop)){
                receiver[prop] = supplier[prop];
            }
        }
        return receiver;
    }

    //-----------------------------------------------------------------------------
    // CSS Token Stream
    //-----------------------------------------------------------------------------


    /**
     * A token stream that produces CSS tokens.
     * @param {String|Reader} input The source of text to tokenize.
     * @constructor
     * @class TokenStream
     * @namespace parserlib.css
     */
    function TokenStream(input){
        TokenStreamBase.call(this, input, Tokens);
    }

    TokenStream.prototype = mix(new TokenStreamBase(), {

        /**
         * Overrides the TokenStreamBase method of the same name
         * to produce CSS tokens.
         * @param {variant} channel The name of the channel to use
         *      for the next token.
         * @return {Object} A token object representing the next token.
         * @method _getToken
         * @private
         */
        _getToken: function(channel){

            var c,
                reader = this._reader,
                token   = null,
                startLine   = reader.getLine(),
                startCol    = reader.getCol();

            c = reader.read();


            while(c){
                switch(c){

                    /*
                     * Potential tokens:
                     * - COMMENT
                     * - SLASH
                     * - CHAR
                     */
                    case "/":

                        if(reader.peek() == "*"){
                            token = this.commentToken(c, startLine, startCol);
                        } else {
                            token = this.charToken(c, startLine, startCol);
                        }
                        break;

                    /*
                     * Potential tokens:
                     * - DASHMATCH
                     * - INCLUDES
                     * - PREFIXMATCH
                     * - SUFFIXMATCH
                     * - SUBSTRINGMATCH
                     * - CHAR
                     */
                    case "|":
                    case "~":
                    case "^":
                    case "$":
                    case "*":
                        if(reader.peek() == "="){
                            token = this.comparisonToken(c, startLine, startCol);
                        } else {
                            token = this.charToken(c, startLine, startCol);
                        }
                        break;

                    /*
                     * Potential tokens:
                     * - STRING
                     * - INVALID
                     */
                    case "\"":
                    case "'":
                        token = this.stringToken(c, startLine, startCol);
                        break;

                    /*
                     * Potential tokens:
                     * - HASH
                     * - CHAR
                     */
                    case "#":
                        if (isNameChar(reader.peek())){
                            token = this.hashToken(c, startLine, startCol);
                        } else {
                            token = this.charToken(c, startLine, startCol);
                        }
                        break;

                    /*
                     * Potential tokens:
                     * - DOT
                     * - NUMBER
                     * - DIMENSION
                     * - PERCENTAGE
                     */
                    case ".":
                        if (isDigit(reader.peek())){
                            token = this.numberToken(c, startLine, startCol);
                        } else {
                            token = this.charToken(c, startLine, startCol);
                        }
                        break;

                    /*
                     * Potential tokens:
                     * - CDC
                     * - MINUS
                     * - NUMBER
                     * - DIMENSION
                     * - PERCENTAGE
                     */
                    case "-":
                        if (reader.peek() == "-"){  //could be closing HTML-style comment
                            token = this.htmlCommentEndToken(c, startLine, startCol);
                        } else if (isNameStart(reader.peek())){
                            token = this.identOrFunctionToken(c, startLine, startCol);
                        } else {
                            token = this.charToken(c, startLine, startCol);
                        }
                        break;

                    /*
                     * Potential tokens:
                     * - IMPORTANT_SYM
                     * - CHAR
                     */
                    case "!":
                        token = this.importantToken(c, startLine, startCol);
                        break;

                    /*
                     * Any at-keyword or CHAR
                     */
                    case "@":
                        token = this.atRuleToken(c, startLine, startCol);
                        break;

                    /*
                     * Potential tokens:
                     * - NOT
                     * - CHAR
                     */
                    case ":":
                        token = this.notToken(c, startLine, startCol);
                        break;

                    /*
                     * Potential tokens:
                     * - CDO
                     * - CHAR
                     */
                    case "<":
                        token = this.htmlCommentStartToken(c, startLine, startCol);
                        break;

                    /*
                     * Potential tokens:
                     * - UNICODE_RANGE
                     * - URL
                     * - CHAR
                     */
                    case "U":
                    case "u":
                        if (reader.peek() == "+"){
                            token = this.unicodeRangeToken(c, startLine, startCol);
                            break;
                        }
                        /* falls through */
                    default:

                        /*
                         * Potential tokens:
                         * - NUMBER
                         * - DIMENSION
                         * - LENGTH
                         * - FREQ
                         * - TIME
                         * - EMS
                         * - EXS
                         * - ANGLE
                         */
                        if (isDigit(c)){
                            token = this.numberToken(c, startLine, startCol);
                        } else

                        /*
                         * Potential tokens:
                         * - S
                         */
                        if (isWhitespace(c)){
                            token = this.whitespaceToken(c, startLine, startCol);
                        } else

                        /*
                         * Potential tokens:
                         * - IDENT
                         */
                        if (isIdentStart(c)){
                            token = this.identOrFunctionToken(c, startLine, startCol);
                        } else

                        /*
                         * Potential tokens:
                         * - CHAR
                         * - PLUS
                         */
                        {
                            token = this.charToken(c, startLine, startCol);
                        }






                }

                //make sure this token is wanted
                //TODO: check channel
                break;
            }

            if (!token && c === null){
                token = this.createToken(Tokens.EOF,null,startLine,startCol);
            }

            return token;
        },

        //-------------------------------------------------------------------------
        // Methods to create tokens
        //-------------------------------------------------------------------------

        /**
         * Produces a token based on available data and the current
         * reader position information. This method is called by other
         * private methods to create tokens and is never called directly.
         * @param {int} tt The token type.
         * @param {String} value The text value of the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @param {Object} options (Optional) Specifies a channel property
         *      to indicate that a different channel should be scanned
         *      and/or a hide property indicating that the token should
         *      be hidden.
         * @return {Object} A token object.
         * @method createToken
         */
        createToken: function(tt, value, startLine, startCol, options){
            var reader = this._reader;
            options = options || {};

            return {
                value:      value,
                type:       tt,
                channel:    options.channel,
                hide:       options.hide || false,
                startLine:  startLine,
                startCol:   startCol,
                endLine:    reader.getLine(),
                endCol:     reader.getCol()
            };
        },

        //-------------------------------------------------------------------------
        // Methods to create specific tokens
        //-------------------------------------------------------------------------

        /**
         * Produces a token for any at-rule. If the at-rule is unknown, then
         * the token is for a single "@" character.
         * @param {String} first The first character for the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method atRuleToken
         */
        atRuleToken: function(first, startLine, startCol){
            var rule    = first,
                reader  = this._reader,
                tt      = Tokens.CHAR,
                valid   = false,
                ident,
                c;

            /*
             * First, mark where we are. There are only four @ rules,
             * so anything else is really just an invalid token.
             * Basically, if this doesn't match one of the known @
             * rules, just return '@' as an unknown token and allow
             * parsing to continue after that point.
             */
            reader.mark();

            //try to find the at-keyword
            ident = this.readName();
            rule = first + ident;
            tt = Tokens.type(rule.toLowerCase());

            //if it's not valid, use the first character only and reset the reader
            if (tt == Tokens.CHAR || tt == Tokens.UNKNOWN){
                if (rule.length > 1){
                    tt = Tokens.UNKNOWN_SYM;
                } else {
                    tt = Tokens.CHAR;
                    rule = first;
                    reader.reset();
                }
            }

            return this.createToken(tt, rule, startLine, startCol);
        },

        /**
         * Produces a character token based on the given character
         * and location in the stream. If there's a special (non-standard)
         * token name, this is used; otherwise CHAR is used.
         * @param {String} c The character for the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method charToken
         */
        charToken: function(c, startLine, startCol){
            var tt = Tokens.type(c);

            if (tt == -1){
                tt = Tokens.CHAR;
            }

            return this.createToken(tt, c, startLine, startCol);
        },

        /**
         * Produces a character token based on the given character
         * and location in the stream. If there's a special (non-standard)
         * token name, this is used; otherwise CHAR is used.
         * @param {String} first The first character for the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method commentToken
         */
        commentToken: function(first, startLine, startCol){
            var reader  = this._reader,
                comment = this.readComment(first);

            return this.createToken(Tokens.COMMENT, comment, startLine, startCol);
        },

        /**
         * Produces a comparison token based on the given character
         * and location in the stream. The next character must be
         * read and is already known to be an equals sign.
         * @param {String} c The character for the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method comparisonToken
         */
        comparisonToken: function(c, startLine, startCol){
            var reader  = this._reader,
                comparison  = c + reader.read(),
                tt      = Tokens.type(comparison) || Tokens.CHAR;

            return this.createToken(tt, comparison, startLine, startCol);
        },

        /**
         * Produces a hash token based on the specified information. The
         * first character provided is the pound sign (#) and then this
         * method reads a name afterward.
         * @param {String} first The first character (#) in the hash name.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method hashToken
         */
        hashToken: function(first, startLine, startCol){
            var reader  = this._reader,
                name    = this.readName(first);

            return this.createToken(Tokens.HASH, name, startLine, startCol);
        },

        /**
         * Produces a CDO or CHAR token based on the specified information. The
         * first character is provided and the rest is read by the function to determine
         * the correct token to create.
         * @param {String} first The first character in the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method htmlCommentStartToken
         */
        htmlCommentStartToken: function(first, startLine, startCol){
            var reader      = this._reader,
                text        = first;

            reader.mark();
            text += reader.readCount(3);

            if (text == "<!--"){
                return this.createToken(Tokens.CDO, text, startLine, startCol);
            } else {
                reader.reset();
                return this.charToken(first, startLine, startCol);
            }
        },

        /**
         * Produces a CDC or CHAR token based on the specified information. The
         * first character is provided and the rest is read by the function to determine
         * the correct token to create.
         * @param {String} first The first character in the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method htmlCommentEndToken
         */
        htmlCommentEndToken: function(first, startLine, startCol){
            var reader      = this._reader,
                text        = first;

            reader.mark();
            text += reader.readCount(2);

            if (text == "-->"){
                return this.createToken(Tokens.CDC, text, startLine, startCol);
            } else {
                reader.reset();
                return this.charToken(first, startLine, startCol);
            }
        },

        /**
         * Produces an IDENT or FUNCTION token based on the specified information. The
         * first character is provided and the rest is read by the function to determine
         * the correct token to create.
         * @param {String} first The first character in the identifier.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method identOrFunctionToken
         */
        identOrFunctionToken: function(first, startLine, startCol){
            var reader  = this._reader,
                ident   = this.readName(first),
                tt      = Tokens.IDENT;

            //if there's a left paren immediately after, it's a URI or function
            if (reader.peek() == "("){
                ident += reader.read();
                if (ident.toLowerCase() == "url("){
                    tt = Tokens.URI;
                    ident = this.readURI(ident);

                    //didn't find a valid URL or there's no closing paren
                    if (ident.toLowerCase() == "url("){
                        tt = Tokens.FUNCTION;
                    }
                } else {
                    tt = Tokens.FUNCTION;
                }
            } else if (reader.peek() == ":"){  //might be an IE function

                //IE-specific functions always being with progid:
                if (ident.toLowerCase() == "progid"){
                    ident += reader.readTo("(");
                    tt = Tokens.IE_FUNCTION;
                }
            }

            return this.createToken(tt, ident, startLine, startCol);
        },

        /**
         * Produces an IMPORTANT_SYM or CHAR token based on the specified information. The
         * first character is provided and the rest is read by the function to determine
         * the correct token to create.
         * @param {String} first The first character in the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method importantToken
         */
        importantToken: function(first, startLine, startCol){
            var reader      = this._reader,
                important   = first,
                tt          = Tokens.CHAR,
                temp,
                c;

            reader.mark();
            c = reader.read();

            while(c){

                //there can be a comment in here
                if (c == "/"){

                    //if the next character isn't a star, then this isn't a valid !important token
                    if (reader.peek() != "*"){
                        break;
                    } else {
                        temp = this.readComment(c);
                        if (temp === ""){    //broken!
                            break;
                        }
                    }
                } else if (isWhitespace(c)){
                    important += c + this.readWhitespace();
                } else if (/i/i.test(c)){
                    temp = reader.readCount(8);
                    if (/mportant/i.test(temp)){
                        important += c + temp;
                        tt = Tokens.IMPORTANT_SYM;

                    }
                    break;  //we're done
                } else {
                    break;
                }

                c = reader.read();
            }

            if (tt == Tokens.CHAR){
                reader.reset();
                return this.charToken(first, startLine, startCol);
            } else {
                return this.createToken(tt, important, startLine, startCol);
            }


        },

        /**
         * Produces a NOT or CHAR token based on the specified information. The
         * first character is provided and the rest is read by the function to determine
         * the correct token to create.
         * @param {String} first The first character in the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method notToken
         */
        notToken: function(first, startLine, startCol){
            var reader      = this._reader,
                text        = first;

            reader.mark();
            text += reader.readCount(4);

            if (text.toLowerCase() == ":not("){
                return this.createToken(Tokens.NOT, text, startLine, startCol);
            } else {
                reader.reset();
                return this.charToken(first, startLine, startCol);
            }
        },

        /**
         * Produces a number token based on the given character
         * and location in the stream. This may return a token of
         * NUMBER, EMS, EXS, LENGTH, ANGLE, TIME, FREQ, DIMENSION,
         * or PERCENTAGE.
         * @param {String} first The first character for the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method numberToken
         */
        numberToken: function(first, startLine, startCol){
            var reader  = this._reader,
                value   = this.readNumber(first),
                ident,
                tt      = Tokens.NUMBER,
                c       = reader.peek();

            if (isIdentStart(c)){
                ident = this.readName(reader.read());
                value += ident;

                if (/^em$|^ex$|^px$|^gd$|^rem$|^vw$|^vh$|^vm$|^ch$|^cm$|^mm$|^in$|^pt$|^pc$/i.test(ident)){
                    tt = Tokens.LENGTH;
                } else if (/^deg|^rad$|^grad$/i.test(ident)){
                    tt = Tokens.ANGLE;
                } else if (/^ms$|^s$/i.test(ident)){
                    tt = Tokens.TIME;
                } else if (/^hz$|^khz$/i.test(ident)){
                    tt = Tokens.FREQ;
                } else if (/^dpi$|^dpcm$/i.test(ident)){
                    tt = Tokens.RESOLUTION;
                } else {
                    tt = Tokens.DIMENSION;
                }

            } else if (c == "%"){
                value += reader.read();
                tt = Tokens.PERCENTAGE;
            }

            return this.createToken(tt, value, startLine, startCol);
        },

        /**
         * Produces a string token based on the given character
         * and location in the stream. Since strings may be indicated
         * by single or double quotes, a failure to match starting
         * and ending quotes results in an INVALID token being generated.
         * The first character in the string is passed in and then
         * the rest are read up to and including the final quotation mark.
         * @param {String} first The first character in the string.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method stringToken
         */
        stringToken: function(first, startLine, startCol){
            var delim   = first,
                string  = first,
                reader  = this._reader,
                prev    = first,
                tt      = Tokens.STRING,
                c       = reader.read();

            while(c){
                string += c;

                //if the delimiter is found with an escapement, we're done.
                if (c == delim && prev != "\\"){
                    break;
                }

                //if there's a newline without an escapement, it's an invalid string
                if (isNewLine(reader.peek()) && c != "\\"){
                    tt = Tokens.INVALID;
                    break;
                }

                //save previous and get next
                prev = c;
                c = reader.read();
            }

            //if c is null, that means we're out of input and the string was never closed
            if (c === null){
                tt = Tokens.INVALID;
            }

            return this.createToken(tt, string, startLine, startCol);
        },

        unicodeRangeToken: function(first, startLine, startCol){
            var reader  = this._reader,
                value   = first,
                temp,
                tt      = Tokens.CHAR;

            //then it should be a unicode range
            if (reader.peek() == "+"){
                reader.mark();
                value += reader.read();
                value += this.readUnicodeRangePart(true);

                //ensure there's an actual unicode range here
                if (value.length == 2){
                    reader.reset();
                } else {

                    tt = Tokens.UNICODE_RANGE;

                    //if there's a ? in the first part, there can't be a second part
                    if (value.indexOf("?") == -1){

                        if (reader.peek() == "-"){
                            reader.mark();
                            temp = reader.read();
                            temp += this.readUnicodeRangePart(false);

                            //if there's not another value, back up and just take the first
                            if (temp.length == 1){
                                reader.reset();
                            } else {
                                value += temp;
                            }
                        }

                    }
                }
            }

            return this.createToken(tt, value, startLine, startCol);
        },

        /**
         * Produces a S token based on the specified information. Since whitespace
         * may have multiple characters, this consumes all whitespace characters
         * into a single token.
         * @param {String} first The first character in the token.
         * @param {int} startLine The beginning line for the character.
         * @param {int} startCol The beginning column for the character.
         * @return {Object} A token object.
         * @method whitespaceToken
         */
        whitespaceToken: function(first, startLine, startCol){
            var reader  = this._reader,
                value   = first + this.readWhitespace();
            return this.createToken(Tokens.S, value, startLine, startCol);
        },




        //-------------------------------------------------------------------------
        // Methods to read values from the string stream
        //-------------------------------------------------------------------------

        readUnicodeRangePart: function(allowQuestionMark){
            var reader  = this._reader,
                part = "",
                c       = reader.peek();

            //first read hex digits
            while(isHexDigit(c) && part.length < 6){
                reader.read();
                part += c;
                c = reader.peek();
            }

            //then read question marks if allowed
            if (allowQuestionMark){
                while(c == "?" && part.length < 6){
                    reader.read();
                    part += c;
                    c = reader.peek();
                }
            }

            //there can't be any other characters after this point

            return part;
        },

        readWhitespace: function(){
            var reader  = this._reader,
                whitespace = "",
                c       = reader.peek();

            while(isWhitespace(c)){
                reader.read();
                whitespace += c;
                c = reader.peek();
            }

            return whitespace;
        },
        readNumber: function(first){
            var reader  = this._reader,
                number  = first,
                hasDot  = (first == "."),
                c       = reader.peek();


            while(c){
                if (isDigit(c)){
                    number += reader.read();
                } else if (c == "."){
                    if (hasDot){
                        break;
                    } else {
                        hasDot = true;
                        number += reader.read();
                    }
                } else {
                    break;
                }

                c = reader.peek();
            }

            return number;
        },
        readString: function(){
            var reader  = this._reader,
                delim   = reader.read(),
                string  = delim,
                prev    = delim,
                c       = reader.peek();

            while(c){
                c = reader.read();
                string += c;

                //if the delimiter is found with an escapement, we're done.
                if (c == delim && prev != "\\"){
                    break;
                }

                //if there's a newline without an escapement, it's an invalid string
                if (isNewLine(reader.peek()) && c != "\\"){
                    string = "";
                    break;
                }

                //save previous and get next
                prev = c;
                c = reader.peek();
            }

            //if c is null, that means we're out of input and the string was never closed
            if (c === null){
                string = "";
            }

            return string;
        },
        readURI: function(first){
            var reader  = this._reader,
                uri     = first,
                inner   = "",
                c       = reader.peek();

            reader.mark();

            //skip whitespace before
            while(c && isWhitespace(c)){
                reader.read();
                c = reader.peek();
            }

            //it's a string
            if (c == "'" || c == "\""){
                inner = this.readString();
            } else {
                inner = this.readURL();
            }

            c = reader.peek();

            //skip whitespace after
            while(c && isWhitespace(c)){
                reader.read();
                c = reader.peek();
            }

            //if there was no inner value or the next character isn't closing paren, it's not a URI
            if (inner === "" || c != ")"){
                uri = first;
                reader.reset();
            } else {
                uri += inner + reader.read();
            }

            return uri;
        },
        readURL: function(){
            var reader  = this._reader,
                url     = "",
                c       = reader.peek();

            //TODO: Check for escape and nonascii
            while (/^[!#$%&\\*-~]$/.test(c)){
                url += reader.read();
                c = reader.peek();
            }

            return url;

        },
        readName: function(first){
            var reader  = this._reader,
                ident   = first || "",
                c       = reader.peek();

            while(true){
                if (c == "\\"){
                    ident += this.readEscape(reader.read());
                    c = reader.peek();
                } else if(c && isNameChar(c)){
                    ident += reader.read();
                    c = reader.peek();
                } else {
                    break;
                }
            }

            return ident;
        },

        readEscape: function(first){
            var reader  = this._reader,
                cssEscape = first || "",
                i       = 0,
                c       = reader.peek();

            if (isHexDigit(c)){
                do {
                    cssEscape += reader.read();
                    c = reader.peek();
                } while(c && isHexDigit(c) && ++i < 6);
            }

            if (cssEscape.length == 3 && /\s/.test(c) ||
                cssEscape.length == 7 || cssEscape.length == 1){
                    reader.read();
            } else {
                c = "";
            }

            return cssEscape + c;
        },

        readComment: function(first){
            var reader  = this._reader,
                comment = first || "",
                c       = reader.read();

            if (c == "*"){
                while(c){
                    comment += c;

                    //look for end of comment
                    if (comment.length > 2 && c == "*" && reader.peek() == "/"){
                        comment += reader.read();
                        break;
                    }

                    c = reader.read();
                }

                return comment;
            } else {
                return "";
            }

        }
    });


    var Tokens  = [

        /*
         * The following token names are defined in CSS3 Grammar: http://www.w3.org/TR/css3-syntax/#lexical
         */

        //HTML-style comments
        { name: "CDO"},
        { name: "CDC"},

        //ignorables
        { name: "S", whitespace: true/*, channel: "ws"*/},
        { name: "COMMENT", comment: true, hide: true, channel: "comment" },

        //attribute equality
        { name: "INCLUDES", text: "~="},
        { name: "DASHMATCH", text: "|="},
        { name: "PREFIXMATCH", text: "^="},
        { name: "SUFFIXMATCH", text: "$="},
        { name: "SUBSTRINGMATCH", text: "*="},

        //identifier types
        { name: "STRING"},
        { name: "IDENT"},
        { name: "HASH"},

        //at-keywords
        { name: "IMPORT_SYM", text: "@import"},
        { name: "PAGE_SYM", text: "@page"},
        { name: "MEDIA_SYM", text: "@media"},
        { name: "FONT_FACE_SYM", text: "@font-face"},
        { name: "CHARSET_SYM", text: "@charset"},
        { name: "NAMESPACE_SYM", text: "@namespace"},
        { name: "VIEWPORT_SYM", text: "@viewport"},
        { name: "UNKNOWN_SYM" },
        //{ name: "ATKEYWORD"},

        //CSS3 animations
        { name: "KEYFRAMES_SYM", text: [ "@keyframes", "@-webkit-keyframes", "@-moz-keyframes", "@-o-keyframes" ] },

        //important symbol
        { name: "IMPORTANT_SYM"},

        //measurements
        { name: "LENGTH"},
        { name: "ANGLE"},
        { name: "TIME"},
        { name: "FREQ"},
        { name: "DIMENSION"},
        { name: "PERCENTAGE"},
        { name: "NUMBER"},

        //functions
        { name: "URI"},
        { name: "FUNCTION"},

        //Unicode ranges
        { name: "UNICODE_RANGE"},

        /*
         * The following token names are defined in CSS3 Selectors: http://www.w3.org/TR/css3-selectors/#selector-syntax
         */

        //invalid string
        { name: "INVALID"},

        //combinators
        { name: "PLUS", text: "+" },
        { name: "GREATER", text: ">"},
        { name: "COMMA", text: ","},
        { name: "TILDE", text: "~"},

        //modifier
        { name: "NOT"},

        /*
         * Defined in CSS3 Paged Media
         */
        { name: "TOPLEFTCORNER_SYM", text: "@top-left-corner"},
        { name: "TOPLEFT_SYM", text: "@top-left"},
        { name: "TOPCENTER_SYM", text: "@top-center"},
        { name: "TOPRIGHT_SYM", text: "@top-right"},
        { name: "TOPRIGHTCORNER_SYM", text: "@top-right-corner"},
        { name: "BOTTOMLEFTCORNER_SYM", text: "@bottom-left-corner"},
        { name: "BOTTOMLEFT_SYM", text: "@bottom-left"},
        { name: "BOTTOMCENTER_SYM", text: "@bottom-center"},
        { name: "BOTTOMRIGHT_SYM", text: "@bottom-right"},
        { name: "BOTTOMRIGHTCORNER_SYM", text: "@bottom-right-corner"},
        { name: "LEFTTOP_SYM", text: "@left-top"},
        { name: "LEFTMIDDLE_SYM", text: "@left-middle"},
        { name: "LEFTBOTTOM_SYM", text: "@left-bottom"},
        { name: "RIGHTTOP_SYM", text: "@right-top"},
        { name: "RIGHTMIDDLE_SYM", text: "@right-middle"},
        { name: "RIGHTBOTTOM_SYM", text: "@right-bottom"},

        /*
         * The following token names are defined in CSS3 Media Queries: http://www.w3.org/TR/css3-mediaqueries/#syntax
         */
        /*{ name: "MEDIA_ONLY", state: "media"},
        { name: "MEDIA_NOT", state: "media"},
        { name: "MEDIA_AND", state: "media"},*/
        { name: "RESOLUTION", state: "media"},

        /*
         * The following token names are not defined in any CSS specification but are used by the lexer.
         */

        //not a real token, but useful for stupid IE filters
        { name: "IE_FUNCTION" },

        //part of CSS3 grammar but not the Flex code
        { name: "CHAR" },

        //TODO: Needed?
        //Not defined as tokens, but might as well be
        {
            name: "PIPE",
            text: "|"
        },
        {
            name: "SLASH",
            text: "/"
        },
        {
            name: "MINUS",
            text: "-"
        },
        {
            name: "STAR",
            text: "*"
        },

        {
            name: "LBRACE",
            text: "{"
        },
        {
            name: "RBRACE",
            text: "}"
        },
        {
            name: "LBRACKET",
            text: "["
        },
        {
            name: "RBRACKET",
            text: "]"
        },
        {
            name: "EQUALS",
            text: "="
        },
        {
            name: "COLON",
            text: ":"
        },
        {
            name: "SEMICOLON",
            text: ";"
        },

        {
            name: "LPAREN",
            text: "("
        },
        {
            name: "RPAREN",
            text: ")"
        },
        {
            name: "DOT",
            text: "."
        }
    ];

    (function(){

        var nameMap = [],
            typeMap = {};

        Tokens.UNKNOWN = -1;
        Tokens.unshift({name:"EOF"});
        for (var i=0, len = Tokens.length; i < len; i++){
            nameMap.push(Tokens[i].name);
            Tokens[Tokens[i].name] = i;
            if (Tokens[i].text){
                if (Tokens[i].text instanceof Array){
                    for (var j=0; j < Tokens[i].text.length; j++){
                        typeMap[Tokens[i].text[j]] = i;
                    }
                } else {
                    typeMap[Tokens[i].text] = i;
                }
            }
        }

        Tokens.name = function(tt){
            return nameMap[tt];
        };

        Tokens.type = function(c){
            return typeMap[c] || -1;
        };

    })();




    //This file will likely change a lot! Very experimental!
    /*global Properties, ValidationTypes, ValidationError, PropertyValueIterator */
    var Validation = {

        validate: function(property, value){

            //normalize name
            var name        = property.toString().toLowerCase(),
                parts       = value.parts,
                expression  = new PropertyValueIterator(value),
                spec        = Properties[name],
                part,
                valid,
                j, count,
                msg,
                types,
                last,
                literals,
                max, multi, group;

            if (!spec) {
                if (name.indexOf("-") !== 0){    //vendor prefixed are ok
                    throw new ValidationError("Unknown property '" + property + "'.", property.line, property.col);
                }
            } else if (typeof spec != "number"){

                //initialization
                if (typeof spec == "string"){
                    if (spec.indexOf("||") > -1) {
                        this.groupProperty(spec, expression);
                    } else {
                        this.singleProperty(spec, expression, 1);
                    }

                } else if (spec.multi) {
                    this.multiProperty(spec.multi, expression, spec.comma, spec.max || Infinity);
                } else if (typeof spec == "function") {
                    spec(expression);
                }

            }

        },

        singleProperty: function(types, expression, max, partial) {

            var result      = false,
                value       = expression.value,
                count       = 0,
                part;

            while (expression.hasNext() && count < max) {
                result = ValidationTypes.isAny(expression, types);
                if (!result) {
                    break;
                }
                count++;
            }

            if (!result) {
                if (expression.hasNext() && !expression.isFirst()) {
                    part = expression.peek();
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                     throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
                }
            } else if (expression.hasNext()) {
                part = expression.next();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            }

        },

        multiProperty: function (types, expression, comma, max) {

            var result      = false,
                value       = expression.value,
                count       = 0,
                sep         = false,
                part;

            while(expression.hasNext() && !result && count < max) {
                if (ValidationTypes.isAny(expression, types)) {
                    count++;
                    if (!expression.hasNext()) {
                        result = true;

                    } else if (comma) {
                        if (expression.peek() == ",") {
                            part = expression.next();
                        } else {
                            break;
                        }
                    }
                } else {
                    break;

                }
            }

            if (!result) {
                if (expression.hasNext() && !expression.isFirst()) {
                    part = expression.peek();
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                    part = expression.previous();
                    if (comma && part == ",") {
                        throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                    } else {
                        throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
                    }
                }

            } else if (expression.hasNext()) {
                part = expression.next();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            }

        },

        groupProperty: function (types, expression, comma) {

            var result      = false,
                value       = expression.value,
                typeCount   = types.split("||").length,
                groups      = { count: 0 },
                partial     = false,
                name,
                part;

            while(expression.hasNext() && !result) {
                name = ValidationTypes.isAnyOfGroup(expression, types);
                if (name) {

                    //no dupes
                    if (groups[name]) {
                        break;
                    } else {
                        groups[name] = 1;
                        groups.count++;
                        partial = true;

                        if (groups.count == typeCount || !expression.hasNext()) {
                            result = true;
                        }
                    }
                } else {
                    break;
                }
            }

            if (!result) {
                if (partial && expression.hasNext()) {
                        part = expression.peek();
                        throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
                } else {
                    throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
                }
            } else if (expression.hasNext()) {
                part = expression.next();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            }
        }



    };
    /**
     * Type to use when a validation error occurs.
     * @class ValidationError
     * @namespace parserlib.util
     * @constructor
     * @param {String} message The error message.
     * @param {int} line The line at which the error occurred.
     * @param {int} col The column at which the error occurred.
     */
    function ValidationError(message, line, col){

        /**
         * The column at which the error occurred.
         * @type int
         * @property col
         */
        this.col = col;

        /**
         * The line at which the error occurred.
         * @type int
         * @property line
         */
        this.line = line;

        /**
         * The text representation of the unit.
         * @type String
         * @property text
         */
        this.message = message;

    }

    //inherit from Error
    ValidationError.prototype = new Error();
    //This file will likely change a lot! Very experimental!
    /*global Properties, Validation, ValidationError, PropertyValueIterator, console*/
    var ValidationTypes = {

        isLiteral: function (part, literals) {
            var text = part.text.toString().toLowerCase(),
                args = literals.split(" | "),
                i, len, found = false;

            for (i=0,len=args.length; i < len && !found; i++){
                if (text == args[i].toLowerCase()){
                    found = true;
                }
            }

            return found;
        },

        isSimple: function(type) {
            return !!this.simple[type];
        },

        isComplex: function(type) {
            return !!this.complex[type];
        },

        /**
         * Determines if the next part(s) of the given expression
         * are any of the given types.
         */
        isAny: function (expression, types) {
            var args = types.split(" | "),
                i, len, found = false;

            for (i=0,len=args.length; i < len && !found && expression.hasNext(); i++){
                found = this.isType(expression, args[i]);
            }

            return found;
        },

        /**
         * Determines if the next part(s) of the given expression
         * are one of a group.
         */
        isAnyOfGroup: function(expression, types) {
            var args = types.split(" || "),
                i, len, found = false;

            for (i=0,len=args.length; i < len && !found; i++){
                found = this.isType(expression, args[i]);
            }

            return found ? args[i-1] : false;
        },

        /**
         * Determines if the next part(s) of the given expression
         * are of a given type.
         */
        isType: function (expression, type) {
            var part = expression.peek(),
                result = false;

            if (type.charAt(0) != "<") {
                result = this.isLiteral(part, type);
                if (result) {
                    expression.next();
                }
            } else if (this.simple[type]) {
                result = this.simple[type](part);
                if (result) {
                    expression.next();
                }
            } else {
                result = this.complex[type](expression);
            }

            return result;
        },



        simple: {

            "<absolute-size>": function(part){
                return ValidationTypes.isLiteral(part, "xx-small | x-small | small | medium | large | x-large | xx-large");
            },

            "<attachment>": function(part){
                return ValidationTypes.isLiteral(part, "scroll | fixed | local");
            },

            "<attr>": function(part){
                return part.type == "function" && part.name == "attr";
            },

            "<bg-image>": function(part){
                return this["<image>"](part) || this["<gradient>"](part) ||  part == "none";
            },

            "<gradient>": function(part) {
                return part.type == "function" && /^(?:\-(?:ms|moz|o|webkit)\-)?(?:repeating\-)?(?:radial\-|linear\-)?gradient/i.test(part);
            },

            "<box>": function(part){
                return ValidationTypes.isLiteral(part, "padding-box | border-box | content-box");
            },

            "<content>": function(part){
                return part.type == "function" && part.name == "content";
            },

            "<relative-size>": function(part){
                return ValidationTypes.isLiteral(part, "smaller | larger");
            },

            //any identifier
            "<ident>": function(part){
                return part.type == "identifier";
            },

            "<length>": function(part){
                if (part.type == "function" && /^(?:\-(?:ms|moz|o|webkit)\-)?calc/i.test(part)){
                    return true;
                }else{
                    return part.type == "length" || part.type == "number" || part.type == "integer" || part == "0";
                }
            },

            "<color>": function(part){
                return part.type == "color" || part == "transparent";
            },

            "<number>": function(part){
                return part.type == "number" || this["<integer>"](part);
            },

            "<integer>": function(part){
                return part.type == "integer";
            },

            "<line>": function(part){
                return part.type == "integer";
            },

            "<angle>": function(part){
                return part.type == "angle";
            },

            "<uri>": function(part){
                return part.type == "uri";
            },

            "<image>": function(part){
                return this["<uri>"](part);
            },

            "<percentage>": function(part){
                return part.type == "percentage" || part == "0";
            },

            "<border-width>": function(part){
                return this["<length>"](part) || ValidationTypes.isLiteral(part, "thin | medium | thick");
            },

            "<border-style>": function(part){
                return ValidationTypes.isLiteral(part, "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset");
            },

            "<margin-width>": function(part){
                return this["<length>"](part) || this["<percentage>"](part) || ValidationTypes.isLiteral(part, "auto");
            },

            "<padding-width>": function(part){
                return this["<length>"](part) || this["<percentage>"](part);
            },

            "<shape>": function(part){
                return part.type == "function" && (part.name == "rect" || part.name == "inset-rect");
            },

            "<time>": function(part) {
                return part.type == "time";
            }
        },

        complex: {

            "<bg-position>": function(expression){
                var types   = this,
                    result  = false,
                    numeric = "<percentage> | <length>",
                    xDir    = "left | right",
                    yDir    = "top | bottom",
                    count = 0,
                    hasNext = function() {
                        return expression.hasNext() && expression.peek() != ",";
                    };

                while (expression.peek(count) && expression.peek(count) != ",") {
                    count++;
                }

    /*
    <position> = [
      [ left | center | right | top | bottom | <percentage> | <length> ]
    |
      [ left | center | right | <percentage> | <length> ]
      [ top | center | bottom | <percentage> | <length> ]
    |
      [ center | [ left | right ] [ <percentage> | <length> ]? ] &&
      [ center | [ top | bottom ] [ <percentage> | <length> ]? ]
    ]
    */

                if (count < 3) {
                    if (ValidationTypes.isAny(expression, xDir + " | center | " + numeric)) {
                            result = true;
                            ValidationTypes.isAny(expression, yDir + " | center | " + numeric);
                    } else if (ValidationTypes.isAny(expression, yDir)) {
                            result = true;
                            ValidationTypes.isAny(expression, xDir + " | center");
                    }
                } else {
                    if (ValidationTypes.isAny(expression, xDir)) {
                        if (ValidationTypes.isAny(expression, yDir)) {
                            result = true;
                            ValidationTypes.isAny(expression, numeric);
                        } else if (ValidationTypes.isAny(expression, numeric)) {
                            if (ValidationTypes.isAny(expression, yDir)) {
                                result = true;
                                ValidationTypes.isAny(expression, numeric);
                            } else if (ValidationTypes.isAny(expression, "center")) {
                                result = true;
                            }
                        }
                    } else if (ValidationTypes.isAny(expression, yDir)) {
                        if (ValidationTypes.isAny(expression, xDir)) {
                            result = true;
                            ValidationTypes.isAny(expression, numeric);
                        } else if (ValidationTypes.isAny(expression, numeric)) {
                            if (ValidationTypes.isAny(expression, xDir)) {
                                    result = true;
                                    ValidationTypes.isAny(expression, numeric);
                            } else if (ValidationTypes.isAny(expression, "center")) {
                                result = true;
                            }
                        }
                    } else if (ValidationTypes.isAny(expression, "center")) {
                        if (ValidationTypes.isAny(expression, xDir + " | " + yDir)) {
                            result = true;
                            ValidationTypes.isAny(expression, numeric);
                        }
                    }
                }

                return result;
            },

            "<bg-size>": function(expression){
                //<bg-size> = [ <length> | <percentage> | auto ]{1,2} | cover | contain
                var types   = this,
                    result  = false,
                    numeric = "<percentage> | <length> | auto",
                    part,
                    i, len;

                if (ValidationTypes.isAny(expression, "cover | contain")) {
                    result = true;
                } else if (ValidationTypes.isAny(expression, numeric)) {
                    result = true;
                    ValidationTypes.isAny(expression, numeric);
                }

                return result;
            },

            "<repeat-style>": function(expression){
                //repeat-x | repeat-y | [repeat | space | round | no-repeat]{1,2}
                var result  = false,
                    values  = "repeat | space | round | no-repeat",
                    part;

                if (expression.hasNext()){
                    part = expression.next();

                    if (ValidationTypes.isLiteral(part, "repeat-x | repeat-y")) {
                        result = true;
                    } else if (ValidationTypes.isLiteral(part, values)) {
                        result = true;

                        if (expression.hasNext() && ValidationTypes.isLiteral(expression.peek(), values)) {
                            expression.next();
                        }
                    }
                }

                return result;

            },

            "<shadow>": function(expression) {
                //inset? && [ <length>{2,4} && <color>? ]
                var result  = false,
                    count   = 0,
                    inset   = false,
                    color   = false,
                    part;

                if (expression.hasNext()) {

                    if (ValidationTypes.isAny(expression, "inset")){
                        inset = true;
                    }

                    if (ValidationTypes.isAny(expression, "<color>")) {
                        color = true;
                    }

                    while (ValidationTypes.isAny(expression, "<length>") && count < 4) {
                        count++;
                    }


                    if (expression.hasNext()) {
                        if (!color) {
                            ValidationTypes.isAny(expression, "<color>");
                        }

                        if (!inset) {
                            ValidationTypes.isAny(expression, "inset");
                        }

                    }

                    result = (count >= 2 && count <= 4);

                }

                return result;
            },

            "<x-one-radius>": function(expression) {
                //[ <length> | <percentage> ] [ <length> | <percentage> ]?
                var result  = false,
                    simple = "<length> | <percentage> | inherit";

                if (ValidationTypes.isAny(expression, simple)){
                    result = true;
                    ValidationTypes.isAny(expression, simple);
                }

                return result;
            }
        }
    };



    parserlib.css = {
        Colors              :Colors,
        Combinator          :Combinator,
        Parser              :Parser,
        PropertyName        :PropertyName,
        PropertyValue       :PropertyValue,
        PropertyValuePart   :PropertyValuePart,
        MediaFeature        :MediaFeature,
        MediaQuery          :MediaQuery,
        Selector            :Selector,
        SelectorPart        :SelectorPart,
        SelectorSubPart     :SelectorSubPart,
        Specificity         :Specificity,
        TokenStream         :TokenStream,
        Tokens              :Tokens,
        ValidationError     :ValidationError
    };

    return parserlib;
});
/*!
CSSLint
Copyright (c) 2013 Nicole Sullivan and Nicholas C. Zakas. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/* Build: v0.10.0 15-August-2013 01:07:22 */
define('skylark-utils-css/primitives/csslint',['./parser-lib'],function(parserlib){
            //create a copy of the array and use that so listeners can't chane
 

    /**
     * Main CSSLint object.
     * @class CSSLint
     * @static
     * @extends parserlib.util.EventTarget
     */
    /*global parserlib, Reporter*/
    var CSSLint = (function(){

        var rules           = [],
            formatters      = [],
            embeddedRuleset = /\/\*csslint([^\*]*)\*\//,
            api             = new parserlib.util.EventTarget();

        api.version = "0.10.0";

        //-------------------------------------------------------------------------
        // Rule Management
        //-------------------------------------------------------------------------

        /**
         * Adds a new rule to the engine.
         * @param {Object} rule The rule to add.
         * @method addRule
         */
        api.addRule = function(rule){
            rules.push(rule);
            rules[rule.id] = rule;
        };

        /**
         * Clears all rule from the engine.
         * @method clearRules
         */
        api.clearRules = function(){
            rules = [];
        };

        /**
         * Returns the rule objects.
         * @return An array of rule objects.
         * @method getRules
         */
        api.getRules = function(){
            return [].concat(rules).sort(function(a,b){
                return a.id > b.id ? 1 : 0;
            });
        };

        /**
         * Returns a ruleset configuration object with all current rules.
         * @return A ruleset object.
         * @method getRuleset
         */
        api.getRuleset = function() {
            var ruleset = {},
                i = 0,
                len = rules.length;

            while (i < len){
                ruleset[rules[i++].id] = 1;    //by default, everything is a warning
            }

            return ruleset;
        };

        /**
         * Returns a ruleset object based on embedded rules.
         * @param {String} text A string of css containing embedded rules.
         * @param {Object} ruleset A ruleset object to modify.
         * @return {Object} A ruleset object.
         * @method getEmbeddedRuleset
         */
        function applyEmbeddedRuleset(text, ruleset){
            var valueMap,
                embedded = text && text.match(embeddedRuleset),
                rules = embedded && embedded[1];

            if (rules) {
                valueMap = {
                    "true": 2,  // true is error
                    "": 1,      // blank is warning
                    "false": 0, // false is ignore

                    "2": 2,     // explicit error
                    "1": 1,     // explicit warning
                    "0": 0      // explicit ignore
                };

                rules.toLowerCase().split(",").forEach(function(rule){
                    var pair = rule.split(":"),
                        property = pair[0] || "",
                        value = pair[1] || "";

                    ruleset[property.trim()] = valueMap[value.trim()];
                });
            }

            return ruleset;
        }

        //-------------------------------------------------------------------------
        // Formatters
        //-------------------------------------------------------------------------

        /**
         * Adds a new formatter to the engine.
         * @param {Object} formatter The formatter to add.
         * @method addFormatter
         */
        api.addFormatter = function(formatter) {
            // formatters.push(formatter);
            formatters[formatter.id] = formatter;
        };

        /**
         * Retrieves a formatter for use.
         * @param {String} formatId The name of the format to retrieve.
         * @return {Object} The formatter or undefined.
         * @method getFormatter
         */
        api.getFormatter = function(formatId){
            return formatters[formatId];
        };

        /**
         * Formats the results in a particular format for a single file.
         * @param {Object} result The results returned from CSSLint.verify().
         * @param {String} filename The filename for which the results apply.
         * @param {String} formatId The name of the formatter to use.
         * @param {Object} options (Optional) for special output handling.
         * @return {String} A formatted string for the results.
         * @method format
         */
        api.format = function(results, filename, formatId, options) {
            var formatter = this.getFormatter(formatId),
                result = null;

            if (formatter){
                result = formatter.startFormat();
                result += formatter.formatResults(results, filename, options || {});
                result += formatter.endFormat();
            }

            return result;
        };

        /**
         * Indicates if the given format is supported.
         * @param {String} formatId The ID of the format to check.
         * @return {Boolean} True if the format exists, false if not.
         * @method hasFormat
         */
        api.hasFormat = function(formatId){
            return formatters.hasOwnProperty(formatId);
        };

        //-------------------------------------------------------------------------
        // Verification
        //-------------------------------------------------------------------------

        /**
         * Starts the verification process for the given CSS text.
         * @param {String} text The CSS text to verify.
         * @param {Object} ruleset (Optional) List of rules to apply. If null, then
         *      all rules are used. If a rule has a value of 1 then it's a warning,
         *      a value of 2 means it's an error.
         * @return {Object} Results of the verification.
         * @method verify
         */
        api.verify = function(text, ruleset){

            var i       = 0,
                len     = rules.length,
                reporter,
                lines,
                report,
                parser = new parserlib.css.Parser({ starHack: true, ieFilters: true,
                                                    underscoreHack: true, strict: false });

            // normalize line endings
            lines = text.replace(/\n\r?/g, "$split$").split('$split$');

            if (!ruleset){
                ruleset = this.getRuleset();
            }

            if (embeddedRuleset.test(text)){
                ruleset = applyEmbeddedRuleset(text, ruleset);
            }

            reporter = new Reporter(lines, ruleset);

            ruleset.errors = 2;       //always report parsing errors as errors
            for (i in ruleset){
                if(ruleset.hasOwnProperty(i) && ruleset[i]){
                    if (rules[i]){
                        rules[i].init(parser, reporter);
                    }
                }
            }


            //capture most horrible error type
            try {
                parser.parse(text);
            } catch (ex) {
                reporter.error("Fatal error, cannot continue: " + ex.message, ex.line, ex.col, {});
            }

            report = {
                messages    : reporter.messages,
                stats       : reporter.stats,
                ruleset     : reporter.ruleset
            };

            //sort by line numbers, rollups at the bottom
            report.messages.sort(function (a, b){
                if (a.rollup && !b.rollup){
                    return 1;
                } else if (!a.rollup && b.rollup){
                    return -1;
                } else {
                    return a.line - b.line;
                }
            });

            return report;
        };

        //-------------------------------------------------------------------------
        // Publish the API
        //-------------------------------------------------------------------------

        return api;

    })();

    /*global CSSLint*/
    /**
     * An instance of Report is used to report results of the
     * verification back to the main API.
     * @class Reporter
     * @constructor
     * @param {String[]} lines The text lines of the source.
     * @param {Object} ruleset The set of rules to work with, including if
     *      they are errors or warnings.
     */
    function Reporter(lines, ruleset){

        /**
         * List of messages being reported.
         * @property messages
         * @type String[]
         */
        this.messages = [];

        /**
         * List of statistics being reported.
         * @property stats
         * @type String[]
         */
        this.stats = [];

        /**
         * Lines of code being reported on. Used to provide contextual information
         * for messages.
         * @property lines
         * @type String[]
         */
        this.lines = lines;

        /**
         * Information about the rules. Used to determine whether an issue is an
         * error or warning.
         * @property ruleset
         * @type Object
         */
        this.ruleset = ruleset;
    }

    Reporter.prototype = {

        //restore constructor
        constructor: Reporter,

        /**
         * Report an error.
         * @param {String} message The message to store.
         * @param {int} line The line number.
         * @param {int} col The column number.
         * @param {Object} rule The rule this message relates to.
         * @method error
         */
        error: function(message, line, col, rule){
            this.messages.push({
                type    : "error",
                line    : line,
                col     : col,
                message : message,
                evidence: this.lines[line-1],
                rule    : rule || {}
            });
        },

        /**
         * Report an warning.
         * @param {String} message The message to store.
         * @param {int} line The line number.
         * @param {int} col The column number.
         * @param {Object} rule The rule this message relates to.
         * @method warn
         * @deprecated Use report instead.
         */
        warn: function(message, line, col, rule){
            this.report(message, line, col, rule);
        },

        /**
         * Report an issue.
         * @param {String} message The message to store.
         * @param {int} line The line number.
         * @param {int} col The column number.
         * @param {Object} rule The rule this message relates to.
         * @method report
         */
        report: function(message, line, col, rule){
            this.messages.push({
                type    : this.ruleset[rule.id] == 2 ? "error" : "warning",
                line    : line,
                col     : col,
                message : message,
                evidence: this.lines[line-1],
                rule    : rule
            });
        },

        /**
         * Report some informational text.
         * @param {String} message The message to store.
         * @param {int} line The line number.
         * @param {int} col The column number.
         * @param {Object} rule The rule this message relates to.
         * @method info
         */
        info: function(message, line, col, rule){
            this.messages.push({
                type    : "info",
                line    : line,
                col     : col,
                message : message,
                evidence: this.lines[line-1],
                rule    : rule
            });
        },

        /**
         * Report some rollup error information.
         * @param {String} message The message to store.
         * @param {Object} rule The rule this message relates to.
         * @method rollupError
         */
        rollupError: function(message, rule){
            this.messages.push({
                type    : "error",
                rollup  : true,
                message : message,
                rule    : rule
            });
        },

        /**
         * Report some rollup warning information.
         * @param {String} message The message to store.
         * @param {Object} rule The rule this message relates to.
         * @method rollupWarn
         */
        rollupWarn: function(message, rule){
            this.messages.push({
                type    : "warning",
                rollup  : true,
                message : message,
                rule    : rule
            });
        },

        /**
         * Report a statistic.
         * @param {String} name The name of the stat to store.
         * @param {Variant} value The value of the stat.
         * @method stat
         */
        stat: function(name, value){
            this.stats[name] = value;
        }
    };

    //expose for testing purposes
    CSSLint._Reporter = Reporter;

    /*global CSSLint*/

    /*
     * Utility functions that make life easier.
     */
    CSSLint.Util = {
        /*
         * Adds all properties from supplier onto receiver,
         * overwriting if the same name already exists on
         * reciever.
         * @param {Object} The object to receive the properties.
         * @param {Object} The object to provide the properties.
         * @return {Object} The receiver
         */
        mix: function(receiver, supplier){
            var prop;

            for (prop in supplier){
                if (supplier.hasOwnProperty(prop)){
                    receiver[prop] = supplier[prop];
                }
            }

            return prop;
        },

        /*
         * Polyfill for array indexOf() method.
         * @param {Array} values The array to search.
         * @param {Variant} value The value to search for.
         * @return {int} The index of the value if found, -1 if not.
         */
        indexOf: function(values, value){
            if (values.indexOf){
                return values.indexOf(value);
            } else {
                for (var i=0, len=values.length; i < len; i++){
                    if (values[i] === value){
                        return i;
                    }
                }
                return -1;
            }
        },

        /*
         * Polyfill for array forEach() method.
         * @param {Array} values The array to operate on.
         * @param {Function} func The function to call on each item.
         * @return {void}
         */
        forEach: function(values, func) {
            if (values.forEach){
                return values.forEach(func);
            } else {
                for (var i=0, len=values.length; i < len; i++){
                    func(values[i], i, values);
                }
            }
        }
    };
    /*global CSSLint*/
    /*
     * Rule: Don't use adjoining classes (.foo.bar).
     */
    CSSLint.addRule({

        //rule information
        id: "adjoining-classes",
        name: "Disallow adjoining classes",
        desc: "Don't use adjoining classes.",
        browsers: "IE6",

        //initialization
        init: function(parser, reporter){
            var rule = this;
            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    classCount,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];
                    for (j=0; j < selector.parts.length; j++){
                        part = selector.parts[j];
                        if (part.type == parser.SELECTOR_PART_TYPE){
                            classCount = 0;
                            for (k=0; k < part.modifiers.length; k++){
                                modifier = part.modifiers[k];
                                if (modifier.type == "class"){
                                    classCount++;
                                }
                                if (classCount > 1){
                                    reporter.report("Don't use adjoining classes.", part.line, part.col, rule);
                                }
                            }
                        }
                    }
                }
            });
        }

    });
    /*global CSSLint*/

    /*
     * Rule: Don't use width or height when using padding or border.
     */
    CSSLint.addRule({

        //rule information
        id: "box-model",
        name: "Beware of broken box size",
        desc: "Don't use width or height when using padding or border.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                widthProperties = {
                    border: 1,
                    "border-left": 1,
                    "border-right": 1,
                    padding: 1,
                    "padding-left": 1,
                    "padding-right": 1
                },
                heightProperties = {
                    border: 1,
                    "border-bottom": 1,
                    "border-top": 1,
                    padding: 1,
                    "padding-bottom": 1,
                    "padding-top": 1
                },
                properties,
                boxSizing = false;

            function startRule(){
                properties = {};
                boxSizing = false;
            }

            function endRule(){
                var prop, value;

                if (!boxSizing) {
                    if (properties.height){
                        for (prop in heightProperties){
                            if (heightProperties.hasOwnProperty(prop) && properties[prop]){
                                value = properties[prop].value;
                                //special case for padding
                                if (!(prop == "padding" && value.parts.length === 2 && value.parts[0].value === 0)){
                                    reporter.report("Using height with " + prop + " can sometimes make elements larger than you expect.", properties[prop].line, properties[prop].col, rule);
                                }
                            }
                        }
                    }

                    if (properties.width){
                        for (prop in widthProperties){
                            if (widthProperties.hasOwnProperty(prop) && properties[prop]){
                                value = properties[prop].value;

                                if (!(prop == "padding" && value.parts.length === 2 && value.parts[1].value === 0)){
                                    reporter.report("Using width with " + prop + " can sometimes make elements larger than you expect.", properties[prop].line, properties[prop].col, rule);
                                }
                            }
                        }
                    }
                }
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startpage", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startkeyframerule", startRule);

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase();

                if (heightProperties[name] || widthProperties[name]){
                    if (!/^0\S*$/.test(event.value) && !(name == "border" && event.value == "none")){
                        properties[name] = { line: event.property.line, col: event.property.col, value: event.value };
                    }
                } else {
                    if (/^(width|height)/i.test(name) && /^(length|percentage)/.test(event.value.parts[0].type)){
                        properties[name] = 1;
                    } else if (name == "box-sizing") {
                        boxSizing = true;
                    }
                }

            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);
            parser.addListener("endpage", endRule);
            parser.addListener("endpagemargin", endRule);
            parser.addListener("endkeyframerule", endRule);
        }

    });
    /*global CSSLint*/

    /*
     * Rule: box-sizing doesn't work in IE6 and IE7.
     */
    CSSLint.addRule({

        //rule information
        id: "box-sizing",
        name: "Disallow use of box-sizing",
        desc: "The box-sizing properties isn't supported in IE6 and IE7.",
        browsers: "IE6, IE7",
        tags: ["Compatibility"],

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase();

                if (name == "box-sizing"){
                    reporter.report("The box-sizing property isn't supported in IE6 and IE7.", event.line, event.col, rule);
                }
            });
        }

    });
    /*
     * Rule: Use the bulletproof @font-face syntax to avoid 404's in old IE
     * (http://www.fontspring.com/blog/the-new-bulletproof-font-face-syntax)
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "bulletproof-font-face",
        name: "Use the bulletproof @font-face syntax",
        desc: "Use the bulletproof @font-face syntax to avoid 404's in old IE (http://www.fontspring.com/blog/the-new-bulletproof-font-face-syntax).",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0,
                fontFaceRule = false,
                firstSrc     = true,
                ruleFailed    = false,
                line, col;

            // Mark the start of a @font-face declaration so we only test properties inside it
            parser.addListener("startfontface", function(event){
                fontFaceRule = true;
            });

            parser.addListener("property", function(event){
                // If we aren't inside an @font-face declaration then just return
                if (!fontFaceRule) {
                    return;
                }

                var propertyName = event.property.toString().toLowerCase(),
                    value        = event.value.toString();

                // Set the line and col numbers for use in the endfontface listener
                line = event.line;
                col  = event.col;

                // This is the property that we care about, we can ignore the rest
                if (propertyName === 'src') {
                    var regex = /^\s?url\(['"].+\.eot\?.*['"]\)\s*format\(['"]embedded-opentype['"]\).*$/i;

                    // We need to handle the advanced syntax with two src properties
                    if (!value.match(regex) && firstSrc) {
                        ruleFailed = true;
                        firstSrc = false;
                    } else if (value.match(regex) && !firstSrc) {
                        ruleFailed = false;
                    }
                }


            });

            // Back to normal rules that we don't need to test
            parser.addListener("endfontface", function(event){
                fontFaceRule = false;

                if (ruleFailed) {
                    reporter.report("@font-face declaration doesn't follow the fontspring bulletproof syntax.", line, col, rule);
                }
            });
        }
    });
    /*
     * Rule: Include all compatible vendor prefixes to reach a wider
     * range of users.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "compatible-vendor-prefixes",
        name: "Require compatible vendor prefixes",
        desc: "Include all compatible vendor prefixes to reach a wider range of users.",
        browsers: "All",

        //initialization
        init: function (parser, reporter) {
            var rule = this,
                compatiblePrefixes,
                properties,
                prop,
                variations,
                prefixed,
                i,
                len,
                inKeyFrame = false,
                arrayPush = Array.prototype.push,
                applyTo = [];

            // See http://peter.sh/experiments/vendor-prefixed-css-property-overview/ for details
            compatiblePrefixes = {
                "animation"                  : "webkit moz",
                "animation-delay"            : "webkit moz",
                "animation-direction"        : "webkit moz",
                "animation-duration"         : "webkit moz",
                "animation-fill-mode"        : "webkit moz",
                "animation-iteration-count"  : "webkit moz",
                "animation-name"             : "webkit moz",
                "animation-play-state"       : "webkit moz",
                "animation-timing-function"  : "webkit moz",
                "appearance"                 : "webkit moz",
                "border-end"                 : "webkit moz",
                "border-end-color"           : "webkit moz",
                "border-end-style"           : "webkit moz",
                "border-end-width"           : "webkit moz",
                "border-image"               : "webkit moz o",
                "border-radius"              : "webkit",
                "border-start"               : "webkit moz",
                "border-start-color"         : "webkit moz",
                "border-start-style"         : "webkit moz",
                "border-start-width"         : "webkit moz",
                "box-align"                  : "webkit moz ms",
                "box-direction"              : "webkit moz ms",
                "box-flex"                   : "webkit moz ms",
                "box-lines"                  : "webkit ms",
                "box-ordinal-group"          : "webkit moz ms",
                "box-orient"                 : "webkit moz ms",
                "box-pack"                   : "webkit moz ms",
                "box-sizing"                 : "webkit moz",
                "box-shadow"                 : "webkit moz",
                "column-count"               : "webkit moz ms",
                "column-gap"                 : "webkit moz ms",
                "column-rule"                : "webkit moz ms",
                "column-rule-color"          : "webkit moz ms",
                "column-rule-style"          : "webkit moz ms",
                "column-rule-width"          : "webkit moz ms",
                "column-width"               : "webkit moz ms",
                "hyphens"                    : "epub moz",
                "line-break"                 : "webkit ms",
                "margin-end"                 : "webkit moz",
                "margin-start"               : "webkit moz",
                "marquee-speed"              : "webkit wap",
                "marquee-style"              : "webkit wap",
                "padding-end"                : "webkit moz",
                "padding-start"              : "webkit moz",
                "tab-size"                   : "moz o",
                "text-size-adjust"           : "webkit ms",
                "transform"                  : "webkit moz ms o",
                "transform-origin"           : "webkit moz ms o",
                "transition"                 : "webkit moz o",
                "transition-delay"           : "webkit moz o",
                "transition-duration"        : "webkit moz o",
                "transition-property"        : "webkit moz o",
                "transition-timing-function" : "webkit moz o",
                "user-modify"                : "webkit moz",
                "user-select"                : "webkit moz ms",
                "word-break"                 : "epub ms",
                "writing-mode"               : "epub ms"
            };


            for (prop in compatiblePrefixes) {
                if (compatiblePrefixes.hasOwnProperty(prop)) {
                    variations = [];
                    prefixed = compatiblePrefixes[prop].split(' ');
                    for (i = 0, len = prefixed.length; i < len; i++) {
                        variations.push('-' + prefixed[i] + '-' + prop);
                    }
                    compatiblePrefixes[prop] = variations;
                    arrayPush.apply(applyTo, variations);
                }
            }

            parser.addListener("startrule", function () {
                properties = [];
            });

            parser.addListener("startkeyframes", function (event) {
                inKeyFrame = event.prefix || true;
            });

            parser.addListener("endkeyframes", function (event) {
                inKeyFrame = false;
            });

            parser.addListener("property", function (event) {
                var name = event.property;
                if (CSSLint.Util.indexOf(applyTo, name.text) > -1) {

                    // e.g., -moz-transform is okay to be alone in @-moz-keyframes
                    if (!inKeyFrame || typeof inKeyFrame != "string" ||
                            name.text.indexOf("-" + inKeyFrame + "-") !== 0) {
                        properties.push(name);
                    }
                }
            });

            parser.addListener("endrule", function (event) {
                if (!properties.length) {
                    return;
                }

                var propertyGroups = {},
                    i,
                    len,
                    name,
                    prop,
                    variations,
                    value,
                    full,
                    actual,
                    item,
                    propertiesSpecified;

                for (i = 0, len = properties.length; i < len; i++) {
                    name = properties[i];

                    for (prop in compatiblePrefixes) {
                        if (compatiblePrefixes.hasOwnProperty(prop)) {
                            variations = compatiblePrefixes[prop];
                            if (CSSLint.Util.indexOf(variations, name.text) > -1) {
                                if (!propertyGroups[prop]) {
                                    propertyGroups[prop] = {
                                        full : variations.slice(0),
                                        actual : [],
                                        actualNodes: []
                                    };
                                }
                                if (CSSLint.Util.indexOf(propertyGroups[prop].actual, name.text) === -1) {
                                    propertyGroups[prop].actual.push(name.text);
                                    propertyGroups[prop].actualNodes.push(name);
                                }
                            }
                        }
                    }
                }

                for (prop in propertyGroups) {
                    if (propertyGroups.hasOwnProperty(prop)) {
                        value = propertyGroups[prop];
                        full = value.full;
                        actual = value.actual;

                        if (full.length > actual.length) {
                            for (i = 0, len = full.length; i < len; i++) {
                                item = full[i];
                                if (CSSLint.Util.indexOf(actual, item) === -1) {
                                    propertiesSpecified = (actual.length === 1) ? actual[0] : (actual.length == 2) ? actual.join(" and ") : actual.join(", ");
                                    reporter.report("The property " + item + " is compatible with " + propertiesSpecified + " and should be included as well.", value.actualNodes[0].line, value.actualNodes[0].col, rule);
                                }
                            }

                        }
                    }
                }
            });
        }
    });
    /*
     * Rule: Certain properties don't play well with certain display values.
     * - float should not be used with inline-block
     * - height, width, margin-top, margin-bottom, float should not be used with inline
     * - vertical-align should not be used with block
     * - margin, float should not be used with table-*
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "display-property-grouping",
        name: "Require properties appropriate for display",
        desc: "Certain properties shouldn't be used with certain display property values.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            var propertiesToCheck = {
                    display: 1,
                    "float": "none",
                    height: 1,
                    width: 1,
                    margin: 1,
                    "margin-left": 1,
                    "margin-right": 1,
                    "margin-bottom": 1,
                    "margin-top": 1,
                    padding: 1,
                    "padding-left": 1,
                    "padding-right": 1,
                    "padding-bottom": 1,
                    "padding-top": 1,
                    "vertical-align": 1
                },
                properties;

            function reportProperty(name, display, msg){
                if (properties[name]){
                    if (typeof propertiesToCheck[name] != "string" || properties[name].value.toLowerCase() != propertiesToCheck[name]){
                        reporter.report(msg || name + " can't be used with display: " + display + ".", properties[name].line, properties[name].col, rule);
                    }
                }
            }

            function startRule(){
                properties = {};
            }

            function endRule(){

                var display = properties.display ? properties.display.value : null;
                if (display){
                    switch(display){

                        case "inline":
                            //height, width, margin-top, margin-bottom, float should not be used with inline
                            reportProperty("height", display);
                            reportProperty("width", display);
                            reportProperty("margin", display);
                            reportProperty("margin-top", display);
                            reportProperty("margin-bottom", display);
                            reportProperty("float", display, "display:inline has no effect on floated elements (but may be used to fix the IE6 double-margin bug).");
                            break;

                        case "block":
                            //vertical-align should not be used with block
                            reportProperty("vertical-align", display);
                            break;

                        case "inline-block":
                            //float should not be used with inline-block
                            reportProperty("float", display);
                            break;

                        default:
                            //margin, float should not be used with table
                            if (display.indexOf("table-") === 0){
                                reportProperty("margin", display);
                                reportProperty("margin-left", display);
                                reportProperty("margin-right", display);
                                reportProperty("margin-top", display);
                                reportProperty("margin-bottom", display);
                                reportProperty("float", display);
                            }

                            //otherwise do nothing
                    }
                }

            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startkeyframerule", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startpage", startRule);

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase();

                if (propertiesToCheck[name]){
                    properties[name] = { value: event.value.text, line: event.property.line, col: event.property.col };
                }
            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);
            parser.addListener("endkeyframerule", endRule);
            parser.addListener("endpagemargin", endRule);
            parser.addListener("endpage", endRule);

        }

    });
    /*
     * Rule: Disallow duplicate background-images (using url).
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "duplicate-background-images",
        name: "Disallow duplicate background images",
        desc: "Every background-image should be unique. Use a common class for e.g. sprites.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                stack = {};

            parser.addListener("property", function(event){
                var name = event.property.text,
                    value = event.value,
                    i, len;

                if (name.match(/background/i)) {
                    for (i=0, len=value.parts.length; i < len; i++) {
                        if (value.parts[i].type == 'uri') {
                            if (typeof stack[value.parts[i].uri] === 'undefined') {
                                stack[value.parts[i].uri] = event;
                            }
                            else {
                                reporter.report("Background image '" + value.parts[i].uri + "' was used multiple times, first declared at line " + stack[value.parts[i].uri].line + ", col " + stack[value.parts[i].uri].col + ".", event.line, event.col, rule);
                            }
                        }
                    }
                }
            });
        }
    });
    /*
     * Rule: Duplicate properties must appear one after the other. If an already-defined
     * property appears somewhere else in the rule, then it's likely an error.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "duplicate-properties",
        name: "Disallow duplicate properties",
        desc: "Duplicate properties must appear one after the other.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                properties,
                lastProperty;

            function startRule(event){
                properties = {};
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startpage", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startkeyframerule", startRule);

            parser.addListener("property", function(event){
                var property = event.property,
                    name = property.text.toLowerCase();

                if (properties[name] && (lastProperty != name || properties[name] == event.value.text)){
                    reporter.report("Duplicate property '" + event.property + "' found.", event.line, event.col, rule);
                }

                properties[name] = event.value.text;
                lastProperty = name;

            });


        }

    });
    /*
     * Rule: Style rules without any properties defined should be removed.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "empty-rules",
        name: "Disallow empty rules",
        desc: "Rules without any properties specified should be removed.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0;

            parser.addListener("startrule", function(){
                count=0;
            });

            parser.addListener("property", function(){
                count++;
            });

            parser.addListener("endrule", function(event){
                var selectors = event.selectors;
                if (count === 0){
                    reporter.report("Rule is empty.", selectors[0].line, selectors[0].col, rule);
                }
            });
        }

    });
    /*
     * Rule: There should be no syntax errors. (Duh.)
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "errors",
        name: "Parsing Errors",
        desc: "This rule looks for recoverable syntax errors.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("error", function(event){
                reporter.error(event.message, event.line, event.col, rule);
            });

        }

    });

    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "fallback-colors",
        name: "Require fallback colors",
        desc: "For older browsers that don't support RGBA, HSL, or HSLA, provide a fallback color.",
        browsers: "IE6,IE7,IE8",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                lastProperty,
                propertiesToCheck = {
                    color: 1,
                    background: 1,
                    "border-color": 1,
                    "border-top-color": 1,
                    "border-right-color": 1,
                    "border-bottom-color": 1,
                    "border-left-color": 1,
                    border: 1,
                    "border-top": 1,
                    "border-right": 1,
                    "border-bottom": 1,
                    "border-left": 1,
                    "background-color": 1
                },
                properties;

            function startRule(event){
                properties = {};
                lastProperty = null;
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startpage", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startkeyframerule", startRule);

            parser.addListener("property", function(event){
                var property = event.property,
                    name = property.text.toLowerCase(),
                    parts = event.value.parts,
                    i = 0,
                    colorType = "",
                    len = parts.length;

                if(propertiesToCheck[name]){
                    while(i < len){
                        if (parts[i].type == "color"){
                            if ("alpha" in parts[i] || "hue" in parts[i]){

                                if (/([^\)]+)\(/.test(parts[i])){
                                    colorType = RegExp.$1.toUpperCase();
                                }

                                if (!lastProperty || (lastProperty.property.text.toLowerCase() != name || lastProperty.colorType != "compat")){
                                    reporter.report("Fallback " + name + " (hex or RGB) should precede " + colorType + " " + name + ".", event.line, event.col, rule);
                                }
                            } else {
                                event.colorType = "compat";
                            }
                        }

                        i++;
                    }
                }

                lastProperty = event;
            });

        }

    });
    /*
     * Rule: You shouldn't use more than 10 floats. If you do, there's probably
     * room for some abstraction.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "floats",
        name: "Disallow too many floats",
        desc: "This rule tests if the float property is used too many times",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;
            var count = 0;

            //count how many times "float" is used
            parser.addListener("property", function(event){
                if (event.property.text.toLowerCase() == "float" &&
                        event.value.text.toLowerCase() != "none"){
                    count++;
                }
            });

            //report the results
            parser.addListener("endstylesheet", function(){
                reporter.stat("floats", count);
                if (count >= 10){
                    reporter.rollupWarn("Too many floats (" + count + "), you're probably using them for layout. Consider using a grid system instead.", rule);
                }
            });
        }

    });
    /*
     * Rule: Avoid too many @font-face declarations in the same stylesheet.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "font-faces",
        name: "Don't use too many web fonts",
        desc: "Too many different web fonts in the same stylesheet.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0;


            parser.addListener("startfontface", function(){
                count++;
            });

            parser.addListener("endstylesheet", function(){
                if (count > 5){
                    reporter.rollupWarn("Too many @font-face declarations (" + count + ").", rule);
                }
            });
        }

    });
    /*
     * Rule: You shouldn't need more than 9 font-size declarations.
     */

    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "font-sizes",
        name: "Disallow too many font sizes",
        desc: "Checks the number of font-size declarations.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0;

            //check for use of "font-size"
            parser.addListener("property", function(event){
                if (event.property == "font-size"){
                    count++;
                }
            });

            //report the results
            parser.addListener("endstylesheet", function(){
                reporter.stat("font-sizes", count);
                if (count >= 10){
                    reporter.rollupWarn("Too many font-size declarations (" + count + "), abstraction needed.", rule);
                }
            });
        }

    });
    /*
     * Rule: When using a vendor-prefixed gradient, make sure to use them all.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "gradients",
        name: "Require all gradient definitions",
        desc: "When using a vendor-prefixed gradient, make sure to use them all.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                gradients;

            parser.addListener("startrule", function(){
                gradients = {
                    moz: 0,
                    webkit: 0,
                    oldWebkit: 0,
                    o: 0
                };
            });

            parser.addListener("property", function(event){

                if (/\-(moz|o|webkit)(?:\-(?:linear|radial))\-gradient/i.test(event.value)){
                    gradients[RegExp.$1] = 1;
                } else if (/\-webkit\-gradient/i.test(event.value)){
                    gradients.oldWebkit = 1;
                }

            });

            parser.addListener("endrule", function(event){
                var missing = [];

                if (!gradients.moz){
                    missing.push("Firefox 3.6+");
                }

                if (!gradients.webkit){
                    missing.push("Webkit (Safari 5+, Chrome)");
                }

                if (!gradients.oldWebkit){
                    missing.push("Old Webkit (Safari 4+, Chrome)");
                }

                if (!gradients.o){
                    missing.push("Opera 11.1+");
                }

                if (missing.length && missing.length < 4){
                    reporter.report("Missing vendor-prefixed CSS gradients for " + missing.join(", ") + ".", event.selectors[0].line, event.selectors[0].col, rule);
                }

            });

        }

    });

    /*
     * Rule: Don't use IDs for selectors.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "ids",
        name: "Disallow IDs in selectors",
        desc: "Selectors should not contain IDs.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;
            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    idCount,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];
                    idCount = 0;

                    for (j=0; j < selector.parts.length; j++){
                        part = selector.parts[j];
                        if (part.type == parser.SELECTOR_PART_TYPE){
                            for (k=0; k < part.modifiers.length; k++){
                                modifier = part.modifiers[k];
                                if (modifier.type == "id"){
                                    idCount++;
                                }
                            }
                        }
                    }

                    if (idCount == 1){
                        reporter.report("Don't use IDs in selectors.", selector.line, selector.col, rule);
                    } else if (idCount > 1){
                        reporter.report(idCount + " IDs in the selector, really?", selector.line, selector.col, rule);
                    }
                }

            });
        }

    });
    /*
     * Rule: Don't use @import, use <link> instead.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "import",
        name: "Disallow @import",
        desc: "Don't use @import, use <link> instead.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("import", function(event){
                reporter.report("@import prevents parallel downloads, use <link> instead.", event.line, event.col, rule);
            });

        }

    });
    /*
     * Rule: Make sure !important is not overused, this could lead to specificity
     * war. Display a warning on !important declarations, an error if it's
     * used more at least 10 times.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "important",
        name: "Disallow !important",
        desc: "Be careful when using !important declaration",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0;

            //warn that important is used and increment the declaration counter
            parser.addListener("property", function(event){
                if (event.important === true){
                    count++;
                    reporter.report("Use of !important", event.line, event.col, rule);
                }
            });

            //if there are more than 10, show an error
            parser.addListener("endstylesheet", function(){
                reporter.stat("important", count);
                if (count >= 10){
                    reporter.rollupWarn("Too many !important declarations (" + count + "), try to use less than 10 to avoid specificity issues.", rule);
                }
            });
        }

    });
    /*
     * Rule: Properties should be known (listed in CSS3 specification) or
     * be a vendor-prefixed property.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "known-properties",
        name: "Require use of known properties",
        desc: "Properties should be known (listed in CSS3 specification) or be a vendor-prefixed property.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase();

                // the check is handled entirely by the parser-lib (https://github.com/nzakas/parser-lib)
                if (event.invalid) {
                    reporter.report(event.invalid.message, event.line, event.col, rule);
                }

            });
        }

    });
    /*
     * Rule: outline: none or outline: 0 should only be used in a :focus rule
     *       and only if there are other properties in the same rule.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "outline-none",
        name: "Disallow outline: none",
        desc: "Use of outline: none or outline: 0 should be limited to :focus rules.",
        browsers: "All",
        tags: ["Accessibility"],

        //initialization
        init: function(parser, reporter){
            var rule = this,
                lastRule;

            function startRule(event){
                if (event.selectors){
                    lastRule = {
                        line: event.line,
                        col: event.col,
                        selectors: event.selectors,
                        propCount: 0,
                        outline: false
                    };
                } else {
                    lastRule = null;
                }
            }

            function endRule(event){
                if (lastRule){
                    if (lastRule.outline){
                        if (lastRule.selectors.toString().toLowerCase().indexOf(":focus") == -1){
                            reporter.report("Outlines should only be modified using :focus.", lastRule.line, lastRule.col, rule);
                        } else if (lastRule.propCount == 1) {
                            reporter.report("Outlines shouldn't be hidden unless other visual changes are made.", lastRule.line, lastRule.col, rule);
                        }
                    }
                }
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startpage", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startkeyframerule", startRule);

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase(),
                    value = event.value;

                if (lastRule){
                    lastRule.propCount++;
                    if (name == "outline" && (value == "none" || value == "0")){
                        lastRule.outline = true;
                    }
                }

            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);
            parser.addListener("endpage", endRule);
            parser.addListener("endpagemargin", endRule);
            parser.addListener("endkeyframerule", endRule);

        }

    });
    /*
     * Rule: Don't use classes or IDs with elements (a.foo or a#foo).
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "overqualified-elements",
        name: "Disallow overqualified elements",
        desc: "Don't use classes or IDs with elements (a.foo or a#foo).",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                classes = {};

            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];

                    for (j=0; j < selector.parts.length; j++){
                        part = selector.parts[j];
                        if (part.type == parser.SELECTOR_PART_TYPE){
                            for (k=0; k < part.modifiers.length; k++){
                                modifier = part.modifiers[k];
                                if (part.elementName && modifier.type == "id"){
                                    reporter.report("Element (" + part + ") is overqualified, just use " + modifier + " without element name.", part.line, part.col, rule);
                                } else if (modifier.type == "class"){

                                    if (!classes[modifier]){
                                        classes[modifier] = [];
                                    }
                                    classes[modifier].push({ modifier: modifier, part: part });
                                }
                            }
                        }
                    }
                }
            });

            parser.addListener("endstylesheet", function(){

                var prop;
                for (prop in classes){
                    if (classes.hasOwnProperty(prop)){

                        //one use means that this is overqualified
                        if (classes[prop].length == 1 && classes[prop][0].part.elementName){
                            reporter.report("Element (" + classes[prop][0].part + ") is overqualified, just use " + classes[prop][0].modifier + " without element name.", classes[prop][0].part.line, classes[prop][0].part.col, rule);
                        }
                    }
                }
            });
        }

    });
    /*
     * Rule: Headings (h1-h6) should not be qualified (namespaced).
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "qualified-headings",
        name: "Disallow qualified headings",
        desc: "Headings should not be qualified (namespaced).",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    i, j;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];

                    for (j=0; j < selector.parts.length; j++){
                        part = selector.parts[j];
                        if (part.type == parser.SELECTOR_PART_TYPE){
                            if (part.elementName && /h[1-6]/.test(part.elementName.toString()) && j > 0){
                                reporter.report("Heading (" + part.elementName + ") should not be qualified.", part.line, part.col, rule);
                            }
                        }
                    }
                }
            });
        }

    });
    /*
     * Rule: Selectors that look like regular expressions are slow and should be avoided.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "regex-selectors",
        name: "Disallow selectors that look like regexs",
        desc: "Selectors that look like regular expressions are slow and should be avoided.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];
                    for (j=0; j < selector.parts.length; j++){
                        part = selector.parts[j];
                        if (part.type == parser.SELECTOR_PART_TYPE){
                            for (k=0; k < part.modifiers.length; k++){
                                modifier = part.modifiers[k];
                                if (modifier.type == "attribute"){
                                    if (/([\~\|\^\$\*]=)/.test(modifier)){
                                        reporter.report("Attribute selectors with " + RegExp.$1 + " are slow!", modifier.line, modifier.col, rule);
                                    }
                                }

                            }
                        }
                    }
                }
            });
        }

    });
    /*
     * Rule: Total number of rules should not exceed x.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "rules-count",
        name: "Rules Count",
        desc: "Track how many rules there are.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                count = 0;

            //count each rule
            parser.addListener("startrule", function(){
                count++;
            });

            parser.addListener("endstylesheet", function(){
                reporter.stat("rule-count", count);
            });
        }

    });
    /*
     * Rule: Warn people with approaching the IE 4095 limit
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "selector-max-approaching",
        name: "Warn when approaching the 4095 selector limit for IE",
        desc: "Will warn when selector count is >= 3800 selectors.",
        browsers: "IE",

        //initialization
        init: function(parser, reporter) {
            var rule = this, count = 0;

            parser.addListener('startrule', function(event) {
                count += event.selectors.length;
            });

            parser.addListener("endstylesheet", function() {
                if (count >= 3800) {
                    reporter.report("You have " + count + " selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",0,0,rule);
                }
            });
        }

    });

    /*
     * Rule: Warn people past the IE 4095 limit
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "selector-max",
        name: "Error when past the 4095 selector limit for IE",
        desc: "Will error when selector count is > 4095.",
        browsers: "IE",

        //initialization
        init: function(parser, reporter){
            var rule = this, count = 0;

            parser.addListener('startrule',function(event) {
                count += event.selectors.length;
            });

            parser.addListener("endstylesheet", function() {
                if (count > 4095) {
                    reporter.report("You have " + count + " selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",0,0,rule);
                }
            });
        }

    });
    /*
     * Rule: Use shorthand properties where possible.
     *
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "shorthand",
        name: "Require shorthand properties",
        desc: "Use shorthand properties where possible.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                prop, i, len,
                propertiesToCheck = {},
                properties,
                mapping = {
                    "margin": [
                        "margin-top",
                        "margin-bottom",
                        "margin-left",
                        "margin-right"
                    ],
                    "padding": [
                        "padding-top",
                        "padding-bottom",
                        "padding-left",
                        "padding-right"
                    ]
                };

            //initialize propertiesToCheck
            for (prop in mapping){
                if (mapping.hasOwnProperty(prop)){
                    for (i=0, len=mapping[prop].length; i < len; i++){
                        propertiesToCheck[mapping[prop][i]] = prop;
                    }
                }
            }

            function startRule(event){
                properties = {};
            }

            //event handler for end of rules
            function endRule(event){

                var prop, i, len, total;

                //check which properties this rule has
                for (prop in mapping){
                    if (mapping.hasOwnProperty(prop)){
                        total=0;

                        for (i=0, len=mapping[prop].length; i < len; i++){
                            total += properties[mapping[prop][i]] ? 1 : 0;
                        }

                        if (total == mapping[prop].length){
                            reporter.report("The properties " + mapping[prop].join(", ") + " can be replaced by " + prop + ".", event.line, event.col, rule);
                        }
                    }
                }
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);

            //check for use of "font-size"
            parser.addListener("property", function(event){
                var name = event.property.toString().toLowerCase(),
                    value = event.value.parts[0].value;

                if (propertiesToCheck[name]){
                    properties[name] = 1;
                }
            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);

        }

    });
    /*
     * Rule: Don't use properties with a star prefix.
     *
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "star-property-hack",
        name: "Disallow properties with a star prefix",
        desc: "Checks for the star property hack (targets IE6/7)",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            //check if property name starts with "*"
            parser.addListener("property", function(event){
                var property = event.property;

                if (property.hack == "*") {
                    reporter.report("Property with star prefix found.", event.property.line, event.property.col, rule);
                }
            });
        }
    });
    /*
     * Rule: Don't use text-indent for image replacement if you need to support rtl.
     *
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "text-indent",
        name: "Disallow negative text-indent",
        desc: "Checks for text indent less than -99px",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                textIndent,
                direction;


            function startRule(event){
                textIndent = false;
                direction = "inherit";
            }

            //event handler for end of rules
            function endRule(event){
                if (textIndent && direction != "ltr"){
                    reporter.report("Negative text-indent doesn't work well with RTL. If you use text-indent for image replacement explicitly set direction for that item to ltr.", textIndent.line, textIndent.col, rule);
                }
            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);

            //check for use of "font-size"
            parser.addListener("property", function(event){
                var name = event.property.toString().toLowerCase(),
                    value = event.value;

                if (name == "text-indent" && value.parts[0].value < -99){
                    textIndent = event.property;
                } else if (name == "direction" && value == "ltr"){
                    direction = "ltr";
                }
            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);

        }

    });
    /*
     * Rule: Don't use properties with a underscore prefix.
     *
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "underscore-property-hack",
        name: "Disallow properties with an underscore prefix",
        desc: "Checks for the underscore property hack (targets IE6)",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            //check if property name starts with "_"
            parser.addListener("property", function(event){
                var property = event.property;

                if (property.hack == "_") {
                    reporter.report("Property with underscore prefix found.", event.property.line, event.property.col, rule);
                }
            });
        }
    });
    /*
     * Rule: Headings (h1-h6) should be defined only once.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "unique-headings",
        name: "Headings should only be defined once",
        desc: "Headings should be defined only once.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            var headings =  {
                    h1: 0,
                    h2: 0,
                    h3: 0,
                    h4: 0,
                    h5: 0,
                    h6: 0
                };

            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    pseudo,
                    i, j;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];
                    part = selector.parts[selector.parts.length-1];

                    if (part.elementName && /(h[1-6])/i.test(part.elementName.toString())){

                        for (j=0; j < part.modifiers.length; j++){
                            if (part.modifiers[j].type == "pseudo"){
                                pseudo = true;
                                break;
                            }
                        }

                        if (!pseudo){
                            headings[RegExp.$1]++;
                            if (headings[RegExp.$1] > 1) {
                                reporter.report("Heading (" + part.elementName + ") has already been defined.", part.line, part.col, rule);
                            }
                        }
                    }
                }
            });

            parser.addListener("endstylesheet", function(event){
                var prop,
                    messages = [];

                for (prop in headings){
                    if (headings.hasOwnProperty(prop)){
                        if (headings[prop] > 1){
                            messages.push(headings[prop] + " " + prop + "s");
                        }
                    }
                }

                if (messages.length){
                    reporter.rollupWarn("You have " + messages.join(", ") + " defined in this stylesheet.", rule);
                }
            });
        }

    });
    /*
     * Rule: Don't use universal selector because it's slow.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "universal-selector",
        name: "Disallow universal selector",
        desc: "The universal selector (*) is known to be slow.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("startrule", function(event){
                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];

                    part = selector.parts[selector.parts.length-1];
                    if (part.elementName == "*"){
                        reporter.report(rule.desc, part.line, part.col, rule);
                    }
                }
            });
        }

    });
    /*
     * Rule: Don't use unqualified attribute selectors because they're just like universal selectors.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "unqualified-attributes",
        name: "Disallow unqualified attribute selectors",
        desc: "Unqualified attribute selectors are known to be slow.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            parser.addListener("startrule", function(event){

                var selectors = event.selectors,
                    selector,
                    part,
                    modifier,
                    i, j, k;

                for (i=0; i < selectors.length; i++){
                    selector = selectors[i];

                    part = selector.parts[selector.parts.length-1];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        for (k=0; k < part.modifiers.length; k++){
                            modifier = part.modifiers[k];
                            if (modifier.type == "attribute" && (!part.elementName || part.elementName == "*")){
                                reporter.report(rule.desc, part.line, part.col, rule);
                            }
                        }
                    }

                }
            });
        }

    });
    /*
     * Rule: When using a vendor-prefixed property, make sure to
     * include the standard one.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "vendor-prefix",
        name: "Require standard property with vendor prefix",
        desc: "When using a vendor-prefixed property, make sure to include the standard one.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this,
                properties,
                num,
                propertiesToCheck = {
                    "-webkit-border-radius": "border-radius",
                    "-webkit-border-top-left-radius": "border-top-left-radius",
                    "-webkit-border-top-right-radius": "border-top-right-radius",
                    "-webkit-border-bottom-left-radius": "border-bottom-left-radius",
                    "-webkit-border-bottom-right-radius": "border-bottom-right-radius",

                    "-o-border-radius": "border-radius",
                    "-o-border-top-left-radius": "border-top-left-radius",
                    "-o-border-top-right-radius": "border-top-right-radius",
                    "-o-border-bottom-left-radius": "border-bottom-left-radius",
                    "-o-border-bottom-right-radius": "border-bottom-right-radius",

                    "-moz-border-radius": "border-radius",
                    "-moz-border-radius-topleft": "border-top-left-radius",
                    "-moz-border-radius-topright": "border-top-right-radius",
                    "-moz-border-radius-bottomleft": "border-bottom-left-radius",
                    "-moz-border-radius-bottomright": "border-bottom-right-radius",

                    "-moz-column-count": "column-count",
                    "-webkit-column-count": "column-count",

                    "-moz-column-gap": "column-gap",
                    "-webkit-column-gap": "column-gap",

                    "-moz-column-rule": "column-rule",
                    "-webkit-column-rule": "column-rule",

                    "-moz-column-rule-style": "column-rule-style",
                    "-webkit-column-rule-style": "column-rule-style",

                    "-moz-column-rule-color": "column-rule-color",
                    "-webkit-column-rule-color": "column-rule-color",

                    "-moz-column-rule-width": "column-rule-width",
                    "-webkit-column-rule-width": "column-rule-width",

                    "-moz-column-width": "column-width",
                    "-webkit-column-width": "column-width",

                    "-webkit-column-span": "column-span",
                    "-webkit-columns": "columns",

                    "-moz-box-shadow": "box-shadow",
                    "-webkit-box-shadow": "box-shadow",

                    "-moz-transform" : "transform",
                    "-webkit-transform" : "transform",
                    "-o-transform" : "transform",
                    "-ms-transform" : "transform",

                    "-moz-transform-origin" : "transform-origin",
                    "-webkit-transform-origin" : "transform-origin",
                    "-o-transform-origin" : "transform-origin",
                    "-ms-transform-origin" : "transform-origin",

                    "-moz-box-sizing" : "box-sizing",
                    "-webkit-box-sizing" : "box-sizing",

                    "-moz-user-select" : "user-select",
                    "-khtml-user-select" : "user-select",
                    "-webkit-user-select" : "user-select"
                };

            //event handler for beginning of rules
            function startRule(){
                properties = {};
                num=1;
            }

            //event handler for end of rules
            function endRule(event){
                var prop,
                    i, len,
                    standard,
                    needed,
                    actual,
                    needsStandard = [];

                for (prop in properties){
                    if (propertiesToCheck[prop]){
                        needsStandard.push({ actual: prop, needed: propertiesToCheck[prop]});
                    }
                }

                for (i=0, len=needsStandard.length; i < len; i++){
                    needed = needsStandard[i].needed;
                    actual = needsStandard[i].actual;

                    if (!properties[needed]){
                        reporter.report("Missing standard property '" + needed + "' to go along with '" + actual + "'.", properties[actual][0].name.line, properties[actual][0].name.col, rule);
                    } else {
                        //make sure standard property is last
                        if (properties[needed][0].pos < properties[actual][0].pos){
                            reporter.report("Standard property '" + needed + "' should come after vendor-prefixed property '" + actual + "'.", properties[actual][0].name.line, properties[actual][0].name.col, rule);
                        }
                    }
                }

            }

            parser.addListener("startrule", startRule);
            parser.addListener("startfontface", startRule);
            parser.addListener("startpage", startRule);
            parser.addListener("startpagemargin", startRule);
            parser.addListener("startkeyframerule", startRule);

            parser.addListener("property", function(event){
                var name = event.property.text.toLowerCase();

                if (!properties[name]){
                    properties[name] = [];
                }

                properties[name].push({ name: event.property, value : event.value, pos:num++ });
            });

            parser.addListener("endrule", endRule);
            parser.addListener("endfontface", endRule);
            parser.addListener("endpage", endRule);
            parser.addListener("endpagemargin", endRule);
            parser.addListener("endkeyframerule", endRule);
        }

    });
    /*
     * Rule: You don't need to specify units when a value is 0.
     */
    /*global CSSLint*/
    CSSLint.addRule({

        //rule information
        id: "zero-units",
        name: "Disallow units for 0 values",
        desc: "You don't need to specify units when a value is 0.",
        browsers: "All",

        //initialization
        init: function(parser, reporter){
            var rule = this;

            //count how many times "float" is used
            parser.addListener("property", function(event){
                var parts = event.value.parts,
                    i = 0,
                    len = parts.length;

                while(i < len){
                    if ((parts[i].units || parts[i].type == "percentage") && parts[i].value === 0 && parts[i].type != "time"){
                        reporter.report("Values of 0 shouldn't have units specified.", parts[i].line, parts[i].col, rule);
                    }
                    i++;
                }

            });

        }

    });
    /*global CSSLint*/
    (function() {

        /**
         * Replace special characters before write to output.
         *
         * Rules:
         *  - single quotes is the escape sequence for double-quotes
         *  - &amp; is the escape sequence for &
         *  - &lt; is the escape sequence for <
         *  - &gt; is the escape sequence for >
         *
         * @param {String} message to escape
         * @return escaped message as {String}
         */
        var xmlEscape = function(str) {
            if (!str || str.constructor !== String) {
                return "";
            }

            return str.replace(/[\"&><]/g, function(match) {
                switch (match) {
                    case "\"":
                        return "&quot;";
                    case "&":
                        return "&amp;";
                    case "<":
                        return "&lt;";
                    case ">":
                        return "&gt;";
                }
            });
        };

        CSSLint.addFormatter({
            //format information
            id: "checkstyle-xml",
            name: "Checkstyle XML format",

            /**
             * Return opening root XML tag.
             * @return {String} to prepend before all results
             */
            startFormat: function(){
                return "<?xml version=\"1.0\" encoding=\"utf-8\"?><checkstyle>";
            },

            /**
             * Return closing root XML tag.
             * @return {String} to append after all results
             */
            endFormat: function(){
                return "</checkstyle>";
            },

            /**
             * Returns message when there is a file read error.
             * @param {String} filename The name of the file that caused the error.
             * @param {String} message The error message
             * @return {String} The error message.
             */
            readError: function(filename, message) {
                return "<file name=\"" + xmlEscape(filename) + "\"><error line=\"0\" column=\"0\" severty=\"error\" message=\"" + xmlEscape(message) + "\"></error></file>";
            },

            /**
             * Given CSS Lint results for a file, return output for this format.
             * @param results {Object} with error and warning messages
             * @param filename {String} relative file path
             * @param options {Object} (UNUSED for now) specifies special handling of output
             * @return {String} output for results
             */
            formatResults: function(results, filename, options) {
                var messages = results.messages,
                    output = [];

                /**
                 * Generate a source string for a rule.
                 * Checkstyle source strings usually resemble Java class names e.g
                 * net.csslint.SomeRuleName
                 * @param {Object} rule
                 * @return rule source as {String}
                 */
                var generateSource = function(rule) {
                    if (!rule || !('name' in rule)) {
                        return "";
                    }
                    return 'net.csslint.' + rule.name.replace(/\s/g,'');
                };



                if (messages.length > 0) {
                    output.push("<file name=\""+filename+"\">");
                    CSSLint.Util.forEach(messages, function (message, i) {
                        //ignore rollups for now
                        if (!message.rollup) {
                          output.push("<error line=\"" + message.line + "\" column=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                              " message=\"" + xmlEscape(message.message) + "\" source=\"" + generateSource(message.rule) +"\"/>");
                        }
                    });
                    output.push("</file>");
                }

                return output.join("");
            }
        });

    }());
    /*global CSSLint*/
    CSSLint.addFormatter({
        //format information
        id: "compact",
        name: "Compact, 'porcelain' format",

        /**
         * Return content to be printed before all file results.
         * @return {String} to prepend before all results
         */
        startFormat: function() {
            return "";
        },

        /**
         * Return content to be printed after all file results.
         * @return {String} to append after all results
         */
        endFormat: function() {
            return "";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (Optional) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {
            var messages = results.messages,
                output = "";
            options = options || {};

            /**
             * Capitalize and return given string.
             * @param str {String} to capitalize
             * @return {String} capitalized
             */
            var capitalize = function(str) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            };

            if (messages.length === 0) {
                return options.quiet ? "" : filename + ": Lint Free!";
            }

            CSSLint.Util.forEach(messages, function(message, i) {
                if (message.rollup) {
                    output += filename + ": " + capitalize(message.type) + " - " + message.message + "\n";
                } else {
                    output += filename + ": " + "line " + message.line +
                        ", col " + message.col + ", " + capitalize(message.type) + " - " + message.message + "\n";
                }
            });

            return output;
        }
    });
    /*global CSSLint*/
    CSSLint.addFormatter({
        //format information
        id: "csslint-xml",
        name: "CSSLint XML format",

        /**
         * Return opening root XML tag.
         * @return {String} to prepend before all results
         */
        startFormat: function(){
            return "<?xml version=\"1.0\" encoding=\"utf-8\"?><csslint>";
        },

        /**
         * Return closing root XML tag.
         * @return {String} to append after all results
         */
        endFormat: function(){
            return "</csslint>";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (UNUSED for now) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {
            var messages = results.messages,
                output = [];

            /**
             * Replace special characters before write to output.
             *
             * Rules:
             *  - single quotes is the escape sequence for double-quotes
             *  - &amp; is the escape sequence for &
             *  - &lt; is the escape sequence for <
             *  - &gt; is the escape sequence for >
             *
             * @param {String} message to escape
             * @return escaped message as {String}
             */
            var escapeSpecialCharacters = function(str) {
                if (!str || str.constructor !== String) {
                    return "";
                }
                return str.replace(/\"/g, "'").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            };

            if (messages.length > 0) {
                output.push("<file name=\""+filename+"\">");
                CSSLint.Util.forEach(messages, function (message, i) {
                    if (message.rollup) {
                        output.push("<issue severity=\"" + message.type + "\" reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                    } else {
                        output.push("<issue line=\"" + message.line + "\" char=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                            " reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                    }
                });
                output.push("</file>");
            }

            return output.join("");
        }
    });
    /*global CSSLint*/
    CSSLint.addFormatter({
        //format information
        id: "junit-xml",
        name: "JUNIT XML format",

        /**
         * Return opening root XML tag.
         * @return {String} to prepend before all results
         */
        startFormat: function(){
            return "<?xml version=\"1.0\" encoding=\"utf-8\"?><testsuites>";
        },

        /**
         * Return closing root XML tag.
         * @return {String} to append after all results
         */
        endFormat: function() {
            return "</testsuites>";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (UNUSED for now) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {

            var messages = results.messages,
                output = [],
                tests = {
                    'error': 0,
                    'failure': 0
                };

            /**
             * Generate a source string for a rule.
             * JUNIT source strings usually resemble Java class names e.g
             * net.csslint.SomeRuleName
             * @param {Object} rule
             * @return rule source as {String}
             */
            var generateSource = function(rule) {
                if (!rule || !('name' in rule)) {
                    return "";
                }
                return 'net.csslint.' + rule.name.replace(/\s/g,'');
            };

            /**
             * Replace special characters before write to output.
             *
             * Rules:
             *  - single quotes is the escape sequence for double-quotes
             *  - &lt; is the escape sequence for <
             *  - &gt; is the escape sequence for >
             *
             * @param {String} message to escape
             * @return escaped message as {String}
             */
            var escapeSpecialCharacters = function(str) {

                if (!str || str.constructor !== String) {
                    return "";
                }

                return str.replace(/\"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");

            };

            if (messages.length > 0) {

                messages.forEach(function (message, i) {

                    // since junit has no warning class
                    // all issues as errors
                    var type = message.type === 'warning' ? 'error' : message.type;

                    //ignore rollups for now
                    if (!message.rollup) {

                        // build the test case seperately, once joined
                        // we'll add it to a custom array filtered by type
                        output.push("<testcase time=\"0\" name=\"" + generateSource(message.rule) + "\">");
                        output.push("<" + type + " message=\"" + escapeSpecialCharacters(message.message) + "\"><![CDATA[" + message.line + ':' + message.col + ':' + escapeSpecialCharacters(message.evidence)  + "]]></" + type + ">");
                        output.push("</testcase>");

                        tests[type] += 1;

                    }

                });

                output.unshift("<testsuite time=\"0\" tests=\"" + messages.length + "\" skipped=\"0\" errors=\"" + tests.error + "\" failures=\"" + tests.failure + "\" package=\"net.csslint\" name=\"" + filename + "\">");
                output.push("</testsuite>");

            }

            return output.join("");

        }
    });
    /*global CSSLint*/
    CSSLint.addFormatter({
        //format information
        id: "lint-xml",
        name: "Lint XML format",

        /**
         * Return opening root XML tag.
         * @return {String} to prepend before all results
         */
        startFormat: function(){
            return "<?xml version=\"1.0\" encoding=\"utf-8\"?><lint>";
        },

        /**
         * Return closing root XML tag.
         * @return {String} to append after all results
         */
        endFormat: function(){
            return "</lint>";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (UNUSED for now) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {
            var messages = results.messages,
                output = [];

            /**
             * Replace special characters before write to output.
             *
             * Rules:
             *  - single quotes is the escape sequence for double-quotes
             *  - &amp; is the escape sequence for &
             *  - &lt; is the escape sequence for <
             *  - &gt; is the escape sequence for >
             *
             * @param {String} message to escape
             * @return escaped message as {String}
             */
            var escapeSpecialCharacters = function(str) {
                if (!str || str.constructor !== String) {
                    return "";
                }
                return str.replace(/\"/g, "'").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            };

            if (messages.length > 0) {

                output.push("<file name=\""+filename+"\">");
                CSSLint.Util.forEach(messages, function (message, i) {
                    if (message.rollup) {
                        output.push("<issue severity=\"" + message.type + "\" reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                    } else {
                        output.push("<issue line=\"" + message.line + "\" char=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                            " reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                    }
                });
                output.push("</file>");
            }

            return output.join("");
        }
    });
    /*global CSSLint*/
    CSSLint.addFormatter({
        //format information
        id: "text",
        name: "Plain Text",

        /**
         * Return content to be printed before all file results.
         * @return {String} to prepend before all results
         */
        startFormat: function() {
            return "";
        },

        /**
         * Return content to be printed after all file results.
         * @return {String} to append after all results
         */
        endFormat: function() {
            return "";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (Optional) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {
            var messages = results.messages,
                output = "";
            options = options || {};

            if (messages.length === 0) {
                return options.quiet ? "" : "\n\ncsslint: No errors in " + filename + ".";
            }

            output = "\n\ncsslint: There are " + messages.length  +  " problems in " + filename + ".";
            var pos = filename.lastIndexOf("/"),
                shortFilename = filename;

            if (pos === -1){
                pos = filename.lastIndexOf("\\");
            }
            if (pos > -1){
                shortFilename = filename.substring(pos+1);
            }

            CSSLint.Util.forEach(messages, function (message, i) {
                output = output + "\n\n" + shortFilename;
                if (message.rollup) {
                    output += "\n" + (i+1) + ": " + message.type;
                    output += "\n" + message.message;
                } else {
                    output += "\n" + (i+1) + ": " + message.type + " at line " + message.line + ", col " + message.col;
                    output += "\n" + message.message;
                    output += "\n" + message.evidence;
                }
            });

            return output;
        }
    });

    return CSSLint;
});
define('skylark-utils-css/Lint',[
    "./css",
    "./primitives/csslint"
], function(css, CSSLint) {

	return css.Lint = CSSLint;
});
define('skylark-utils-css/Parser',[
	"skylark-langx/langx",
    "./css",
    "./primitives/parser-lib"
], function(langx,css, parserlib) {
	var Parser = css.Parser = parserlib.css.Parser;
	langx.mixin(Parser,parserlib.css);

	return Parser ;
});
define('skylark-utils-css/toJSON',[
    "skylark-langx/langx",
    "./css",
    "./Parser"
], function(langx, css, Parser) {

	var Parsing = langx.klass({
		"init" : function(options) {

			this._ordered = (options && options.ordered) || false;
		},

		"begin" : function() {
			var ordered = this._ordered,
				stack = this._stack = [];
			if (ordered) {
				stack.push([]);
			} else {
				stack.push({});
			}

			this._result = null;

		},

		"end" : function(error) {
	    	var stack = this._stack;
	    	this._stack = null;

	    	if (error || stack.length !== 1) {
	    		throw new Error("parse error");
	    	} else {
				this._result =  stack[0];
	    	}


	    	return this._result;
		},

		"beginBlock" : function(rule) {
	    	this._stack.push(rule);
		},

		"endBlock" : function(order) {
	    	var ordered = order && this._orderd,
	    		stack = this._stack,
	    		rule = stack.pop(),
	    		top = stack[stack.length-1],
                values = top.values || top;
	    	if (langx.isArray(values)){
	    		var obj = {};
	    		obj[rule.name] = rule.values;
	    		values.push(obj);
	    	} else {
	    		values[rule.name] = rule.values;
	    	}
		},

		"prop" : function(name,value,important) {
			if (important) {
				value = value + " !important";
			}
	    	var stack = this._stack,
	    		top = stack[stack.length-1];
    		top.values[name] = value;
		},

		"result" : function() {
			return this._result;
		}

	});


	function toJSON(css,order) {
		
	    var parser = new Parser({ 
	    					starHack: false,
	                        ieFilters: false,
	                        strict: false
	                     }),
	   	    sheet = new Parsing(order);
  
	    parser.addListener("startstylesheet", function(){
	    	sheet.begin();
	    });
	    
	    parser.addListener("endstylesheet", function(){
	    	sheet.end();
	    });
	    
	    parser.addListener("charset", function(event){
			sheet.beginBlock({
	    		name : "@charset",
	    		values :event.charset
	    	});
	    	sheet.endBlock();
	    });
	    
	    parser.addListener("namespace", function(event){
	    	var key = "@Namespace";
	    	if (event.prefix) {
	    		key = key + " " + event.prefix;
	    	}
	    	sheet.beginBlock({
	    		name : key,
	    		values : "\"" + event.uri + "\""
	    	});
	    	sheet.endBlock();
	    });
	    
	    parser.addListener("startfontface", function(event){
	    });
	    
	    parser.addListener("endfontface", function(event){
	    });
	    
	    parser.addListener("startkeyframes", function(event){
	    	sheet.beginBlock({
	    		name : "@keyframes " + event.name,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("startkeyframerule", function(event){
			var selectors = "";	        
	        for (var i=0,len=event.keys.length; i < len; i++){
	        	var selector = event.keys[i].text;
	        	if (selectors) {
	        		selectors = selectors + "," + selector
	        	} else {
	        		selectors = selector;
	        	}
	        }
	    	sheet.beginBlock({
	    		name : selectors,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("endkeyframerule", function(event){
	    	sheet.endBlock(false);
	    });    
	    
	    parser.addListener("endkeyframes", function(event){
	    	sheet.endBlock(false);
	    });
	    
	    parser.addListener("startpage", function(event){
	        log("Starting page with ID=" + event.id + " and pseudo=" + event.pseudo);
            var key = "@page";
            if (event.pseudo) {
                key = key + " " + event.pseudo;
            }
            sheet.beginBlock({
                name : key,
                values :{}
            });
	    });
	    
	    
	    parser.addListener("endpage", function(event){
	        log("Ending page with ID=" + event.id + " and pseudo=" + event.pseudo);
            sheet.endBlock(false);
	    });

	    parser.addListener("startpagemargin", function(event){
	        log("Starting page margin " + event.margin);
            sheet.beginBlock({
                name : "@page-margin",
                values :{}
            });
	    });
	    
	    
	    parser.addListener("endpagemargin", function(event){
	        log("Ending page margin " + event.margin);
            sheet.endBlock(false);
	    });

        parser.addListener("starttopcenter", function(event){
            //log("Starting top center " + event.center);
            sheet.beginBlock({
                name : "@top-center",
                values :{}
            });
        });
        
        
        parser.addListener("endtopcenter", function(event){
            //log("Ending Top Center " + event.center);
            sheet.endBlock(false);
        });
	    
	    parser.addListener("import", function(event){
	        log("Importing " + event.uri + " for media types [" + event.media + "]");
            var key = "@import " + event.uri;
            if (event.media) {
                key = key + " " + event.media;
            }
            sheet.beginBlock({
                name : key,
                values : ""
            });
            sheet.endBlock(true);
	    });
	    
	    parser.addListener("startrule", function(event){
			var selectors = "";	        
	        for (var i=0,len=event.selectors.length; i < len; i++){
	            var selector = event.selectors[i];
	            
	            if (selectors) {
	            	selectors = selectors + "," + selector.text;
	            } else {
	            	selectors = selector.text;
	            }
	        }

	    	sheet.beginBlock({
	    		name : selectors,
	    		values :{}
	    	});
	    });
	    
	    parser.addListener("endrule", function(event){
	    	sheet.endBlock(true);
	    });
	    
	    parser.addListener("property", function(event){

	        sheet.prop(event.property.text,event.value.text,event.important);
	    });
	    
	    parser.addListener("startmedia", function(event){
	    	sheet.beginBlock({
	    		name : "@media " + event.media,
	    		values :{}
	    	});

	    });
	    
	    parser.addListener("endmedia", function(event){
	    	sheet.endBlock(true);
	    });    


	    parser.addListener("error", function(event){
	    	sheet.end(false);
	    });

        parser.parse(document.getElementById("input").value);

	    return sheet.result();

	}

	return css.toJSON = toJSON;
});
define('skylark-utils-css/main',[
    "./css",
    "./beautify",
    "./Lint",
    "./Parser",
    "./toJSON"
], function(css) {

	return css;
});
define('skylark-utils-css', ['skylark-utils-css/main'], function (main) { return main; });


},this);