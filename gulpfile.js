/**
 * Package Dependencies
 */
var concat = require('gulp-concat')
  , del = require('del')
  , header = require('gulp-header')
  , gulp = require('gulp')
  , templateCache = require('gulp-angular-templatecache')
  , rename = require('gulp-rename')
  , uglifyjs = require('gulp-uglifyjs')
  , uglifycss = require('gulp-uglifycss')
  , util = require('util')
  , eslint = require('gulp-eslint')
  , webpack = require('webpack')
  , webpackStream = require('webpack-stream')
  , webpackConfig = require('./webpack.production.config.js');

/**
 * Local Dependencies
 */
var pkg = require('./package.json');
var banner = ['/**'
  , ' * # <%= pkg.name %>'
  , ' * ## <%= pkg.description %>'
  , ' *'
  , ' * @version v<%= pkg.version %>'
  , ' * @link <%= pkg.repository.url %>'
  , ' * @license <%= pkg.license %>'
  , ' * @author <%= pkg.author %>'
  , ' */'
  , ''
  , ''].join('\n');

gulp.task('build', ['uglifyjs', 'uglifycss']);
gulp.task('default', ['build']);


gulp.task('clean', function(done) {
  del(['./dist'], done);
});


gulp.task('concatjs', [ 'clean', 'templatecache' ], function() {
  return gulp.src(['./src/module.js', './src/directives/*.js', './src/services/*.js', './src/tmpl/ElasticBuilderTemplates.js'])
    .pipe(webpackStream(webpackConfig), webpack)
    .pipe(concat(util.format('%s.js', 'angular-elastic-builder')))
    .pipe(gulp.dest('./dist'));
});


gulp.task('concatcss', [ 'clean' ], function() {
  return gulp.src('./src/styles/main.css')
    .pipe(concat(util.format('%s.css', 'angular-elastic-builder')))
    .pipe(gulp.dest('./dist'));
});

gulp.task('header', [ 'concatjs', 'concatcss'], function() {
  return gulp.src(['./dist/*.js', './dist/*.css'])
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('uglifyjs', [ 'header' ], function() {
  return gulp.src('./dist/*.js')
    .pipe(uglifyjs())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('uglifycss', [ 'header' ], function() {
  return gulp.src('./dist/*.css')
    .pipe(uglifycss())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('templatecache', [  ], function() {
  var TEMPLATE_HEADER = '(function(angular) {"use strict"; angular.module("<%= module %>"<%= standalone %>).run(["$templateCache", function($templateCache) {'
    , TEMPLATE_FOOTER = '}]);})(window.angular);';

  return gulp.src('src/tmpl/**/*.html')
    .pipe(templateCache({
      root: 'angular-elastic-builder',
      module: 'angular-elastic-builder',
      templateHeader: TEMPLATE_HEADER,
      templateFooter: TEMPLATE_FOOTER,
    }))
    .pipe(rename('ElasticBuilderTemplates.js'))
    .pipe(gulp.dest('src/tmpl'));
});

gulp.task('lint', function() {
  return gulp.src([
      'src/**/**.js',
      '!src/tmpl/ElasticBuilderTemplates.js',
    ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('watch', [ 'templatecache', 'build' ], function() {
  gulp.watch('src/tmpl/**/*.html', [ 'templatecache', 'build' ]);
  gulp.watch('src/styles/*.css', [ 'build' ]);
  gulp.watch(['src/**/**.js','!src/tmpl/ElasticBuilderTemplates.js'], [ 'build' ]);
});

