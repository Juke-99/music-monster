var minutes = 0,
    seconds = 0;
var timer;

window.onload = function(){
  var source, animationId, url;
  var audioContext = window.AudioContext ? new AudioContext() : new webkitAudioContext();
  var fileReader = new FileReader;
　
  var analyser = audioContext.createAnalyser();
  analyser.connect(audioContext.destination);
　
  var canvas = document.getElementById('visualizer');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var canvasContext = canvas.getContext('2d');
  canvasContext.canvas.width = window.innerWidth;
  canvasContext.canvas.height = window.innerHeight;

  window.addEventListener('resize', onWindowResize(canvasContext), false);
　
  document.getElementById('file').addEventListener('change', e => {
    var file = e.target.files[0];
    url = file.urn || file.name;

    fileReader.onload = () => {
      ID3.loadTags(url, () => {
        var tags = ID3.getAllTags(url);
        var base64String = "";
        var imgURL = "";

        if(typeof tags.picture == 'undefined') {

        } else {
          for(var i = 0; i < tags.picture.data.length; i++) {
            base64String += String.fromCharCode(tags.picture.data[i]);
            imgURL = 'data:' + tags.picture.format + ';base64,' + window.btoa(base64String);
          }
        }

        $("#title").html(tags.title);
        $("#title").css("visibility", "visible");
        $("#artist").html(tags.artist);
        $("#artist").css("visibility", "visible");
        $("#album").html(tags.album);
        $("#album").css("visibility", "visible");
        $("#picture img").attr('src', imgURL);
        $("#picture").css("visibility", "visible");
      },
      {
        tags: ["title", "artist", "album", "picture"],
        dataReader: ID3.FileAPIReader(file)
      });
    };

    fileReader.readAsArrayBuffer(file);
    url = URL.createObjectURL(file);

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = () => {
      audioContext.decodeAudioData(request.response, buffer => {

        if(source) {
          cancelAnimationFrame(animationId);
          source.stop();
          clearInterval(timer);
          minutes = 0;
          seconds = 0;
        }

        console.log(buffer);

        $("#duration").text(translationToMinSec(buffer.duration));
  　
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(analyser);
        source.start(0);

        runWatch(parseInt(buffer.duration / 60), Math.round(buffer.duration % 60));
  　
        animationId = requestAnimationFrame(render);
      });
    };

    request.send();
  });
　
  render = () => {
    var spectrums = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(spectrums);
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    drawBars(canvas, canvasContext, spectrums);
　
    animationId = requestAnimationFrame(render);
  };
};

function onWindowResize(canvasContext) {
  canvasContext.canvas.width = window.innerWidth;
  canvasContext.canvas.height = window.innerHeight;
}

function drawBars(canvas, canvasContext, array) {
  var threshold = 0;
  var maxBinCount = array.length;
  var space = 3;

  canvasContext.save();
  canvasContext.globalCompositeOperation = 'source-over';
  canvasContext.scale(0.5, 0.5);
  canvasContext.translate(window.innerWidth, window.innerHeight);

  var bass = Math.floor(array[1]);
  //var radius = 0.45 * $(window).width() <= 450 ? -(bass * 0.25 + 0.45 * $(window).width()) : -(bass * 0.25 + 450);  //default value
  var radius = 0.2 * $(window).width() <= 450 ? -(bass * 0.45 + 0.2 * $(window).width()) : -(bass * 0.45 + 450);
  var bar_length_factor = 1;

  if($(window).width() >= 785) {
    bar_length_factor = 1.0;
  } else if($(window).width() < 785) {
    bar_length_factor = 1.5;
  } else if($(window).width() < 500) {
    bar_length_factor = 20.0;
  }

  for(var i = 0; i < maxBinCount; i++) {
    var value = array[i];

    if (value >= threshold) {
      //canvasContext.fillStyle = 'rgb(' + array[i] % 200 + ', 250, ' + array[i] % 120 + ')';
      canvasContext.fillStyle = 'rgb(' + array[i] % 20 + ',' + array[i] % 240 + ', ' + array[i] % 40 + ')';
      canvasContext.fillRect(0, radius, $(window).width() <= 450 ? 2 : 3, -value / (bar_length_factor * 2));
      canvasContext.rotate((180 / 128) * Math.PI / 180);
    }
  }

  for(var i = 0; i < maxBinCount; i++) {
    var value = array[i];

    if(value >= threshold) {
      canvasContext.fillStyle = 'rgb(' + array[i] % 40 + ',' + array[i] % 250 + ', ' + array[i] % 40 + ')';
      canvasContext.rotate(-(180 / 128) * Math.PI / 180);
      canvasContext.fillRect(0, radius, $(window).width() <= 450 ? 2 : 3, -value / bar_length_factor);
    }
  }

  for(var i = 0; i < maxBinCount; i++) {
    var value = array[i];

    if (value >= threshold) {
      canvasContext.fillStyle = 'rgb(' + array[i] % 24 + ', ' + array[i] % 255 + ', ' + array[i] % 60 + ')';
      canvasContext.rotate((180 / 128) * Math.PI / 180);
      canvasContext.fillRect(0, radius, $(window).width() <= 450 ? 2 : 3, -value / bar_length_factor);
    }
  }

  canvasContext.restore();
}

function progressBar(currentMinutes, currentSeconds, endMinutes, endSeconds) {
  var progressBarLength = (translationToTime(currentMinutes, currentSeconds) / translationToTime(endMinutes, endSeconds)) * 100;

  $("#current_bar").css("width", progressBarLength + "%");
}

function translationToMinSec(time) {
  var sec = Math.round(time % 60);
  var min = parseInt(time / 60);

  if(sec < 10) {
    sec = '0' + sec;
  }

  return min + ":" + sec;
}

function translationToTime(min, sec) {
  return (min * 60) + sec;
}

function runWatch(endMinutes, endSeconds) {

  timer = setInterval(() => {

    if(minutes == endMinutes && seconds == endSeconds) {
      clearInterval(timer);
    } else {
      seconds++;

      if(seconds < 60) {

      } else {
        seconds = 0;
        minutes++;
      }
    }

    setWatch(minutes, seconds, endMinutes, endSeconds);
  }, 1000);
}

function setWatch(minutes, seconds, endMinutes, endSeconds) {
  var strSeconds = seconds;

  if(seconds < 10) {
    strSeconds = "0" + seconds;
  }

  $("#current_time").text(minutes + ":" + strSeconds);

  progressBar(minutes, seconds, endMinutes, endSeconds);
}
