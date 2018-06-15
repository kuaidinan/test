import {accessSync} from "fs";

const sha1 = require('sha1');
const md5 = require('md5');
const JSSha = require('jssha');
const request = require('request')
import {wxApiUrl} from '../configs/wx_config'
import {redis} from './redis'

let GET_TOKEN_API = wxApiUrl.GET_TOKEN_API
let GET_AUTHORIZE = wxApiUrl.GET_AUTHORIZE
let GET_WECHAT_USER_INFO_WEB = wxApiUrl.GET_WECHAT_USER_INFO_WEB
let WECHAT_AUTHORIZE_REDIRECT = wxApiUrl.WECHAT_AUTHORIZE_REDIRECT
let GET_WECHAT_USER_INFO_BASE = wxApiUrl.GET_WECHAT_USER_INFO_BASE
let POST_WECHAT_UPLOAD_MEDIA = wxApiUrl.POST_WECHAT_UPLOAD_MEDIA
let GET_TICKET_API = wxApiUrl.GET_TICKET_API

import * as XmlParse from 'pixl-xml';
import { APIError, APIErrorCode } from './core/api-error';

interface wxInfo{
    appID: String;
    appsecret: String;
    signature: String;
}
interface AccessToken {
	access_token?: string;
	openid?: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
	unionid?: string;
	errcode?: number;
}
export interface WechatUserInfo {
	openid?: string;
	nickname?: string;
	headimgurl?: string;
	sex?: string;
	province?: string;
	city?: string;
	country?: string;
	privilege?: string[];
	unionid?: string;
	errcode?: number;
}

export let WeChat = function (wxInfo: wxInfo, rAccessTokenKey:string, callback) {
    this.APPID = wxInfo.appID
    this.SECRET = wxInfo.appsecret
    this.signature = wxInfo.signature
    this.rAccessTokenKey = rAccessTokenKey
    this.eventHandleFn = callback
    this.getJsApiTicketPromise = ''
    this.expire = 60000

    // 以下解决this方法在其它实例里面调用 this改变的问题
    this.wechatTokenCheck = this.wechatTokenCheck.bind(this)
    this.getSignApi = this.getSignApi.bind(this)
    this.getPeopleInfo = this.getPeopleInfo.bind(this)
}

WeChat.prototype.wechatTokenCheck = async function(ctx,next) {
    let eventHandleFn = this.eventHandleFn
    let wxSignature = this.signature
    switch (ctx.method.toUpperCase()) {
        case 'GET':
            vertifySignature(ctx);
            break;
        case 'POST':
            await eventHandle(ctx);
            break;
    }

    function vertifySignature(ctx){
        const signature = ctx.query["signature"];
        const timestamp = ctx.query["timestamp"];
        const nonce = ctx.query["nonce"];
        const echostr = ctx.query["echostr"];
        if (!signature || !timestamp || !nonce || !echostr) {
            return;
        } else if (checkSignature(signature, timestamp, nonce)) {
            // ctx.response.type = 'text/plain';
            ctx.response.body = echostr;
        } else {
            return;
        }
    }

    function checkSignature(signature: string, timestamp: string, nonce: string): boolean {
        let parames = [wxSignature, timestamp, nonce];
        let tmp = sha1(parames.sort().join(""));
        if (tmp === signature) {
            return true;
        } else {
            return false;
        }
    }
    async function eventHandle(ctx){
        let receiveXml = await handleXml(ctx)
        let message = XmlParse.parse(receiveXml);
        console.log('message eventHandle',message)
        await eventHandleFn(ctx,message)
    }

    function handleXml(ctx){
        if (ctx.method == 'POST' && ctx.is('text/xml')) {
            return new Promise(function (resolve, reject) {
                let buf = ''
                ctx.req.setEncoding('utf8')
                ctx.req.on('data', (chunk) => {
                    buf += chunk
                })
                ctx.req.on('end', () => {
                    resolve(buf)
                })
            })
        }
    }
}

WeChat.prototype.getSignApi = async function (ctx,next){
    let option = ctx.request.body
    let url = option.signUrl

    if (!url) {
        throw APIErrorCode.InvalidArguments;
    }
    let getSignData = await this.getSign(url);
    ctx.body = {data: getSignData}
}

