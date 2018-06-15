// var express = require('express')
// var app = express()
// var fs = require('fs')
//   , gm = require('gm').subClass({imageMagick: true});
// var path = require('path')
// var bodyParser = require('body-parser');
// // const gm = require('gm')
// // resize and remove EXIF profile data

// // 解析 application/json
// app.use(bodyParser.json({limit:'50mb'}));	
// // 解析 application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ limit:'50mb',extended: true }));

// app.get('/',(req,res,next) => {
//     res.send('8089')
// })
const Koa = require('koa');
const app = new Koa();
const bodyParser = require('koa-bodyparser')
const koaBody = require('koa-body')
koaBody({multipart:true})
// app.use(bodyParser())
// const formidable = require("formidable");
const route = require('koa-route');
const main =  async (ctx, next) => {
    console.log(ctx)
    console.log(ctx.request.body)
    // var form = new formidable.IncomingForm();
    // await form.parse(ctx.req,async function(err,fields,files){
    //     console.log('err',err)
    //     if(err){throw err; return;}
    //     console.log(fields);//{ name: base64字符串 }
    // });

    ctx.body = "end"
    ctx.body = '111'
};
  
app.use(route.post('/test',main));
app.listen(8089);
// app.post('/test',function(req,res,next) {
//     try {
//         let fpath = path.join(__dirname,'path','my3.jpg')
//         // let url = 'https://image2.wbiao.co/goods/i/201302/05/1112_30_00.jpg'
//         // request(url)
//         // .pipe(fs.createWriteStream(fpath))
//         // .on('close', function() {
//         //     var bu = fs.createReadStream(fpath, {start: 0, end: 262});
//         //     bu.on('data', function(chunk) {
//         //         console.log(chunk.toString());//这是结果
//         //     });
//         // });
//         var chunks = [];  
//         var size = 0
//         req.on('data',function(chunk){
//             console.log('chunk',chunk)
//             chunks.push(chunk);  
//             size += chunk.length;  
//         });
//         req.on("end",function(){
//             var data = null;  
//             switch(chunks.length) {  
//               case 0: data = new Buffer(0);  
//                 break;  
//               case 1: data = chunks[0];  
//                 break;  
//               default:  
//                 data = new Buffer(size);  
//                 for (var i = 0, pos = 0, l = chunks.length; i < l; i++) {  
//                   var chunk = chunks[i];  
//                   chunk.copy(data, pos);  
//                   pos += chunk.length;  
//                 }  
//                 break;  
//             }
//             console.log('chunks',)
//         })
//         console.log('req.query',req.query)
//         console.log('req.params',req.params)

//         let requrestData = req.body
//         // requrestData.pipe(fpath)
//         // console.log(requrestData)
//         // let read = fs.createReadStream(path.join(__dirname,'path','test.png'))
//         // console.log(read)
//         console.log(typeof requrestData)
//         console.log(requrestData,'requrestData')
//         // let readStream = fs.createReadStream(requrestData)
//         // let writerStream = fs.createWriteStream(fpath)
//         // readStream.pipe(writerStream)
//         res.send('111')
//         // writerStream.on('pipe', (src) => {
//         //     console.error('something is piping into the writer',src);
//         // });
//         // requrestData.myBg.pipe(writerStream)
   
//         //   reader.pipe(writer);
//         // read.pipe(writerStream)
//         // writerStream.write(requrestData.myBg)

//         // // var writerStream = fs.createWriteStream(path.join(__dirname,'path','my.jpg'));

//         // // writerStream.write(requrestData.myBg,'UTF8');

//         // // // 标记文件末尾
//         // // writerStream.end();
        
//         // // // 处理流事件 --> data, end, and error
//         // // writerStream.on('finish', function() {
//         // //     console.log("写入完成。");
//         // // });
//         // requrestData.myBg.pipe(fs.createWriteStream(path.join(__dirname,'path','my.jpg')))
//         // fs.writeFile(path.join(__dirname,'path','my.jpg'),requrestData.myBg._readableState.buffer,(err) => {
//         //     if(err) {
//         //         console.log(err)
//         //     }
//         // })
//         // gm(path.join(__dirname,'path','test2.jpg'))
//         //     .resize(11, 11)
//         //     .write(path.join(__dirname,'path','resize.jpg'), function (err) {
//         //         if (err) {
//         //             res.send(error)
//         //         } else {
//         //             res.send('done')
//         //         }
//         //     });
//     } catch (error) {
//         console.log('error',error)
//         res.send(error)
//     }
// })

// app.listen('8089',() => {
//     console.log('server start')
// })


