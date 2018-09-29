var reader;

var BufferLoader = function(sources) {
  this.buffers = {};
  this.context = null;
  this.buffer = null;
  this.init();
};

BufferLoader.prototype.init = function() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  this.context = new AudioContext();
};

BufferLoader.prototype.onBufferLoad = function(bufferName, srcBuffer, callback) {
  this.context.decodeAudioData(srcBuffer, function onSuccess(buffer) {
    this.buffers[bufferName] = buffer;

    if (typeof callback === 'function') {
      callback();
    }

  }.bind(this), this.onBufferError);
};

BufferLoader.prototype._playBuffer = function(name, gain, time) {
  var source = this.context.createBufferSource();
  source.buffer = this.buffer;

  var analyser = this.context.createAnalyser();
  
  source.connect(analyser);
  source.connect(this.context.destination);
  source.start(time);
};

BufferLoader.prototype.load = function(bufferName, file, callback) {
  reader = new FileReader();

  reader.onload = function(data) {
    if (data.target && data.target.result) {
      this.onBufferLoad(bufferName, data.target.result, callback);
    } else {
      console.dir(data);
    }
  }.bind(this);

  reader.readAsArrayBuffer(file);
};
