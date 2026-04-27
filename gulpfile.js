/*
  gulpfile.js
  ===========
  Gulp 4 compatible entry point.
  Each task in gulp/tasks/ exports a function.
  This file imports them via require-dir and composes
  the task graph using gulp.series / gulp.parallel.
*/

var gulp = require('gulp');
var requireDir = require('require-dir');

// Require all tasks in gulp/tasks — each file exports a function
var tasks = requireDir('./gulp/tasks', { recurse: true });

// ── Register individual tasks ──────────────────────────────
gulp.task('setWatch', tasks.setWatch);
gulp.task('markup', tasks.markup);
gulp.task('browserify', tasks.browserify);

// ── Composite tasks (Gulp 4 series / parallel) ─────────────

// build = browserify + markup in parallel
gulp.task('build', gulp.parallel('browserify', 'markup'));

// browserSync = build first, then launch server
gulp.task('browserSync', gulp.series('build', tasks.browserSync));

// watch = set flag → browserSync → watch markup for changes
gulp.task('watch', gulp.series(
    'setWatch',
    'browserSync',
    function watchMarkup() {
        var config = require('./gulp/config').markup;
        gulp.watch(config.src, gulp.series('markup'));
    }
));

// ── Default task ───────────────────────────────────────────
gulp.task('default', gulp.series('watch'));