WeChat.prototype.getPeopleInfo = async function (ctx,next){
    let option = ctx.query
    let open_id = option.open_id

    if (!open_id) {
        throw APIErrorCode.InvalidArguments;
    }
    let getSignData = await this.getWechatUserBaseInfo(open_id);
    ctx.body = {data: getSignData}
}

WeChat.prototype.getAccessToken = async function (){
    let APPID = this.APPID
    let SECRET = this.SECRET
    let rAccessTokenKey = this.rAccessTokenKey
    function getrAccessTokenKey(){
        return new Promise((resolve,reject) => {
            try {
                let a = redis.get(rAccessTokenKey)
                resolve(a)
            }catch (e){
                console.log(e)
                // reject(e)
            }
        })
    }
    let redisRecord:any = await getrAccessTokenKey()
    let record
    let now = Date.now();

    if (redisRecord) {
        try {
            record = JSON.parse(redisRecord);
        } catch (err) {
            throw new APIError(400, "解析微信jsSDK签名失败 ");
        }

        if (Math.abs(now - record.timeStamp) > this.expire) {
            return updateDate();
        } else {
            return record;
        }
    } else {
        return updateDate();
    }
    function updateDate(){
        return new Promise((resolve, reject) => {
            request({
                method: "get",
                url: `${GET_TOKEN_API}grant_type=client_credential&appid=${APPID}&secret=${SECRET}`,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.134 Safari/537.36'
                }
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                    return;
                }
                let json: any;

                try {
                    json = JSON.parse(body);
                } catch (err) {
                    throw new APIError(err);
                }

                if (!json.access_token || json.errorcode) {
                    reject(json);
                    return;
                }
                json["timeStamp"] = Date.now();
                redis.set(rAccessTokenKey, JSON.stringify(json));
                resolve(json);
            });
        });
    }
}

WeChat.prototype.getSign = async function (signUrl: string){
    let APPID = this.APPID
    // let SECRET = this.SECRET
    let that = this
    function getJsApiTicketCallback(){
        return new Promise(resolved => resolved(getJsApiTicket()))
    }
    let apiJson:any = await getJsApiTicketCallback()
    console.log(apiJson);
    let timestamp = Math.floor(Date.now() / 1000);
    let nonceStr = Math.random().toString(36).substr(2, 15);
    let rawString = raw({
        jsapi_ticket: apiJson.ticket,
        url: signUrl,
        nonceStr,
        timestamp
    });

    let shaObj = new JSSha('SHA-1', 'TEXT');
    shaObj.update(rawString);
    console.log({
        appId: APPID,
        nonceStr,
        timestamp,
        url: signUrl,
        signature: shaObj.getHash('HEX'),
        rawString: rawString
    });
    return {
        appId: APPID,
        nonceStr,
        timestamp,
        url: signUrl,
        signature: shaObj.getHash('HEX'),
        rawString: rawString
    }
    function getJsApiTicket(){

        if (that.getJsApiTicketPromise) {
            return that.getJsApiTicketPromise;

        } else {

            return that.getAccessToken()
                .then(access => {

                    return that.getJsApiTicketPromise = new Promise((resolve, reject) => {
                        request({
                            method: "get",
                            url: `${GET_TICKET_API}type=jsapi&access_token=${access.access_token}`,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.134 Safari/537.36'
                            }
                        }, (error, response, body) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            let json: any;
                            try {
                                json = JSON.parse(body);
                            } catch (err) {
                                reject(new APIError(320, `解析数据失败 body: ${body}`));
                                return;
                            }

                            if (!json.ticket || json.errorcode) {
                                reject(json);
                                return;
                            }
                            resolve(json);
                            setTimeout(() => {
                                that.getJsApiTicketPromise = null;
                            }, 7000000);
                        });
                    });
                })

        }
    }
    function raw(args: any): string {
        let keys = Object.keys(args);
        let newArgs = {};
        keys = keys.sort();

        keys.forEach(function (key) {
            newArgs[key.toLowerCase()] = args[key];
        });

        let str = '';
        for (let k in newArgs) {
            str += '&' + k + '=' + newArgs[k];
        }

        str = str.substr(1);
        return str;
    };
}

