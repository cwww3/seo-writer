const data =  require('./data.json') 
// 一些预定义的内容，包括主词
// mainkw: 主关键词，如「传图识字」
// title: 标题结构，里面会含有关键词, 关键词通过${mainkw}的形式表示（正则可匹配）
// content: 正文结构，里面通过关键词和固定内容定义文章的整体结构（可以含图）
// 其他：可自行定义，但不要覆盖上述内容
// const NacosConfigClient = require('nacos').NacosConfigClient; // js
// const configClient = new NacosConfigClient({
//     serverAddr: '172.19.94.18:8848',
//     endpoint: '/nacos',
//     namespace: 'e158015d-f020-48bd-8d00-ca1dca38e162',
// });


const dicts ={}

// 字典集合，每一个元素都是一个列表，列表中的任意2词都可互相替代（类似同义词）

// const wxapp = '<a class="weapp_text_link js_weapp_entry" style="font-size:17px;" data-miniprogram-appid="wxfa2cf072f1b170e7" data-miniprogram-path="pages/index/index" data-miniprogram-nickname="拍图识字" href data-miniprogram-type="text" data-miniprogram-servicetype _href>拍图识字</a>';
// ${wxapp}

/**
 语法说明:
 1. ${KEY} 表示在此处引用名为 KEY 的内容（随机挑一个），如果上下文中已存在 KEY 的设定，则世界使用上下文中的KEY
 1.1. ${KEY!} 表示再次随机一个KEY的内容，而完全不理会上下文中已经有的内容。但如果出现UNIQUE:KEY且不能满足，则输出错误(合理的，因为原始设定务必要保证素材够用)
 1.2. ${KEY?} 表示可选使用 KEY的内容，如果不存在也不抛出错误，直接返回空串。"?"的优先级低于"!"，因此可以出现${KEY!?}的情况，即如果KEY存在则随机一个，但是如果不存在可选KEY的内容，则返回空串
 1.3. ${&KEY} 表示KEY的内容需要被展开。举例来说，如果内容为"${&KEY1}和${&KEY2}", 且有2个候选KEY1, 3个候选KEY2，那么我们会展开成2x3=6个内容，放在当前的列表中
 1.4. ${KEY+} 表示这个KEY为顺序进行的取值的变量
 2. #{KEY} 表示延迟计算，但是计算模式同${KEY}
 */
dicts.pick_ = function (key, ctx = {}) {
    if (ctx.hasOwnProperty(key) && ctx.hasOwnProperty(key) && key[key.length - 1] !== '!') {
        return ctx[key];
    }

    if (key[key.length - 1] === '!') {
        key = key.substring(0, key.length - 1);
    }
    const ignoreError = key[key.length - 1] === '?';
    if (ignoreError) {
        key = key.substring(0, key.length - 1);
    }
    const res = (() => {
        if (!(dicts.hasOwnProperty(key))) {
            if (ignoreError) {
                return '';
            } else {
                return `#N/A: ${key}#`; // 找不到
            }
        }

        const candidates = dicts[key];
        if (typeof candidates === 'string') {
            return candidates;
        } else if (Array.isArray(candidates)) {
            const idx = Math.floor(Math.random() * candidates.length);
            return candidates[idx];
        } else if (typeof candidates === 'function') {
            return candidates.call(this, key, dicts, ctx);
        } else {
            return `#INVALID: ${key}#`; // 啥都没有
        }
    })();
    ctx[key] = res;
    return res;
};

// 正则占位符，专门寻找参数
dicts.RE_PLACEHOLDER = new RegExp(/\$\{(.*?)\}/g);

function encodePlainAsRegExp(plain) {
    const rs = [
        [new RegExp(/\$/g), '\\$'],
        [new RegExp(/\{/g), '\\{'],
        [new RegExp(/\}/g), '\\}'],
        [new RegExp(/\?/g), '\\?'],
        [new RegExp(/\+/g), '\\+'],
        [new RegExp(/\^/g), '\\^'],
    ];
    return rs.reduce((res, cur) => {
        return res.replace(cur[0], cur[1]);
    }, plain);
}

