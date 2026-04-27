var browserSync = require('browser-sync');
var config      = require('../config').browserSync;

function browserSyncTask(done) {
  browserSync.init(config, done);
}

module.exports = browserSyncTask;