WeChat.prototype.getWeChatUserBaseInfo = async function (openId: string){
    let that = this
    return that.getAccessToken().then((tokenJson) => {
        console.log("AccessToken", tokenJson);//重要:不要注释
        console.log("openid", openId);
        return new Promise((resolve, reject) => {
            request({
                method: "GET",
                url: `${GET_WECHAT_USER_INFO_BASE}access_token=${tokenJson.access_token}&openid=${openId}&lang=zh_CN`
            }, (error, response, body) => {
                if (error) {
                    reject(new APIError(-1, "code错误"));
                }
                let json = JSON.parse(body);
                if (json['errcode']) {
                    console.log(json['errcode']);
                    console.log(json["errmsg"]);
                    reject(new APIError(-1, "用户信息获取失败"));
                } else {
                    resolve(json);
                }
            });
        })
    });
}


interface fwInfo{
    appID: String;
    appsecret: String;
}
export let AuthorizeFw = function (fwInfo: fwInfo) {
    // this.code = code
    this.fwInfo = fwInfo
    this.getOpenIDTokenLockMap = {};
    this.codeStat = {
        count: 0,
        success: 0,
        fail: 0
    };
    this.getAuthorizeFw = this.getAuthorizeFw.bind(this)
}

AuthorizeFw.prototype.getAuthorizeFw = async function (code: string){
    let getOpenIDTokenLockMap = this.getOpenIDTokenLockMap
    let codeStat = this.codeStat
    let fwInfo = this.fwInfo
    // var accessTokenUrl = `${GET_AUTHORIZE}appid=${APPID}&secret=${SECRET}&code=${code}&grant_type=authorization_code`;
    let accessTokenUrl = `${GET_AUTHORIZE}appid=${fwInfo.appID}&secret=${fwInfo.appsecret}&code=${code}&grant_type=authorization_code`;

    if (code in getOpenIDTokenLockMap) {
        return getOpenIDTokenLockMap[code];
    }

    setTimeout(() => {
        delete getOpenIDTokenLockMap[code];
    }, 5 * 60 * 1000);

    return getOpenIDTokenLockMap[code] = new Promise((resolve, reject) => {
        request({
            method: 'GET',
            url: accessTokenUrl
        }, function (err, res, body) {
            if (err) {
                reject(new APIError(400, `可能是因为您的网络原因导致失败！`));
                return;
            }

            let data;
            try {
                data = JSON.parse(body);
            } catch (err) {
                reject(new APIError(410, `解析数据失败`));
                return;
            }
            codeStat["count"]++;
            if (!data["access_token"] || !data["openid"] || data["errcode"]) {
                codeStat["fail"]++;
                console.log(codeStat);
                console.log(`fail open id data' ${body}  code: ${code}`);

                reject(new APIError(420, `获取授权信息失败,重试一下吧`));
            } else {
                codeStat["success"]++;
                resolve(data);
            }
        });
    })
}

