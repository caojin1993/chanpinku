var gulp = require('gulp');
var vm = require('./gulp-vm.js');
var connect = require('gulp-connect');
var clean = require('gulp-clean');
var browserify = require('browserify');
var through2 = require('through2');
var babelify = require('babelify');
var replace = require('gulp-replace');
var gulpSequence = require('gulp-sequence');
var stylus = require('gulp-stylus');
var releasePath = 'http://223.202.31.49:8180/repository';

//页面入口在staticpage文件夹下
//页面上的公共模块在vm文件夹下(可以不用，但注意不要使用vm作为html标签的属性)
//每个vm包含html js css
//vm引用方式，在page的html的标签里引用属性vm = "[文件夹名]"
//如vm叫product-lib-nav,则引用标签<div vm = "product-lib-nav"></div>
//标签可以带属性，用于覆盖vm原本的css
//vm的html会自动添加到引用标签内，各个vm的css会合并然后以<link href="static/css/vm-[页面名].css">的方式自动添加到
//html文件的head里,js可以通过es6的模块或commonjs的模块方式引用到各自入口页面里，入口页面见下面的packJS任务
//如果页面内没有含vm属性的标签，则不会添加以上css,js,html
//除此之外，各个页面自己决定自己引用哪些js和css
gulp.task('loadVM',function(){
  console.log('loadVM')
  return gulp.src('src/staticpage/*.html')
  .pipe(vm())
  .pipe(gulp.dest('dist/staticpage'))
});
//写在jsportal下的js会用此方法打包，支持es6模块和commonjs模块，理论上一个页面只需一个入口js，命名和页面名一致
gulp.task('packJS', function() {
  return gulp.src('./src/jsportal/*.js')
    .pipe(through2.obj(function(file, enc, next) {
      browserify(file.path)
        .transform(babelify,{presets:['es2015','stage-1']})
        .bundle(function(err, res) {
          if(err){
            console.log(err.stack);
            console.log('packJS fail')
            file.contents = new Buffer('');
            next(null, file);
          }else{
            console.log('packJS ok')
            file.contents = res;
            next(null, file);
          }
        });
    }))
    .pipe(gulp.dest('./dist/static/js'))
});
gulp.task('buildCSS',function(){

  return gulp.src('./dist/static/stylus/**/*.styl')
    .pipe(stylus())
    .pipe(gulp.dest('./dist/static/css/'))
})


gulp.task('connect',function () {
	connect.server({
		root:'dist',
		port:"8003",
		liverload:true
	})
});
gulp.task('watch',function () {
	gulp.watch(["./src/staticpage/*","./src/vm/*/*.*"],['loadVM']);
  gulp.watch(["./src/**/*.js"],['packJS']);
  gulp.watch(["./dist/static/base-stylus/**/*.styl","./dist/static/stylus/**/*.styl"],['buildCSS']);
})
//gulp.task('default',['packJS','loadVM','connect','watch']);
gulp.task('default',gulpSequence('buildCSS','packJS','loadVM','connect','watch'));
//上线用gulp.release
//1.清空release文件夹内除font-awesome的部分
//2.将dist/static/css文件夹移动到release/static/css文件夹
//3.将dist/static/js文件夹替换域名路径到ip路径，然后复制到release/statc/js
//4.将dist/staticpage文件夹替换域名路径到ip路径，然后复制到release/staticpage
gulp.task('clean-release',function(){
  return gulp.src('./release/*')
  .pipe(clean({read:false,force:true}))
});
gulp.task('copyCSS',function(){
  return gulp.src('./dist/static/css/**/*')
  .pipe(gulp.dest('./release/static/css'));
})
//'./dist/static/js/*'代表js目录下的所有文件，'./dist/static/js'代表js目录，但是不处理下面的文件，注意
gulp.task('replaceJS',function(){
  return gulp.src('./dist/static/js/**/*.js')
  .pipe(replace(/http:\/\/[a-zA-Z\.]*jjrb\.cn/g,releasePath))
  .pipe(gulp.dest('./release/static/js'))
})
gulp.task('copyJSElse',function(){
  return gulp.src(['./dist/static/js/**/*','!./dist/static/js/**/*.js'])
  .pipe(gulp.dest('./release/static/js'))
})
gulp.task('replaceHTML',function(){
  return gulp.src('./dist/staticpage/**/*.html')
  .pipe(replace(/http:\/\/[a-zA-Z\.]*jjrb\.cn/g,releasePath))
  .pipe(gulp.dest('./release/staticpage'))
})
gulp.task('release',gulpSequence('clean-release',['packJS','loadVM','copyCSS','copyJSElse','replaceJS','replaceHTML']));
