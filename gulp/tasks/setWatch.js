function setWatch(done) {
  global.isWatching = true;
  done();
}

module.exports = setWatch;