'use strict';

var gulp 				= require('gulp');
var tape        = require('gulp-tape');
var typescript  = require('gulp-typescript');
var concat 			= require('gulp-concat');
var uglify 			= require('gulp-uglify');
var replace     = require('gulp-replace');
var del 				= require('del');
var browserify  = require('browserify');
var source 			= require('vinyl-source-stream');
var prettyify   = require('tap-spec');
var merge       = require('merge2');
var through     = require('through2');

// Import dependencies from package definition
var packageJson = require('./package.json');
var dependencies = Object.keys(packageJson && packageJson.dependencies || {});

function handleErrors(err) {
	console.log(err);
}

gulp.task('cleaning', function() {
  // You can use multiple globbing patterns as you would with `gulp.src`
  return del(['build']);
});

gulp.task('typescript compilation', ['cleaning'], function() {
	var tsResult = gulp.src(['src/**/*.ts'])
	.pipe(typescript({
		target: 'ES5',
    module: 'None',
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    declaration: true
	}));

  return merge([
    tsResult.dts.pipe(gulp.dest('build/types')),
    tsResult.js.pipe(gulp.dest('build'))
  ]);
});

gulp.task('minify all', ['bundle required', 'bundle core'], function () {
	gulp.src(['build/rocketcharts.js'])
	.pipe(uglify())
	.pipe(concat('rocketcharts.min.js'))
	.pipe(gulp.dest('build'));

	return gulp.src(['build/required.js'])
	.pipe(uglify())
	.pipe(concat('required.min.js'))
	.pipe(gulp.dest('build'));
});

gulp.task('default', [
  'cleaning',  
  'typescript compilation' /*,
  'minify all' */
]);