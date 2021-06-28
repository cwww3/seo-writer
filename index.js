const puppeteer = require('puppeteer');
const axios = require('axios')
const { load, generate } = require('./tool');
const fs = require("fs");

// const keyWords = ['扫一扫','传图识字','识别文字','扫描文字','文字识别','表格识别','图片扫描','图文识字','身份证扫描','拍图识字','看图识字','拍照翻译','文字转换','文字扫描','ocr','扫描文档','拍照扫描','图文转换','英语翻译','繁体字识别'];
const wxappCovers = ['http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE1IXOdzDPl8sjvC71WicFnFxFX7NxGtUlsEcNUMibOQgdoHGSSkgQWUMQ/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEEiaXE7qK5VPtjw7ymY80IQKxbWvgvxYtZv3ICDqM1qrwY17KibEFiaf9Q/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE76unvafDRKTTWx4AuFw2b7xdRxwT3YGlJEdqPl0yFjo7iccqp1bM5zg/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlE5Y8OuHc1X6wTaHicRwou5ibC2AMsqtiaMC57icNX0ibKWss4giasibv3Odlmw/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEuIiaicS2sDmD0anH6q9fNAecvDZFKkWZcJMA3dpXU1lL9SdicIZc11Eaw/0?wx_fmt=jpeg', 'http://mmbiz.qpic.cn/sz_mmbiz_jpg/18rhhadLic2jeu7y5UWw6jh07wTZvibTlEPlcTWPtKcSMaAWd3UoTxovCpbFRCKFWAjMDohVcDa3h4PADAUHGbFg/0?wx_fmt=jpeg'];
const bottomText = ['点个“赞+在看”，支持一下👇', '如果对你有帮助\n麻烦点个赞在看哦👇', '如果觉得文章有用\n👇分享，点赞，在看', '觉得不错，请点个赞在看👇', '在看和点赞就是最大的支持👇', '喜欢这篇文章，点个赞吧👇'];
(async () => {
    // 初始化下文章数据
    try {
        await load()
    } catch (error) {
        console.log(error)
        process.exit()
    }
    const browser = await puppeteer.launch({
        headless: false,
    });
    const page = await browser.newPage();
    await page.goto('https://mp.weixin.qq.com/');
    console.log('进入wx平台首页');
    while (true) {
        console.log('\n\n--------------');
        console.log('等待扫码登录');
        // TODO 页面刷新也会认为登录成功 需要改进
        await page.waitForNavigation({
            waitUntil: 'load',
            timeout: 0 // 无限制等待
        }); //等待页面加载出来，等同于window.onload
        // 获取登录账号昵称
        let nickname = await page.$eval('.weui-desktop-account__nickname', el => el.text);
        console.log(nickname + '  扫码登录');
        // 点击图文按钮
        let eles = await page.$$('.new-creation__menu-item');
        await eles[0].click();
        // 监听新页面创建 并得到该页面
        const newPage = await new Promise((resolve, reject) => {
            browser.on('targetcreated', function (target) {
                resolve(target.page());
            });
        });
        console.log('进入到文章编辑页');
        await sleep(6000);
        // 设置页面
        await newPage.setViewport({ width: 1440, height: 768 });

        // 生成8篇文章
        let cnt = 8;
        for (let i = 1; i <= cnt; i++) {
            // 获取文章
            let article = generate();
            console.log('获取第' + i + '篇文章-----' + article.title);
            // console.log(article);

            // 标题
            console.log('等待填入标题');
            let title = await newPage.waitForSelector('#title');
            await title.click();
            await newPage.keyboard.type(article.title);
            console.log('填入标题完成');
            await sleep(2000);
            // 作者
            // let author = await newPage.waitForSelector('#author');
            // await author.click();
            // await newPage.keyboard.type(articles[i].author);
            // await sleep(2000);
            // 摘要
            // let abstract = await newPage.waitForSelector('#js_description');
            // await abstract.click();
            // await newPage.keyboard.type(articles[i].abstract);
            // await sleep(2000);

            // 正文
            console.log('等待填入正文');
            await newPage.evaluate((article, wxapp) => {
                $EDITORUI.edui1.editor.window.document.body.innerHTML = (article.content + wxapp);
            }, article, getWxapp('wxfa2cf072f1b170e7', 'pages/index/index'));

            await newPage.mouse.click(730, 526);
            // 按10次不过分吧
            for (let i = 0; i < 10; i++) {
                await newPage.keyboard.press('ArrowDown');
                await sleep(200);
            }
            await newPage.keyboard.press('Enter');
            await sleep(200);
            await newPage.keyboard.type('往期回顾');
            await sleep(200);
            await newPage.keyboard.press('Enter');
            // 插入链接
            console.log('等待填入链接');
            let mpLink = await newPage.$('#js_editor_insertlink');
            // 插入三个链接
            for (let i = 0; i < 3; i++) {
                await mpLink.click();
                await sleep(2000); // 停一下
                let links = await newPage.$$('.inner_link_article_item');
                // 抓第3、4、5篇
                await links[i+2].click();
                let button = await newPage.$('.weui-desktop-dialog__ft>button');
                button.click();
                await sleep(1000);
                await newPage.keyboard.press('Enter');
                await sleep(2000);
            }
            // 插入底部文字
            await newPage.evaluate((bottomText) => $EDITORUI.edui1.editor.window.document.body.innerHTML += bottomText, getBottomText());

            console.log('填入正文完成');
            await sleep(2000);

            // 封面
            // 鼠标移动到封面
            await newPage.hover('.select-cover__btn');
            await sleep(1000);
            // 鼠标点击从库中选择
            let fromBtn = await newPage.$$('.pop-opr__item');
            console.log(fromBtn.length)
            // console.log(fromBtn[1].click)
            // 这边有点奇怪 下标1突然不行了 改成下标3又可以
            await fromBtn[3].click();
            await sleep(2000)
            // input是隐藏的显示出来才能获取到
            await newPage.evaluate(() => {
                document.querySelector('.js_upload_btn_container').children[2].children[0].style.display = 'block';
            });
            await sleep(2000);
            // 上传文件
            let input = await newPage.$('.js_upload_btn_container input');
            // 文件地址
            let pathName = i === 1 ? './pic/first/' : './pic/second/';
            await sleep(1000);
            filePath = await getPic(pathName);
            await sleep(1000);
            await input.uploadFile(filePath);
            console.log('上传封面---路径:' + filePath);
            await sleep(3000);

            // 点击下一步
            let nextBtns = await newPage.$$('.weui-desktop-btn_wrp');
            let record1 = await newPage.$$eval('.weui-desktop-btn_wrp', (nodes, r) => { nodes.forEach(n => r.push(n.innerText)); return r }, []);
            console.log(record1);
            console.log("下一步按钮");
            console.log(nextBtns.length); //5
            await nextBtns[2].click();
            await sleep(3000);

            // 点击完成
            let okBtns2 = await newPage.$$('.weui-desktop-btn_wrp');
            let record2 = await newPage.$$eval('.weui-desktop-btn_wrp', (nodes, r) => { nodes.forEach(n => r.push(n.innerText)); return r }, []);
            console.log(record2);
            console.log("完成按钮");
            console.log(okBtns2.length); //4
            // 正常okBtns2 length=4 选第四个
            // 异常 length=5 
            try{
                await okBtns2[3].click();
            }catch(e) {
                // 重试一次
                let okBtns2 = await newPage.$$('.weui-desktop-btn_wrp');
                let record2 = await newPage.$$eval('.weui-desktop-btn_wrp', (nodes, r) => { nodes.forEach(n => r.push(n.innerText)); return r }, []);
                console.log(record2);
                console.log("完成按钮");
                console.log(okBtns2.length); //4
            }
           

            console.log(article.title + '   填入完成');
            await sleep(3000);

            // 点击保存
            let savaBtn = await newPage.waitForSelector('#js_submit');
            await savaBtn.click();
            console.log(article.title + '  保存成功');
            await sleep(2000);

            // 新建文章
            if (i === cnt) {
                await sleep(5000);
                break;
            }
            // 鼠标移到 <<新建消息>>
            await newPage.hover('#js_add_appmsg');
            await sleep(1000);
            // 点击 <<写新图文>>
            let createBtn = await newPage.waitForSelector('.icon-svg-editor-appmsg')
            await createBtn.click()
            console.log('新建第' + (i + 1) + '篇');
            await sleep(2000);
        }

        // 提交
        console.log('等待提交');
        let send = await newPage.waitForSelector('#js_send');
        await send.click();
        await sleep(3000); // 等两秒  《群发》组件还未弹出
        let push = await newPage.$('.mass-send__footer button');
        await push.click();
        await sleep(3000); // 等两秒  《继续群发》组件还未弹出
        let sureBtns = await newPage.$$('.weui-desktop-btn_primary');
        await sureBtns[1].click();
        console.log('提交完成 等带扫码后开始群发');

        //等扫码事件触发
        await newPage.waitForSelector('.icon_qrcode_scan', { timeout: 0 });
        console.log('扫码完成 请在手机确认');
        //等5秒  如果页面关闭了 手机点确认会发布出去
        await sleep(5000);

        // 关闭新页面
        await newPage.close();
        await page.bringToFront();
        console.log('关闭文章编辑页面');
        await sleep(3000);

        // 收集刚群发的文章url 发个请求 
        let allArtiles = await page.$$('.weui-desktop-mass-appmsg__bd')
        let sentArtiles = allArtiles.slice(0, cnt)
        let urls = []
        for (let article of sentArtiles) {
            let url = await article.$eval('a', a => a.getAttribute('href'))
            await sleep(1000)
            urls.push(url)
        }

        // axios.post('http://127.0.0.1:8081/h3248rhfnaksifhq8r9q3hidu3hqdiuqw/article/url', { urls: urls })
        axios.post('https://paitushizi.com/h3248rhfnaksifhq8r9q3hidu3hqdiuqw/article/url', { urls: urls })
            .then(res => {
                if (res.data.code !== 0) {
                    throw res.data.msg
                } else {
                    console.log(nickname + '公众号文章url上传成功')
                }
            })
            .catch(error => console.error(error))

        // urls = allArtiles.map(async(article) => {
        //         let url = await article.$eval('a', (a) => a.getAttribute('href'))
        //         return url
        //     })
        await sleep(3000)

        // 退出
        let infoBtn = await page.waitForSelector('.weui-desktop-account__info')
        await infoBtn.click();
        await sleep(1000);
        let btns3 = await page.$$('.weui-desktop-dropdown__list-ele');
        await btns3[3].click();
        // 退出 url会变 等加载完
        await page.waitForNavigation({
            waitUntil: 'load',
            timeout: 0
        });
        console.log(nickname + '退出');
    }
})();


