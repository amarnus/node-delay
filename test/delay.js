'use strict';

var Delay = require('../index');
var slice = require('lodash.slice');
var flatten = require('lodash.flatten');

function async(f) {
    process.nextTick(f);
}

var exports = {};

exports['pass data asynchrously to next step'] = function(test) {
    var d = new Delay(
        function() {
            var n = this.next();
            async(function() {
                n(null, 2);
            });
        },
        function(res) {
            test.strictEqual(res, 2);
            test.done();
        }
    );
};

exports['pass data asynchrously to next step through multiple operations'] = function(test) {
    var d = new Delay(
        function() {
            var n = this.next();
            var n1 = this.next();
            async(function() { n(null, 2); });
            async(function() { n1(null, 3); });
        },
        function(res, res1) {
            test.strictEqual(res[0], 2);
            test.strictEqual(res1[0], 3);
            test.done();
        }
    );
};

exports['pass data synchrously to next step'] = function(test) {
    var d = new Delay(
        function() {
            this.pass(null, 3);
        },
        function(res) {
            test.strictEqual(res, 3, 'passed value synchrously to the next callback.');
            test.done();
        }
    );
};

exports['end chain after first step'] = function(test) {
    var result;
    var d = new Delay(
        function() {
            result = 'success';
        },
        function() {
            result = 'failed';
        }
    );
    d.on('finish', function() {
        test.strictEqual(result, 'success');
        test.done();
    });
};

exports['end chain after second step'] = function(test) {
    var args = [];
    var d = new Delay(
        function() {
            this.pass(null, 23);
            this.pass(null, 32);
        },
        function() {
            args = slice(arguments);
        },
        function() {
            args.push('fail');
        }
    );
    d.on('finish', function(finishArgs) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(args[0][0], 23);
        test.strictEqual(args[1][0], 32);
        test.strictEqual(finishArgs[0][0], 23);
        test.strictEqual(finishArgs[1][0], 32);
        test.done();
    });
};

exports['end chain after third step'] = function(test) {
    var result;
    var d = new Delay(
        function() {
            async(this.next());
        },
        function() {
            result = 'fail';
            this.pass();
        },
        function() {
            result = 'success';
        },
        function() {
            result = 'fail';
        }
    );
    d.on('finish', function() {
        test.strictEqual(result, 'success', 'ended chain in third step.');
        test.done();
    });
};

exports['finish steps with event'] = function(test) {
    var d = new Delay(
        function() {
            var n = this.next();
            async(function() {
                n(null, 1, 2, 3);
            });
        },
        function() {
            var args = slice(arguments);
            var n = this.next();
            async(function() {
                n(null, args, 4);
            });
        }
    );
    d.on('finish', function(args) {
        test.strictEqual(args[0][0], 1);
        test.strictEqual(args[0][1], 2);
        test.strictEqual(args[0][2], 3);
        test.strictEqual(args[1], 4);
        test.done();
    });
};

exports['nested delays'] = function(test) {
    var result = [];
    var d1 = new Delay(
        function() {
            var self = this;
            var _n = self.next();
            var d2 = new Delay(function() {
                var args = slice(arguments);
                // We need to do this because unlike Mojo::IOLoop::Delay, we can't afford the
                // first parameter to be not null.
                args.unshift(null);
                _n.apply(self, args);
            });
            async(d2.next());
            async(this.next());
            var n = d2.next();
            async(function() {
                n(null, 1, 2, 3);
            });
        },
        function() {
            var args = slice(arguments);
            result = args;
            var n = this.next();
            this.next()(null, 3, 2, 1);
            var n1 = this.next();
            var n2 = this.next();
            n1(null, 4);
            n2(null, 5, 6);
            this.pass(null, 23);
            this.pass(null, 24);
            n(null, 1, 2, 3);
        },
        function() {
            var args = flatten(slice(arguments));
            result.push(args);
        }
    );

    d1.on('finish', function() {
        test.deepEqual(flatten(result), [ 1, 2, 3, 1, 2, 3, 3, 2, 1, 4, 5, 6, 23, 24 ]);
        test.done();
    });
};

exports['dynamic step'] = function(test) {
        var result;
        var d = new Delay(
            function() {
                var num = 9;
                var n = this.next();
                async(function() {
                    n(null, num);
                });
                this.remaining.unshift(this.double);
            },
            function(num) {
                result = num;
            }
        );
        d.double = function(num) {
            var n = this.next();
            async(function() {
                n(null, num * 2);
            });
        };
        test.strictEqual(d.remaining.length, 2);
        d.on('finish', function() {
            test.strictEqual(d.remaining.length, 0);
            test.strictEqual(result, 18);
            test.done();
        });
};

exports['emit error event for cb error (async)'] = function(test) {
    var d = new Delay(
        function() {
            var n = this.next();
            async(function() {
                n(new Error('Random error'));
            });
        }
    );
    // Proxy emit() so that we can ensure that the `finish` event is not fired.
    var _emit = d.emit;
    d.emit = function() {
        var args = slice(arguments);
        test.notStrictEqual(args[0], 'finish');
        return _emit.apply(d, args);
    };
    d.on('error', function(e) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(e.message, 'Random error');
        test.done();
    });
};

exports['emit error event for cb error (sync)'] = function(test) {
    var d = new Delay(
        function() {
            this.pass(new Error('Another Random error'));
        }
    );
    // Proxy emit() so that we can ensure that the `finish` event is not fired.
    var _emit = d.emit;
    d.emit = function() {
        var args = slice(arguments);
        test.notStrictEqual(args[0], 'finish');
        return _emit.apply(d, args);
    };
    d.on('error', function(e) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(e.message, 'Another Random error');
        test.done();
    });
};

exports['exception in the first step'] = function(test) {
    var d = new Delay(
        function() {
            throw new Error('First Step!');
        }
    );
    // Proxy emit() so that we can ensure that the `finish` event is not fired.
    var _emit = d.emit;
    d.emit = function() {
        var args = slice(arguments);
        test.notStrictEqual(args[0], 'finish');
        return _emit.apply(d, args);
    };
    d.on('error', function(e) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(e.message, 'First Step!');
        test.done();
    });
};

exports['exception in the second step with active operations'] = function(test) {
    var result = 'success';
    var d = new Delay(
        function() {
            var n = this.next();
            async(function() {
                n();
            });
        },
        function() {
            var n1 = this.next();
            var n2 = this.next();
            async(function() {
                n1();
                n2();
            });
            throw new Error('Second Step!');
        },
        function() {
            result = 'failed';
        }
    );
    // Proxy emit() so that we can ensure that the `finish` event is not fired.
    var _emit = d.emit;
    d.emit = function() {
        var args = slice(arguments);
        test.notStrictEqual(args[0], 'finish');
        return _emit.apply(d, args);
    };
    d.on('error', function(e) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(result, 'success');
        test.strictEqual(e.message, 'Second Step!');
        test.done();
    });
};

exports['exception in the last step'] = function(test) {
    var result = 'success';
    var d = new Delay(
        function() {
            async(this.next());
        },
        function() {
            throw new Error('Last Step!');
        }
    );
    // Proxy emit() so that we can ensure that the `finish` event is not fired.
    var _emit = d.emit;
    d.emit = function() {
        var args = slice(arguments);
        test.notStrictEqual(args[0], 'finish');
        return _emit.apply(d, args);
    };
    d.on('error', function(e) {
        test.strictEqual(d.remaining.length, 0);
        test.strictEqual(e.message, 'Last Step!');
        test.done();
    });
};

module.exports = exports;