AuthorizeFw.prototype.getWechatUserInfo = async function (authorizeData:AccessToken) {
	var userInfoUrl = `${GET_WECHAT_USER_INFO_WEB}access_token=${authorizeData.access_token}&openid=${authorizeData.openid}&lang=zh_CN`;
	return new Promise((resolve, reject) => {
		request({
			method: 'GET',
			url: userInfoUrl,
		}, function (err, res, body) {
			if (err) {
				reject(new APIError(-1, `可能是因为您的网络原因导致失败！`));
				return;
			}
			let data: WechatUserInfo;
			try {
				data = JSON.parse(body);
			} catch (e) {
				reject(new APIError(-1, `解析数据失败`));
				return;
			}
			if (data.errcode) {
				reject(new APIError(-1, `连接微信失败, 重试一下吧！`));
				return;
			} else {
				resolve(data);
			}
		});
	})
}
export function createParameterQuickResponseCode(access_token: string, info: any) {
    /*
    * info {
    *   type: {
    *       temporary 为临时二维码
    *       forever   为永久二维码
    *   }
    *   text:  参数字符串
    *   time： 临时二维码的有效时间
    *}
    * */
    let type = info.type || ''  // temporary
    /*  微信接口参数
        expire_seconds	该二维码有效时间，以秒为单位。 最大不超过2592000（即30天），此字段如果不填，则默认有效期为30秒。
        action_name	二维码类型，QR_SCENE为临时的整型参数值，QR_STR_SCENE为临时的字符串参数值，QR_LIMIT_SCENE为永久的整型参数值，QR_LIMIT_STR_SCENE为永久的字符串参数值
        action_info	二维码详细信息
        scene_id	场景值ID，临时二维码时为32位非0整型，永久二维码时最大值为100000（目前参数只支持1--100000）
        scene_str	场景值ID（字符串形式的ID），字符串类型，长度限制为1到64
    */
    let option = {
        "action_name": "QR_LIMIT_STR_SCENE",
        "action_info": {
            "scene": {
                "scene_str": info.text ? info.text : info
            }
        }
    }

    if(type === 'temporary'){ // 临时二维码
        if(info.time && info.time>2592000){
            info.time = 2592000
        }
        Object.assign(option,{
            "action_name": "QR_STR_SCENE",
            "expire_seconds": info.time ? info.time: 864000
        })
        // option.action_name = 'QR_STR_SCENE'
    }
    // if(type === 'forever'){
    //
    // }
    return new Promise((resolve,reject) => {
        request({
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=' + access_token,
            headers: {
                'cache-control': 'no-cache',
                'content-type': 'application/json',
            },
            body: option,
            json: true,
        }, (error: any, response: any, body: any) => {
            if(error){
                reject(error)
            }else{
                let ticket = encodeURI(body.ticket)
                // console.log('ticket', ticket)
                let codeUrl = 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + ticket
                resolve(codeUrl)
            }

            // console.log('bodyurl', body)
            // let ticket = encodeURI(body.ticket)
            // console.log('ticket', ticket)
            // let codeUrl = 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + ticket
            // // let codeUrl =  body.url
            // handleImage(codeUrl, open_id, access_token, backImg)
            // function backImg(backbody: any) {
            //     console.log('callback body', backbody)
            //     let media_id = backbody.media_id
            //     curPeople.media_id = backbody.media_id
            //     curPeople.media_id_time = Number(backbody.created_at) * 1000 + 1000 * 60 * 60 * 24 * 2
            //     curPeople.save()
            //     sendImage(media_id, access_token)
            //     Wechat.getWechatUserBaseInfo(open_id).then((record: any) => {
            //         curPeople.nick_name = record.nickname
            //         curPeople.save()
            //     })
            // }
        })
    })
}

export function sendImage(access_token: string, open_id: string, media_id: string) {
    request({
        method: 'POST',
        url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + access_token,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
        },
        body: {
            touser: open_id,
            msgtype: "image",
            image:
                {
                    "media_id": media_id
                }
        },
        json: true,
    }, (error: any, response: any, body: any) => {
        console.log('error', error)
        console.log('body', body)
    });
}

export function sendText(access_token: string, open_id_share: string, text: string) {
    request({
        method: 'POST',
        url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + access_token,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
        },
        body: {
            touser: open_id_share,
            msgtype: "text",
            "text":
                {
                    "content": text
                }
        },
        json: true,
    }, (error: any, response: any, body: any) => {
        // console.log('===========>error', error)
        // console.log('===========>body', body)
        // console.log('===========>', error)
    });
}

export function sendImgText(access_token: string, open_id:string, context: any) {
    /*
    *  context
    *   "title":"Happy Day",
        "description":"Is Really A Happy Day",
        "url":"URL",
        "picurl":"PIC_URL"
    *
    *
    * */
    request({
        method: 'POST',
        url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + access_token,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
        },
        body: {
            "touser": open_id,
            "msgtype":"news",
            "news":{
                "articles": [
                    {
                        "title": context.title,
                        "description":context.description,
                        "url":context.url,
                        "picurl":context.picurl
                    }
                ]
            }
        },
        json: true,
    }, (error: any, response: any, body: any) => {
        // console.log('===========>error', error)
        // console.log('===========>body', body)
        // console.log('===========>', error)
    });
}

export function sendTemplate_gift(access_token: string, open_id_share: string, url: string, data: any) {
    let template_id = "5sbcfNE-O7rGwMFoo1UptvM93vh8iTLbu03Cqm154uk"
    // let url = "http://" + req.headers['host'] + "/mobile/game/sendfourbook?open_id=" + open_id_share,
    request({
        method: 'POST',
        url: 'https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=' + access_token,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
        },
        body: {
            "touser": open_id_share,
            "template_id": template_id,
            // "template_id": "5sbcfNE-O7rGwMFoo1UptvM93vh8iTLbu03Cqm154uk",
            // "template_id": "cNksZDo6uNNOeS9b3-DTF_B1INmbGW6E6rtCoCqBbmU",
            // "url": "http://" + req.headers['host'] + "/mobile/game/sendfourbook?open_id=" + open_id_share,
            "url": url,
            "data": data
        },
        json: true,
    });
}