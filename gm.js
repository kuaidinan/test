var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});
var path = require('path')
// const gm = require('gm')
// resize and remove EXIF profile data
gm(path.join(__dirname,'path','test2.jpg'))
.resize(240, 240)
.write(path.join(__dirname,'path','resize.jpg'), function (err) {

  console.log('err',err)
  if (!err) console.log('done');
});