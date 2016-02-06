var serial;      // the serial connection
var val = 0;     // the last received value (bpm)
var movAvg = 0;  // exponentially weighted moving average of bpms
var alph = 0.8;  // decay for the moving average, alph < 1
var low = false; // if the user is in the low heart rate range or not
var changedRecently = false;

// for logging to the extension's background page
// see chrome://extensions
var bkg = chrome.extension.getBackgroundPage();

var highArousalSites = [
  "https://youtu.be/mGMzGxeO1wQ",
  "https://vimeo.com/142370838",
  "https://www.youtube.com/watch?v=8AHgBX4VO_M",
  "https://www.youtube.com/watch?v=cMqmPnLvuvA",
  "https://www.youtube.com/watch?v=sN-n03C28Po",
  "https://www.youtube.com/watch?v=3tjoqhx_dwk",
  "https://www.irs.gov/Affordable-Care-Act/Individuals-and-Families/Affordable-Care-Act--What-to-Expect-when-Filing-Your-2015-Tax-Return",
  "http://www.timeout.com/newyork/blog/map-of-average-rent-by-nyc-neighborhood-is-as-depressing-as-youd-expect-082115",
  "http://www.cnbc.com/2016/02/05/citi-world-economy-trapped-in-death-spiral.html"
];
var lowArousalSites = [
  "http://www.lookingatsomething.com/",
  "http://www.calm.com/",
  "http://www.donothingfor2minutes.com/",
  "http://www.deepthoughtsbyjackhandey.com/category/deepthoughts/",
  "https://www.youtube.com/watch?v=kZr8sR9Gwag"
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
  return alph*(v - movAvg)
}

function setup() {
  serial = new p5.SerialPort();

  // arduino serial port, `dmesg` can you help you find it
  // serial.open("/dev/cu.usbmodem1421");
  serial.open("/dev/ttyACM0");

  // callback
  serial.onData(gotData);

  // every 20s, load a new site if the user is stuck in a arousal level
  setInterval(function() {
    if (!changedRecently) {
      if (low) {
        arouse();
      } else {
        derouse();
      }
    }
    changedRecently = false;
  }, 20000);
}

function gotData() {
  // read out data from serial
  var data = serial.readLine();
  if (!data) return;

  // we only care about BPM
  if (data.charAt(0) === 'B') {
    val = Number(data.substring(1));
    if (movAvg === 0) {
      movAvg = val;
    } else {
      var update = ewma(val);
      movAvg += update;
    }

    // relaxed, un-relax them
    if (movAvg <= 85 && !low) {
      low = true;
      changedRecently = true;
      arouse();

    // excited, un-excite them
    } else if (movAvg >= 90 && low) {
      changedRecently = true;
      low = false;
      derouse();
    }
    bkg.console.log(movAvg);
  }
}

function derouse() {
      var url = lowArousalSites[Math.floor(Math.random() * lowArousalSites.length)];
      redirect(url);
}

function arouse() {
    var url = highArousalSites[Math.floor(Math.random() * highArousalSites.length)];
    redirect(url);
}

setup();
