# node-delay ![](https://api.travis-ci.org/amarnus/node-delay.svg)

Yet another tiny library for managing async control flow. Port of the [Mojo::IOLoop::Delay](http://mojolicio.us/perldoc/Mojo/IOLoop/Delay) Perl library.

## Installation

```
npm install --save node-delay
```

## Usage

### Basic

```javascript
var Delay = require('node-delay');

// Sequentialize multiple events
var delay = new Delay(
    // First step (simple timer)
    function() {
        setTimeout(this.next(), 2000);
        console.log('Second step in 2 seconds.');
    },
    // Second step (concurrent timers)
    function() {
        setTimeout(this.next(), 4000);
        setTimeout(this.next(), 3000);
        console.log('Third step in 4 seconds.');
    }
);

delay.on('finish', function() {
    console.log('And done after 6 seconds total.');
});
```

### Error Handling

```javascript
var delay = new Delay(
    function() {
        this.next(new Error('Intentional error'));
        // or simply new Error()
    },
    function() {
        console.log('Never actually reached.');
    }
);

delay.on('error', function(e) {
    console.log('Something went wrong: ');
    console.trace(e);
});
```

## API

>Note that the first argument passed to the next step is assumed to be the error object as is typical in the `node` world.

### .next( ... )

Returns a function that can be called once a single asynchronous operation in a given step is complete. The arguments passed to the function will be sent to the next step.

### .pass( ... )

Sends data to the next step.

## Events

The `Delay` function inherits from the `EventEmitter` and emits the following custom events.

### finish

Emitted once a step that has neither a call to `next()` or `pass()` is reached in the chain. While this is often the last step - it may not always be the case.

The set of arguments sent from the last executed step in the chain is passed as the event payload.

### error

Emitted either when there was a custom error sent by one of the asynchronous operations in a step or there was an synchronous exception thrown. Once the error event is emitted from one of the steps, the rest of the steps in the chain will not be executed.

## License

Copyright (c) 2015 Amarnath Ravikumar

Original code from the [Mojolicious](http://mojolicio.us/perldoc/Mojolicious) project - Copyright (C) 2008-2015, Sebastian Riedel.

[Artistic License 2.0](http://opensource.org/licenses/Artistic-2.0)
