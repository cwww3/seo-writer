const { load, generate } = require('./tool');
const cheerio = require('cheerio');
const crypto = require('crypto');
let OSS = require('ali-oss');

const wxappCovers = ['http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE1IXOdzDPl8sjvC71WicFnFxFX7NxGtUlsEcNUMibOQgdoHGSSkgQWUMQ/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEEiaXE7qK5VPtjw7ymY80IQKxbWvgvxYtZv3ICDqM1qrwY17KibEFiaf9Q/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE76unvafDRKTTWx4AuFw2b7xdRxwT3YGlJEdqPl0yFjo7iccqp1bM5zg/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE5Y8OuHc1X6wTaHicRwou5ibC2AMsqtiaMC57icNX0ibKWss4giasibv3Odlmw/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEuIiaicS2sDmD0anH6q9fNAecvDZFKkWZcJMA3dpXU1lL9SdicIZc11Eaw/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEPlcTWPtKcSMaAWd3UoTxovCpbFRCKFWAjMDohVcDa3h4PADAUHGbFg/0?wx_fmt=jpeg'];

let miniprogram = {
  type: "miniprogram",
  props: { "appId": "wxfa2cf072f1b170e7", "path": "pages/index/index", "imageUrl": "http://mmbiz.qpic.cn/mmbiz_jpg/xdxf0NDAibBZIh89UUAqopm3bOG8j3rkAZU9kma1iaFRNBwPRRemSUExxP4oibic7XNIz3DJtCdF6z2kzdiccbibicZvw/0?wx_fmt=jpeg" }
};

let client;

(async () => {
  Date.prototype.Format = function (fmt) {
    const o = {
      'M+': this.getMonth() + 1, // 月份
      'd+': this.getDate(), // 日
      'h+': this.getHours(), // 小时
      'm+': this.getMinutes(), // 分
      's+': this.getSeconds(), // 秒
      'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
      S: this.getMilliseconds() // 毫秒
    }
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
    for (const k in o) { if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))) }
    return fmt
  }
  var arguments = process.argv;
  // 带任意参数就当是本地环境
  endpoint = arguments.length > 2 ? 'oss-cn-shanghai.aliyuncs.com' : 'oss-cn-shanghai-internal.aliyuncs.com'
  client = new OSS({
    accessKeyId: 'accessKeyId',
    accessKeySecret: 'accessKeySecret',
    endpoint: endpoint,
    bucket: 'bucket',
  });
  const today = new Date(Date.now()).Format('yyyy-MM-dd')
  // 传变量 为了改主词
  await load(11)
  // 线上1000
  for (let i = 0; i < 1000; i++) {
    // 生成文章
    const article = generate()
    const title = article.title
    const content = article.content
    // 解析正文内容
    const $ = cheerio.load(content)
    const mainContent = $('.article-content')
    const ps = mainContent.find('p')
    var keys = Object.keys(ps)
    var ob = []
    // 解析每一个P
    keys.forEach(key => {
      if (!['length','options','_root','prevObject'].includes(key)){
        let pp = {}
        pp.type = "text"
        p = $(ps[key])
        text = p.text().replace('\n', '').trim()
        pp.props = { 'text': text }
        ob.push(pp)
      }
    })
    // 再加一个小程序
    miniprogram.props.imageUrl = wxappCovers[Math.floor(Math.random() * wxappCovers.length)];
    ob.push(miniprogram)

    // buf1 = Buffer.from(title)
    // base64Title = buf1.toString('base64')
    let lastArticle = {
      title: title,
      content: JSON.stringify(ob)
    }
    // console.info(lastArticle)
    const secret = md5(title)
    articleStr = JSON.stringify(lastArticle)
    // console.log(articleStr)
    // 传oss上
    result = await putBuffer(articleStr, secret, today)
    // console.log(result)
    await sleep(500)
  }
})();

async function putBuffer(articleStr, secret, today) {
  try {
    let result = await client.put('articles/' + today + '/' + secret + '.json', Buffer.from(articleStr));
    // console.log(result);
  } catch (e) {
    console.log(e);
  }
}

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
};

function sleep(ts) {
  return new Promise((resolve, reject) => {
      setTimeout(() => {
          resolve();
      }, ts);
  })
}