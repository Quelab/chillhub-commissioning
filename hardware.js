var Gpio = require('onoff').Gpio;
var button = new Gpio(17, 'in', 'both', 100);
var led = new Gpio(18, 'out');

var BLINK_RATE = 500;
var LONG_PRESS_MILLISECONDS = 5000;
var BUTTON_PRESSED = 0;

module.exports = function() {
  var flash_timer = null;
  var pressed = 0;

  function led_flash() {
    if (!flash_timer) {
      led.writeSync(1);

      flash_timer = setInterval(function() {
        led.writeSync(led.readSync() ? 0 : 1);
      }, BLINK_RATE);
    }
  }

  function led_off() {
    clearInterval(flash_timer);
    flash_timer = null;
    led.writeSync(0);
  }
  
  function led_on() {
    clearInterval(flash_timer);
    flash_timer = null;
    led.writeSync(1);
  }

  function listen(callback) {
    function press_start() {
      pressed = Date.now();
    }

    function press_stop() {
      if (pressed) {
        if ((Date.now() - pressed) < LONG_PRESS_MILLISECONDS) {
          callback(null, 'BUTTON_PRESS_SHORT');
        }
        else {
          callback(null, 'BUTTON_PRESS_LONG');
        }
      }
    }

    function on_press(e, value) {
      if (e) return callback(e);

      if (value == BUTTON_PRESSED) {
        press_start();
      }
      else {
        press_stop();
      }
    }

    button.read(on_press);
    button.watch(on_press);
  }

  led_off();

  return {
    ledFlash: led_flash,
    ledOn: led_on,
    ledOff: led_off,
    listen: listen
  };
};
