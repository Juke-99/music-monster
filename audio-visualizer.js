window.onload = function() {
  new Monster().init();
}

var Monster = function() {
  this.source = null;
  this.animationId = null;
  this.file = null;
  this.url = null;
  this.analyzer = null;
  this.audioContext = null;
  this.buffer = null;
  this.status = 0;
  this.running = false;
  this.paused = false;
  this.startOffset = 0;
  this.startTime = 0;
}

Monster.prototype = {
  init() {
    this.settingAPI();
    this.addEventListener();
  },
  settingAPI() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
    window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
    window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;

    try {
        this.audioContext = new AudioContext();
    } catch (e) {
        console.log(e);
    }
  },
  addEventListener() {
    var that = this;
    var audioInput = document.getElementById('file');
    var pause = document.getElementById('pause');

    audioInput.onchange = function() {
      if (that.audioContext === null) { return; }

      that.file = audioInput.files[0];

      if(that.status === 1) {
        that.running = true;
      }

      that.start();
    }

    pause.onclick = function() {
      if(!that.paused) {
        that.paused = true;
        that.pause();
      } else if(!that.running) {
        that.paused = false;
        that.visualize(that.audioContext, that.buffer);
      }
    }
  },
  start() {
    var file = this.file;
    var fileReader = new FileReader();
    var userAgent = window.navigator.userAgent.toLowerCase();

    fileReader.onload = e => {
      var that = this;
      var fileResult = e.target.result;
      var audioContext = that.audioContext;
      that.url = this.file.urn || this.file.name;
      this.startOffset = 0;
      this.startTime = 0;
      this.paused = false;
      that.audioInfo(that.url);

      if(audioContext === null) { return; };

      if(userAgent.indexOf('safari') != -1) {
        audioContext.decodeAudioData(fileResult, (buffer) => {
          that.buffer = buffer;
          that.visualize(audioContext, buffer);
        }, e => {
          console.log(e);
        });
      } else {
        audioContext.decodeAudioData(fileResult).then(buffer => {
          that.buffer = buffer;
          that.visualize(audioContext, buffer);
        }, e => {
          console.log(e);
        });
      }
    };

    fileReader.readAsArrayBuffer(file);
  },
  visualize(audioContext, buffer) {
    var that = this;

    this.audioContext = audioContext;
    this.startTime = audioContext.currentTime;

    var audioBufferSouceNode = audioContext.createBufferSource();
    var analyser = audioContext.createAnalyser();

    audioBufferSouceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    audioBufferSouceNode.buffer = buffer;

    if (!audioBufferSouceNode.start) {
      audioBufferSouceNode.start = audioBufferSouceNode.noteOn;
      audioBufferSouceNode.stop = audioBufferSouceNode.noteOff;
    }

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.source !== null) {
      this.source.stop(0);
    }

    //audioBufferSouceNode.start(0);
    audioBufferSouceNode.start(0, this.startOffset % buffer.duration);
    this.status = 1;
    this.source = audioBufferSouceNode;

    audioBufferSouceNode.onended = function() {
      that.end(that);
    }

    //source.connect(secondContext.destination);  <-- 音割れの原因

    this.render(analyser);
  },
  pause() {
    this.source.stop();
    cancelAnimationFrame(this.animationId);
    this.startOffset += this.audioContext.currentTime - this.startTime;
  },
  audioInfo(url) {
    var that = this;
    ID3.loadTags(url, () => {
      var tags = ID3.getAllTags(that.url);
      var base64String = "";
      var imgURL = "";

      if(!(typeof tags.picture === 'undefined')) {
        for(var i = 0; i < tags.picture.data.length; i++) {
          base64String += String.fromCharCode(tags.picture.data[i]);
        }

        imgURL = 'data:' + tags.picture.format + ';base64,' + window.btoa(base64String);
      }

      $("#title").html(tags.title);
      $("#title").css("visibility", "visible");
      $("#artist").html(tags.artist);
      $("#artist").css("visibility", "visible");
      $("#album").html(tags.album);
      $("#album").css("visibility", "visible");
      $("#picture img").attr('src', imgURL);
      $("#picture").css("visibility", "visible");

      ID3.clearTags(that.url);
    },
    {
      tags: ["title", "artist", "album", "picture"],
      dataReader: ID3.FileAPIReader(that.file)
    });
  },
  render(analyser) {
    var that = this;
    var canvas = document.getElementById('visualizer');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var canvasContext = canvas.getContext('2d');
    canvasContext.canvas.width = window.innerWidth;
    canvasContext.canvas.height = window.innerHeight;

    var render = () => {
      var spectrums = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(spectrums);

      if(that.status === 0) {
          cancelAnimationFrame(that.animationId);
          return;
      }

      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      that.drawBars(canvas, canvasContext, spectrums);
  　
      that.animationId = requestAnimationFrame(render);
    }

    this.animationId = requestAnimationFrame(render);
    window.addEventListener('resize', this.onWindowResize(canvasContext), false);
  },
  drawBars(canvas, canvasContext, array) {
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
  },
  onWindowResize(canvasContext) {
    canvasContext.canvas.width = window.innerWidth;
    canvasContext.canvas.height = window.innerHeight;
  },
  end(instance) {
    if(this.running) {
      this.running = false;
      this.status = 1;
      this.startOffset = 0;
      this.startTime = 0;
      this.paused = false;
      return;
    }

    this.status = 0;
  }
}
