var serial;      // the serial connection
var val = 0;     // the last received value (bpm)
var movAvg = 0;  // exponentially weighted moving average of bpms
var alph = 0.8;  // decay for the moving average, alph < 1
var low = false; // if the user is in the low heart rate range or not
var changedRecently = false;
var calibrating = true;
var baseBpm;

// for logging to the extension's background page
// see chrome://extensions
var bkg = chrome.extension.getBackgroundPage();

var highArousalSites = [
  "https://youtu.be/mGMzGxeO1wQ?t=15",
  "https://www.youtube.com/watch?v=8AHgBX4VO_M",
  "https://www.youtube.com/watch?v=cMqmPnLvuvA",
  "https://www.youtube.com/watch?v=3tjoqhx_dwk",
  "https://www.irs.gov/Affordable-Care-Act/Individuals-and-Families/Affordable-Care-Act--What-to-Expect-when-Filing-Your-2015-Tax-Return",
  "http://www.timeout.com/newyork/blog/map-of-average-rent-by-nyc-neighborhood-is-as-depressing-as-youd-expect-082115",
  "http://www.cnbc.com/2016/02/05/citi-world-economy-trapped-in-death-spiral.html",
  "http://companiesmobilizingcustomers.tumblr.com/post/131664566292/airbnb-ad-campaign-as-part-of-8m-campaign",
  "http://saddesklunch.com/image/131102057774",
  "https://youtu.be/PvbL_5rH1QQ?t=185",
  "https://youtu.be/5IXQ6f6eMxQ?t=7",
  "https://www.youtube.com/watch?v=NP7hfYunoeU",
  "https://youtu.be/R1uHk7Z6z24?t=30",
  "https://youtu.be/gLDYtH1RH-U?t=167",
  "https://www.youtube.com/watch?v=nqQh60V48WI",
  "https://www.youtube.com/watch?v=Orlbo9WkZ2E",
  "https://www.youtube.com/watch?v=pPaEdvCs1C8",
  "https://youtu.be/6ITD1tqXDII",
  "https://youtu.be/74BzSTQCl_c?t=9",
  "https://www.youtube.com/watch?v=YVEY24ieq08",
  "https://youtu.be/MRPK1rBl_rI?t=13"
];
var lowArousalSites = [
  "http://www.lookingatsomething.com/",
  "http://www.calm.com/",
  "http://www.donothingfor2minutes.com/",
  "http://www.deepthoughtsbyjackhandey.com/category/deepthoughts/",
  "https://www.youtube.com/watch?v=kZr8sR9Gwag",
  "http://www.nytimes.com/2016/02/06/science/in-a-slovenian-cave-hoping-for-a-batch-of-baby-dragons.html?contentCollection=weekendreads&action=click&pgtype=Homepage&clickSource=image&module=c-column-middle-span-region&region=c-column-middle-span-region&WT.nav=c-column-middle-span-region&_r=0",
  "http://images.realclear.com/290459_5_.jpg",
  "https://youtu.be/XZmdzfvXRuw?t=1419",
  "https://youtu.be/D-UmfqFjpl0?t=25",
  "http://www.barcinski-jeanjean.com/entries/line3d/",
  "http://www.fallingfalling.com/",
  "http://spielzeugz.de/html5/liquid-particles.html",
  "https://youtu.be/oKXVmzod-TE?t=34",
  "http://45.media.tumblr.com/0777294e5cb89a26372d815b3cf79adf/tumblr_o0jhwwAgbQ1qzw1qyo1_540.gif",
  "http://49.media.tumblr.com/a76d8f41afd6f2bb78c1cebbb03d1bcb/tumblr_nsix0i3wCZ1qzw1qyo1_540.gif",
  "http://49.media.tumblr.com/c1d54d06da841f3c943783e95c45073b/tumblr_nao0z4k3zO1qzw1qyo1_500.gif",
  "http://45.media.tumblr.com/7ed2dab49586c00956a0bb491d1b5538/tumblr_mlnzx84Ur21qzw1qyo1_500.gif",
  "http://49.media.tumblr.com/a31cf073e7507ed79617aabab9c291c2/tumblr_mjpuzqHPYU1qzw1qyo1_500.gif",
  "http://45.media.tumblr.com/99a6e3947ce261ed69bb1718c06bed6e/tumblr_mh94l03PX11qzw1qyo1_500.gif",
  "http://49.media.tumblr.com/34d0f835a1841bcb01e38c6f1a7e4ae4/tumblr_mgwafqL33c1qzw1qyo1_500.gif",
  "https://www.google.com/search?q=monochrome&espv=2&biw=1259&bih=701&source=lnms&tbm=isch&sa=X&ved=0ahUKEwiBi5KYi-TKAhULej4KHTwkBbkQ_AUIBigB#tbm=isch&q=blue",
  "https://www.youtube.com/watch?v=11p0y9z1XOU",
  "http://www.infinitecat.com/infinite/cat6.html",
  "https://youtu.be/5Tjk3DUgUnY?list=PL-EaWclDbxgGwOtU0qdCa2v766NiavkKt&t=92",
  "https://youtu.be/wyxS9RU0lMQ?list=PL-EaWclDbxgGwOtU0qdCa2v766NiavkKt&t=41",
  "http://calmingmanatee.com/22",
  "https://www.youtube.com/watch?v=b3Qlu-vXMZg",
  "https://youtu.be/8B1rXxwX-2E?t=25"
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

  // calibrate for 5s
  setTimeout(function() {
    baseBpm = movAvg;
    calibrating = false;
    bkg.console.log("Done calibrating: " + baseBpm);
  }, 5000);
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

    if (!calibrating) {
      // relaxed, un-relax them
      if (movAvg <= baseBpm - 5 && !low) {
        low = true;
        changedRecently = true;
        arouse();

      // excited, un-excite them
      } else if (movAvg >= baseBpm + 5 && low) {
        changedRecently = true;
        low = false;
        derouse();
      }
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
