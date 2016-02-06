var serial;      // the serial connection
var val = 0;     // the last received value (time b/w pulses)
var movAvg = 0;  // exponentially weighted moving average of time b/w pulses
var alpha = 0.8; // decay for the moving average, alpha < 1

// for logging to the extension's background page
// see chrome://extensions
var bkg = chrome.extension.getBackgroundPage();

var highArousalSites = [
  "https://google.com"
];
var lowArousalSites = [
  "https://google.com"
];

// redirects the current tab to the specified url
function redirect(url) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    chrome.tabs.update(tab.id, {url: url});
  });
}

// computes the exponentially weighted moving average update
function ewma(v) {
  return alpha*(v - movAvg)
}

function setup() {
  serial = new p5.SerialPort();

  // arduino serial port, `dmesg` can you help you find it
  // serial.open("/dev/cu.usbmodem1421");
  serial.open("/dev/ttyACM0");
  serial.onList(gotList);
  bkg.console.log(serial);

  // callback
  serial.onData(gotData);
}

function gotData() {
  // read out data from serial
  var data = serial.readLine();
  if (!data) return;

  bkg.console.log(data);
  if (data.length > 0); {
    // coerce data to a smaller number
    val = Number(data) / 10;
  }
}

setup();

while (true) {
  // check val
  //bkg.console.log(val);
  //var update = ewma(val);
  //if (Math.abs(update) < 0.1) {
    //// do something
    ////document.getElementById('browser').src = highArousalSites[Math.floor(Math.random() * sites.length)];
  //}
  //movAvg += update;
  //bkg.console.log(movAvg);
}
function gotList(thelist) {
  println("List of Serial Ports:");
  // theList is an array of their names
  for (var i = 0; i < thelist.length; i++) {
    // Display in the console
    println(i + " " + thelist[i]);
  }
}