/** 计算表达式的值 */
dicts.pick = function (expr, ctx = {}) {
    const self = this;
    // 支持KEY+, KEY?, KEY!
    if (!expr || expr.length === 0) { // 错误情况
        return '#ERROR: EMPTY KEY#';
    }

    // 首先进行表达式的判断
    const isExpr = expr[0] === '!';
    if (isExpr) { // 目前要求严格的:分割，TODO: 以后做成语法解析！
        const parts = expr.substring(1).split(':');
        const funcName = parts[0];
        const funcArgs = parts.slice(1);
        switch (funcName) {
            case 'SET':
                ctx[`__mark_${funcArgs[0]}`] = funcArgs.length > 1 ? funcArgs[1] : 'ok';
                return ''; // 这是一种特殊情况，我们需要立刻走掉
                break;
            case 'IF-SET-ELSE':
                if (ctx.hasOwnProperty(`__mark_${funcArgs[0]}`)) {
                    expr = funcArgs[1];
                } else {
                    expr = funcArgs[2];
                }
                break;
            default:
            // nothing to do
        }
    }

    if (!expr || expr.length === 0) { // 错误情况 FIXME: 不能这么丑陋
        return '#ERROR: EMPTY KEY#';
    }

    // 然后进行KEY的操作

    const isSequential = expr[expr.length - 1] === '+';
    const isOptional = expr[expr.length - 1] === '?';
    const isRandomized = expr[expr.length - 1] === '!';
    const isUnique = expr[expr.length - 1] === '%'; // 是否不允许使用重复的内容？

    const key = isSequential || isOptional || isRandomized || isUnique ? expr.substring(0, expr.length - 1) : expr;

    const r = (() => {
        if (!self.hasOwnProperty(key)) {
            if (isOptional) {
                return '';
            } else {
                return `#ERROR{${key}}: NO SUCH KEY#`;
            }
        }
        const vals = self[key];
        if (isSequential) {
            const seqKeyInCtx = `__idx_of_${key}`; // 并不规范，但是应该能用
            if (!ctx.hasOwnProperty(seqKeyInCtx)) {
                ctx[seqKeyInCtx] = 0; // Re0
            } else {
                ctx[seqKeyInCtx] += 1;
            }
            const idx = ctx[seqKeyInCtx] % vals.length;
            return vals[idx];
        } else if (isUnique) {
            const uniqKeyInCtx = ctx[`__uniq_of_${key}`];
            if (!ctx.hasOwnProperty(uniqKeyInCtx)) {
                ctx[uniqKeyInCtx] = new Set();
            }
            for (let k = 0; k < 5; k += 1) { // 首先尝试有限随机
                const v = vals[Math.floor(Math.random() * vals.length)];
                if (!ctx[uniqKeyInCtx].has(v)) {
                    ctx[uniqKeyInCtx].add(v);
                    return v;
                }
            }
            // 没有成功？我们需要遍历了
            for (let k = 0; k < vals.length; k += 1) {
                const v = vals[k];
                if (!ctx[uniqKeyInCtx].has(v)) {
                    ctx[uniqKeyInCtx].add(v);
                    return v;
                }
            }
            // 还是没有成功？那我们报错！
            return `#ERROR{${key}}: INSUFFICIENT VALUES`;
        } else if (isRandomized || !ctx.hasOwnProperty(key)) {
            return vals[Math.floor(Math.random() * vals.length)];
        } else {
            return ctx[key];
        }
    })();
    ctx[key] = r;
    return r;
}

dicts.fill_ = function (val, rePlaceholder, ctx = {}) {
    let text = val;
    const m = text.match(rePlaceholder);
    if (m === null) {
        return text;
    } else {
        m.forEach((keyRaw) => {
            const key = keyRaw.substring(2, keyRaw.length - 1); // 去掉${}
            while (text.indexOf(keyRaw) >= 0) {
                const subtext = this.fill_(this.pick(key, ctx), rePlaceholder, ctx);
                text = text.replace(new RegExp(encodePlainAsRegExp(keyRaw)), subtext);
            }
        });
        return text;
    }
}

/**
 * 给定顶层key，递归填充内容
 */