function sleep(ts) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ts);
    })
}

// 小程序卡片
function getWxapp(appId, path) {
    // 卡片封面图片
    let imgUrl = wxappCovers[Math.floor(Math.random() * wxappCovers.length)];
    return `<iframe class="res_iframe weapp_app_iframe js_editor_weapp js_weapp_entry" frameborder="0"  data-miniprogram-appid="${appId}"  data-miniprogram-imageurl="${imgUrl}" data-miniprogram-path="${path}" data-miniprogram-type="card" data-miniprogram-servicetype=""></iframe>`
}

// 关键字
// function getKeyWord() {
//     return keyWords[Math.floor(Math.random() * keyWords.length)]
// }

// 底部文字
function getBottomText() {
    cnt = Math.floor((Math.random() * bottomText.length));
    text = bottomText[cnt];
    let result = ''
    const ps = text.split('\n')
    ps.forEach((p) => { result += `<p style="text-align: right;">​${p}</p>` })
    console.log(result)
    return result
}

// 公众号文章链接
// function getMpArtcle(url, urlName) {
//     return `<p><a target="_blank" href="${url}" data-itemshowtype="0" tab="innerlink">${urlName}</a><br></p>`
// }

// 封面图片
async function getPic(pathName) {
    const pro = new Promise((resolve, reject) => {
        res = resolve;
    })
    fs.readdir(pathName, function (err, files) {
        cnt = Math.floor((Math.random() * files.length));
        res(pathName + files[cnt]);
    });
    let pic = await pro;
    return pic;
}