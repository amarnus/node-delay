# node-delay

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
        throw new Error('Intentional error');
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

### .next( ... )

Returns a function that can be called once a single asynchronous operation in a given step is complete. When the function is called, the arguments passed will be sent to the next step.

### .pass( ... )

Sends data synchronously to the next step.

## Events

The `Delay` function inherits from the `EventEmitter` and emits the following custom events.

### finish

Emitted once all the steps have been completed. The set of arguments from the last step is sent as the payload.

### error

Emitted either when there was a custom error sent by one of the asynchronous operations in a step or there was an exception thrown. Once the error event is emitted from one of the steps, the rest of the steps in the chain will not be executed.

## License

Original code from the [Mojolicious](http://mojolicio.us/perldoc/Mojolicious) project - Copyright (C) 2008-2015, Sebastian Riedel.

[Artistic License 2.0](http://opensource.org/licenses/Artistic-2.0)