dicts.fill = function (topKey, ctx = {}) {
    const RE_PLACEHOLDERS = [
        new RegExp(/\$\{(.*?)\}/g), // 第一批placeholder
        new RegExp(/#\{(.*?)\}/g), // post-placeholder
    ];
    let text = this.pick(topKey);
    for (let rei = 0; rei < RE_PLACEHOLDERS.length; rei += 1) {
        text = dicts.fill_(text, RE_PLACEHOLDERS[rei], ctx);
    }
    ctx[topKey] = text;
    return text;
};


function generate() {
    const ctx = {};
    const title = dicts.fill('title', ctx);
    const content = dicts.fill('content', ctx);
    const lines = content.split('\n');
    const newLines = [];
    for (let k = 0; k < lines.length; k += 1) {
        const line = lines[k].trim();
        if (line === '' || !line || line.length === 0) {
            if (k === 0 || lines[k - 1] === '') {
                continue;
            }
        }
        if (line.indexOf("text-align:center") != -1) {
            newLines.push(`<p style="text-align:center;" >${line}</p>`);
        } else {
            newLines.push(`<p>${line}</p>`);
        }
    }
    const article = {
        title: title,
        // <h3>${title}</h3>
        content: `
            <div class="article-box" onclick="selectMe(this)">
                <div class="article-content">
                    <div>${newLines.join('')}</div>
                </div>
            </div>`
    };
    return article;
}


dicts.expand = function () {
    const RE_EXPANDER = new RegExp(/&\{(.*?)\}/, 'g');
    const expanded = new Map();
    const self = this;

    const doExpand = (key) => {
        if (expanded.has(key)) {
            return expanded.get(key); // done, returns a list
        }

        let vals = self[key];
        if (!vals) {
            vals = [];
        } else if (typeof vals === 'string') {
            vals = [vals];
        }

        // 遍历所有内容，递归展开
        let r = [];
        for (let i = 0; i < vals.length; i += 1) {
            const val = vals[i];
            const m = val.match(RE_EXPANDER);
            if (m === null) {
                r.push(val);
                continue; // 无需处理
            }

            const pairs = m.map((subKeyFull) => {
                const subKey = subKeyFull.substring(2, subKeyFull.length - 1);
                return {
                    key: subKey,
                    vals: doExpand(subKey),
                    re: new RegExp(`&\\{${subKey}\\}`),
                };
            });
            // console.log('pairs', pairs);
            // 递归写入所有组合至变量r中
            const doConcatRecursive = (r, degree, s) => {
                if (degree >= pairs.length) {
                    r.push(s);
                    return;
                }
                const pair = pairs[degree];
                if (s.search(pair.re) === -1) {
                    doConcatRecursive(r, degree + 1, s);
                } else {
                    for (let k = 0; k < pair.vals.length; k += 1) {
                        doConcatRecursive(r, degree, s.replace(pair.re, pair.vals[k]));
                    }
                }
            };
            doConcatRecursive(r, 0, val); // 展开当前val
        }
        return r;
    };

    Object.keys(self).forEach((key) => {
        if (Array.isArray(self[key]) || typeof self[key] === 'string') {
            self[key] = doExpand(key);
        }
    });
}

async function load(name) {
    // 主词要换一下
    if (name) {
        data.mainkw = ["扫描表格","识别表格","转换表格","编辑表格","提取表格","表格扫描","表格识别","表格转换","表格编辑","表格提取","扫描图片表格","识别图片表格","转换图片表格","编辑图片表格","提取图片表格","图片表格扫描","图片表格识别","图片表格转换","图片表格编辑","图片表格提取","图片扫描表格","图片识别表格","图片转换表格","图片编辑表格","图片提取表格","传图扫描表格","传图识别表格","传图转换表格","传图编辑表格","传图提取表格","扫描图文表格","识别图文表格","转换图文表格","编辑图文表格","提取图文表格","图文表格扫描","图文表格识别","图文表格转换","图文表格编辑","图文表格提取","图文扫描表格","图文识别表格","图文转换表格","图文编辑表格","表格拍照转","表格拍照识别","拍照表格扫描","拍照表格识别","拍照表格转换","拍照表格编辑","拍照表格提取","扫描表格取字","识别表格取字","转换表格取字","编辑表格取字","提取表格取字","图片转表格","图片识表格","传图转表格","扫描Excel","识别Excel","转换Excel","编辑Excel","提取Excel","Excel扫描","Excel识别","Excel转换","Excel编辑","Excel提取","扫描图片Excel","识别图片Excel","转换图片Excel","编辑图片Excel","提取图片Excel","图片Excel扫描","图片Excel识别","图片Excel转换","图片Excel编辑","图片Excel提取","图片扫描Excel","图片识别Excel","图片转换Excel","图片编辑Excel","图片提取Excel","传图扫描Excel","传图识别Excel","传图转换Excel","传图编辑Excel","传图提取Excel","扫描图文Excel","识别图文Excel","转换图文Excel","编辑图文Excel","提取图文Excel","图文Excel扫描","图文Excel识别","图文Excel转换","图文Excel编辑","图文Excel提取","图文扫描Excel","图文识别Excel","图文转换Excel","图文编辑Excel","Excel拍照转","Excel拍照识别","拍照Excel扫描","拍照Excel识别","拍照Excel转换","拍照Excel编辑","拍照Excel提取","扫描Excel取字","识别Excel取字","转换Excel取字","编辑Excel取字","提取Excel取字","图片转Excel","图片识Excel","传图转Excel"]
    }
    console.log(data.mainkw)
    Object.assign(dicts, data)
    dicts.expand()
}

module.exports = {
    load, generate
}
