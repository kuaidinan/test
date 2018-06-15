var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});
var path = require('path')
var request = require('request')

const Koa = require('koa');
const app = new Koa();
const bodyParser = require('koa-bodyparser')
app.use(bodyParser())
const route = require('koa-route');
const main = async ctx => {
    console.log('111')
    let fpath = path.join(__dirname,'path','test2.jpg')
    console.log(fpath)
    let formData = {
        test:fs.createReadStream(fpath),
        test:'111'
    };

    // request({
    //     url: 'http://192.168.8.151:8089/test',
    //     method: "POST",
    //     formData:formData,
    //     form:{
    //         test:123
    //     }
    // }, (err, response, body) => {
    //     console.log('err',err)
    //     console.log('body',body)
    //     // res.json(d);
    // })
    // request({
    //     url:'http://192.168.8.151:8089/test',
    //     method:"POST",
    //     formData:formData
    // },(err, res,body) => {
    //     console.log('body',body)
    // })

    request.post({ url: 'http://192.168.8.151:8089/test', formData: formData }, function optionalCallback(err, httpResponse, body) {
        if (err) {
            return console.error('upload failed:', err);
        }
        console.log('Upload successful!  Server responded with:', body);
        // console.log(typeof body)
        // return body
    });
};
  
app.use(route.get('/', main));
app.listen(8090);
