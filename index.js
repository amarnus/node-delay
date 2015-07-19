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
};
util.inherits(Delay, EventEmitter);

Delay.prototype._step = function(id) {
    var args = slice(arguments);
    args.shift(); // Remove the callback ID.

    var err = args.shift();
    if (err) {
        this.fail++;
        this.remaining = [];
        return this.emit('error', err);
    }

    this.args = this.args || {};
    if (args.length) {
        this.args[id] = args;
    }

    if (this.fail || --this.pending || this.lock) {
        return;
    }

    this.lock = 1;

    var argsToSend = values(this.args);
    if (argsToSend.length === 1) {
        argsToSend = argsToSend[0];
    }
    this.args = null;

    this.counter = 0;
    var cb;
    if (cb = this.remaining.shift()) {
        if (typeof cb !== 'function') {
            this.remaining = [];
            return this.emit(
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
            return this.emit('error', e);
        };
    }

    if (!this.counter) {
        this.remaining = [];
        return this.emit('finish', argsToSend);
    }

    if (!this.pending) {
        // For steps that only call pass(), we now break the lock and move on.
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
