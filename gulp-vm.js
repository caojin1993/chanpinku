//gulp插件
//gulp使用pipe处理文件流，因此一个插件就是截获流，处理，然后返回
//参考：http://www.tuicool.com/articles/NrYJVv
var gutil = require('gulp-util');
var through = require('through2');
var gulp = require('gulp');
var path = require('path');
//vm,加载组件
module.exports = function vm (options){
  return through.obj(function(file,enc,cb){
    //console.log(enc);//utf8
    //每个文件执行一次,因此不必考虑处理多个文件
    if(file.isNull()){
      this.push(file);
      return cb();
    }
    if (file.isStream()) {
         this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
         return cb();
    }
    /***上面都是样板代码**/
    var _this = this;
    content = _process(file,function(result){
      file.contents = new Buffer(result);
      /***下面都是样板代码**/
      _this.push(file);
      cb();
    });
  })
}
function _process(file,cb){
  //console.log('_process');
  var filename = path.parse(file.path).base;
  console.log('验证文件名，不包括路径',filename);
  var content = file.contents.toString();
  //console.log(content);
  //vm不支持嵌套
  //1.找到有vm属性的标签如<div vm = "product-lib-nav"><div>,拆分html为数组
  var vmReg = /<[a-zA-Z]*\s[^>]*vm\s*=\s*("|')[a-zA-Z-]*("|')[^>]*>/g;
  var vmNameReg = /vm\s*=\s*("|')[a-zA-Z-]*("|')/g;
  //console.log('parse start');
  var vmLabels = content.match(vmReg);
  var vms ={};
  console.log(vmLabels)
  if(vmLabels===null){
    cb(content);
    return content;
  }
  //null没有forEach,但还不报错
  vmLabels.forEach(function(vml){
    var vmName = vml.match(vmNameReg)[0].split(/("|')/)[2];
    if(vms[vmName]===undefined)vms[vmName] = {};
  })
  //console.log('------vms------',vms);

  var qs = [];
  Object.keys(vms).forEach(function(vmName){
    qs.push(new Promise(function(resolve,reject){
      gulp.src(['src/vm/'+vmName+'/index.html','src/vm/'+vmName+'/index.css']).on('data',function(file){
          var exs = file.path.split('.');
          var ex = exs[exs.length-1];
          //console.log(ex,file.path,file.contents.toString())//toString把buffer转成普通字符串
          vms[vmName][ex] = file.contents.toString();
          var vm = vms[vmName];
          if(vm.css!==undefined&&vm.html!==undefined)resolve();
      })
    }))
  })

  Promise.all(qs).then(function(result){
    //替换html
    content = content.replace(vmReg,function(vmLabel){
      var vmName = vmLabel.match(vmNameReg)[0].split(/("|')/)[2];
      //console.log(vmName);
      return vmLabel + '\r\n\t\t' + vms[vmName].html + '\r\n'
    });
    var vmcss = [];
    Object.keys(vms).forEach(function(vmName){
      vmcss.push(vms[vmName].css);
    })
    var cssname = 'vm-'+filename.replace('html','css');
    content = content.replace(/<\/head>/,'\t<link rel="stylesheet" href="../static/css/'+cssname+'"/>\r\n</head>');
    //console.log(content);
    var _qs = [];
    _qs.push(createFile(vmcss.join('\r\n/*---divider by gulp-vm---*/\r\n'),cssname,'dist/static/css'));
    return Promise.all(_qs);
  },function(err){})

  .then(function(){
    cb(content);
    return content;
  })
}
function createFile(str,name,destPath){
  //console.log('createFile',str);
  return new Promise(function(resolve,reject){
    gulp.src('void')
    .pipe(through.obj(function(file,enc,cb){
        file.contents = new Buffer(str);
        var _ps = path.parse(file.path);
        file.path = path.join(_ps.dir,name);
        //file.path = file.path.replace('void',name);
        console.log('验证文件名和准备使用的路径',name,file.path);
        this.push(file);
        cb(null,file);
      }))
    .pipe(gulp.dest(destPath))
    .on('data',function(){
      console.log(1)
      resolve();
    })
  })
}
