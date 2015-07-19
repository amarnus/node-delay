'use strict';

var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var slice        = require('lodash.slice');
var keys         = require('lodash.keys');
var values       = require('lodash.values');
var assign       = require('lodash.assign');

var Delay = function() {
    this.remaining = slice(arguments);
    this.counter = 0;
    this.pending = 0;
    this.lock = 0;
    process.nextTick(this.next());
    this.delay = assign({}, {
        next: this.next,
        pass: this.pass
    }, EventEmitter.prototype);
    return this.delay;
};
util.inherits(Delay, EventEmitter);

Delay.prototype._step = function(id) {
    var args = slice(arguments);
    args.shift();
    var err = args.shift();
    this.args = this.args || {};
    this.args[id] = args;

    if (this.fail || --this.pending || this.lock) {
        return;
    }

    if (err) {
        this.fail++;
        this.remaining = [];
        return this.delay.emit('error', err);
    }

    this.lock = 1;

    var argsToSend = values(this.args);
    argsToSend = argsToSend.filter(function(arg) { return arg.length; });
    if (argsToSend.length === 1) {
        argsToSend = argsToSend[0];
    }
    this.args = {};

    this.counter = 0;
    var cb;
    if (cb = this.remaining.shift()) {
        if (typeof cb !== 'function') {
            this.remaining = [];
            return this.delay.emit(
                'error',
                new Error('Each step in the Delay chain must be a callable.')
            );
        }
        try {
            cb.apply(this, argsToSend);
        } catch(e) {
            this.fail++;
            this.remaining = [];
            // TODO: Get proper stackTrace so that the user will know which step the problem was in.
            return this.delay.emit('error', e);
        };
    }

    if (!this.counter) {
        this.remaining = [];
        return this.delay.emit('finish', argsToSend);
    }

    // Useful when there is a mixture of async & sync callbacks i.e. pass & next.
    if (!this.pending) {
        process.nextTick(this.next());
    }

    this.lock = 0;
};

Delay.prototype.next = function() {
    var self = this;
    this.pending++;
    var id = this.counter++;
    return function() {
        var args = slice(arguments);
        args.unshift(id);
        return self._step.apply(self, args);
    };
};

Delay.prototype.pass = function() {
    var args = slice(arguments);
    return this.next().apply(this, args);
};

module.exports = Delay;

// Yet another tiny library for managing asynchronous control flow. Port of the Mojo::IOLoop::Delay library from Perl.
