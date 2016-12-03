const gulp    = require('gulp');
const mocha   = require('gulp-mocha');
const uglify  = require('gulp-uglifyjs');
const concat  = require('gulp-concat');
const exit    = require('gulp-exit');
const ejsmin  = require('gulp-ejsmin');
const babel   = require('gulp-babel');
const gutil   = require('gulp-util');
const through = require('through2')

gulp.task('minify-ejs-pages', () => {

  return gulp.src('views/pages/*.ejs')
    .pipe(ejsmin())
    .pipe(gulp.dest('.viewsMin/pages'))
});

gulp.task('minify-ejs-snippets', () => {
  return gulp.src('views/snippets/*.ejs')
    .pipe(ejsmin())
    .pipe(gulp.dest('.viewsMin/snippets'))
});

gulp.task('specnyan', ['default', 'testEnv'], () => {
  return gulp.src('spec/deadbird.js', {read: false})
    .pipe(mocha({require: ['mocha-clean'], reporter: 'nyan'}))
    .pipe(exit());
});

gulp.task('spec', ['default', 'testEnv'], () => {
  return gulp.src('spec/deadbird.js', {read: false})
    .pipe(mocha({require: ['mocha-clean'], reporter: 'spec'}))
    .pipe(exit());
});

gulp.task('es6toes5', () => {
  return gulp.src('src/js/*.js')
    .pipe(babel({
      presets: ["es2015-without-strict"]
    }).on('error', console.log))
    .pipe(gulp.dest('public/js'))
});

gulp.task('default', ['minify-ejs-pages', 'minify-ejs-snippets', 'es6toes5']);
