// 一次性校验脚本：确认本指南注册的每个 shiki 语言模块都能加载并高亮。
// 用法：node scripts/check-shiki.mjs
import {createHighlighterCore} from 'shiki/core'
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript'

const LANGS = {
    typescript: () => import('shiki/langs/typescript.mjs'),
    javascript: () => import('shiki/langs/javascript.mjs'),
    json: () => import('shiki/langs/json.mjs'),
    bash: () => import('shiki/langs/bash.mjs'),
    html: () => import('shiki/langs/html.mjs'),
    css: () => import('shiki/langs/css.mjs'),
    glsl: () => import('shiki/langs/glsl.mjs'),
}

const THEMES = {
    'github-light': () => import('shiki/themes/github-light.mjs'),
    'one-dark-pro': () => import('shiki/themes/one-dark-pro.mjs'),
}

const SAMPLES = {
    typescript: "const x: number = 1\nexport default x",
    javascript: 'export const a = () => 1',
    json: '{"a": 1, "b": [true, null]}',
    bash: 'npm install boxutil',
    html: '<div class="a">hi</div>',
    css: '.a { color: red; }',
    glsl: 'void main() { gl_Position = vec4(0.0); }',
}

const [langs, themes] = await Promise.all([
    Promise.all(Object.values(LANGS).map((load) => load())),
    Promise.all(Object.values(THEMES).map((load) => load())),
])

const highlighter = await createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: langs.map((m) => m.default),
    themes: themes.map((m) => m.default),
})

let failures = 0

for (const [name, sample] of Object.entries(SAMPLES)) {
    const loaded = highlighter.getLoadedLanguages()
    if (!loaded.includes(name)) {
        console.error(`✗ 语言未注册: ${name}`)
        failures++
        continue
    }

    for (const theme of Object.keys(THEMES)) {
        const html = highlighter.codeToHtml(sample, {lang: name, theme})
        const tokens = (html.match(/<span style=/g) ?? []).length
        if (!html.includes('<pre') || tokens === 0) {
            console.error(`✗ ${name} / ${theme}: 高亮结果异常（token 数 ${tokens}）`)
            failures++
        } else {
            console.log(`✓ ${name.padEnd(11)} ${theme.padEnd(14)} tokens=${tokens}`)
        }
    }
}

// 未注册的语法应回退为纯文本（'text' 是 shiki 内置的特殊语言）
const fallback = highlighter.codeToHtml('unknown <syntax>', {lang: 'text', theme: 'github-light'})
// shiki 用 hast 的 toHtml 转义，'<' 会输出成 &#x3C;
if (!/&#x3C;syntax>/.test(fallback)) {
    console.error('✗ 未注册语法的纯文本回退异常')
    failures++
} else {
    console.log('✓ 未注册语法回退为 text')
}

console.log(failures === 0 ? '\n全部通过' : `\n${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
