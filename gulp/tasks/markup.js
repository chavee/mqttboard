var gulp = require('gulp');
var config = require('../config').markup;

function markup() {
  return gulp.src(config.src)
    .pipe(gulp.dest(config.dest));
}

module.exports = markup;