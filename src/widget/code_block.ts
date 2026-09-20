import {createHighlighterCore} from 'shiki/core'
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript'
import type {BundledLanguage, BundledTheme, Highlighter} from '../shiki-bundle.d.ts'
import {getTheme, onThemeChange, SHIKI_THEME, type Theme} from '../theme.ts'
import {icon} from './icons.ts'

/**
 * 细粒度打包：只注册本指南真正用到的语法与主题。
 *
 * 相比 `shiki/bundle/web`，这样不会为内置的每个语言 / 主题生成 chunk。
 * 新增代码块语法时，在下面的映射里补一行即可；未注册的语法会回退成纯文本。
 */
const LANGS = {
    java: () => import('shiki/langs/java.mjs'),
    json: () => import('shiki/langs/json.mjs'),
    glsl: () => import('shiki/langs/glsl.mjs'),
} satisfies Record<string, () => Promise<unknown>>

const THEMES = {
    [SHIKI_THEME.light]: () => import('shiki/themes/one-light.mjs'),
    [SHIKI_THEME.dark]: () => import('shiki/themes/one-dark-pro.mjs'),
} satisfies Record<string, () => Promise<unknown>>

type Lang = keyof typeof LANGS

/** 代码块里写的语言名 → 上面注册的语法名；未登记的一律按纯文本处理 */
function resolveLang(lang: string): Lang | null {
    return lang in LANGS ? (lang as Lang) : null
}

let highlighterPromise: Promise<Highlighter> | null = null

async function loadShiki(): Promise<Highlighter> {
    const [langs, themes] = await Promise.all([
        Promise.all(Object.values(LANGS).map((load) => load())),
        Promise.all(Object.values(THEMES).map((load) => load())),
    ])

    return createHighlighterCore({
        // 纯 JS 正则引擎：无需加载 oniguruma wasm，体积和首屏都更友好
        engine: createJavaScriptRegexEngine(),
        langs: langs.map((mod) => (mod as {default: never}).default),
        themes: themes.map((mod) => (mod as {default: never}).default),
    })
}

/** 按需创建并复用高亮器实例（shiki 官方推荐的长生命周期用法） */
function shiki(): Promise<Highlighter> {
    highlighterPromise ??= loadShiki()
    return highlighterPromise
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function highlight(code: string, lang: string, theme: Theme): Promise<string> {
    const instance = await shiki()
    const resolved = resolveLang(lang)

    return instance.codeToHtml(code, {
        // 未注册的语法用 'text'，shiki 会原样输出文本
        lang: (resolved ?? 'text') as BundledLanguage,
        theme: SHIKI_THEME[theme] as BundledTheme,
        // 去掉 shiki 写在 <pre> 上的内联背景色，交给 CSS 变量控制，避免亮暗主题下色差
        transformers: [
            {
                pre(node: {properties: Record<string, unknown>}) {
                    delete node.properties.style
                },
            },
        ],
    })
}

/** 高亮前原始代码用的 class；高亮后会被 shiki 输出替换，因此复制一律读 data-code */

/**
 * 生成一个 shiki 代码块。
 *
 * 高亮是异步的，并且用 IntersectionObserver 做了懒加载：只有滚动到可视区域附近的
 * 代码块才会触发 shiki 解析，长文档首屏因此不会被高亮阻塞。
 * 主题切换时已渲染的代码块会按新主题重新高亮。
 */
export function highlightCode(code: string, lang = 'text', title?: string): string {
    const source = code.replace(/^\n+/, '').replace(/\s+$/, '')
    const label = title ?? lang

    return `
    <figure class="code-block" data-lang="${escapeHtml(label)}">
      <figcaption class="code-block__bar">
        <span class="code-block__lang">${escapeHtml(label)}</span>
        <button type="button" class="code-block__copy icon-btn" aria-label="复制代码" title="复制代码">
          ${icon('copy')}${icon('check')}
        </button>
      </figcaption>
      <div class="code-block__body" data-code="${encodeURIComponent(source)}" data-lang-id="${escapeHtml(lang)}">
        <pre class="code-block__loading"><code class="code-raw">${escapeHtml(source)}</code></pre>
      </div>
    </figure>`
}

/** 去掉代码围栏相对 marker 的公共缩进，让内容文件里的代码能缩进排版 */
function dedent(code: string): string {
    const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
    const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length)
    const pad = indents.length > 0 ? Math.min(...indents) : 0
    return pad > 0 ? lines.map((line) => line.slice(pad)).join('\n') : lines.join('\n')
}

/**
 * 把正文里的代码围栏标记替换成 shiki 代码块外壳：
 *
 *   <!-- code: typescript -->
 *   const a = 1
 *   <!-- /code -->
 *
 * 也支持标题：`<!-- code: typescript | 可选标题 -->`。
 * 必须在写入 DOM 之前调用——注释节点一旦被解析成 DOM，就会丢掉原始缩进。
 */
export function renderCodeBlocks(html: string): string {
    return html.replace(
        /[ \t]*<!--\s*code:\s*([\w+-]+)\s*(?:\|\s*([^>]*?)\s*)?-->([\s\S]*?)<!--\s*\/code\s*-->[ \t]*\n?/g,
        (_match, lang: string, title: string | undefined, body: string) =>
            highlightCode(dedent(body), lang, title?.trim() || undefined),
    )
}

async function render(body: HTMLElement): Promise<void> {
    const lang = body.dataset.langId || 'text'
    const code = decodeURIComponent(body.dataset.code ?? '')

    try {
        body.innerHTML = await highlight(code, lang, getTheme())
    } catch (error) {
        console.error('[shiki] 高亮失败，回退为纯文本：', error)
        body.innerHTML = `<pre class="code-block__fallback"><code class="code-raw">${escapeHtml(code)}</code></pre>`
    }

    body.dataset.rendered = 'true'
}

let observerBound = false

/** 挂载所有代码块：懒高亮 + 主题联动 */
export function mountCodeBlocks(root: HTMLElement): void {
    const bodies = Array.from(root.querySelectorAll<HTMLElement>('.code-block__body'))
    if (bodies.length === 0) return

    const pending = new Set(bodies)

    const start = (body: HTMLElement): void => {
        if (!pending.delete(body)) return
        void render(body)
    }

    // 提前 400px 预加载，用户滚动到代码块时通常已经高亮完成
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue
                observer.unobserve(entry.target)
                start(entry.target as HTMLElement)
            }
        },
        {rootMargin: '400px 0px'},
    )

    for (const body of bodies) {
        // 可视区域内的代码块直接高亮，不必等 IntersectionObserver 的首帧回调
        if (body.getBoundingClientRect().top < window.innerHeight + 400) start(body)
        else observer.observe(body)
    }

    if (observerBound) return
    observerBound = true

    onThemeChange(() => {
        // 主题切换：已渲染的代码块按新主题重排，尚未渲染的继续保持懒加载
        for (const body of document.querySelectorAll<HTMLElement>('.code-block__body')) {
            if (body.dataset.rendered !== 'true') continue
            void render(body)
        }
    })
}

/**
 * 复制按钮的全局事件委托。
 * 代码块会被反复重建（换页 / 换主题），委托比逐个绑定更省事也更稳。
 */
export function setupCodeCopy(): void {
    document.addEventListener('click', async (event) => {
        const button = (event.target as HTMLElement)?.closest?.<HTMLButtonElement>('.code-block__copy')
        if (!button) return

        // 原始代码存在 data-code 上：高亮后 .code-raw 会被 shiki 的输出替换掉
        const body = button.closest('.code-block')?.querySelector<HTMLElement>('.code-block__body')
        const encoded = body?.dataset.code
        if (!encoded) return
        const text = decodeURIComponent(encoded)

        try {
            await navigator.clipboard.writeText(text)
        } catch {
            // 非安全上下文（例如用 http 直接打开构建产物）下 clipboard API 不可用
            const textarea = document.createElement('textarea')
            textarea.value = text
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.append(textarea)
            textarea.select()
            document.execCommand('copy')
            textarea.remove()
        }

        button.dataset.state = 'copied'
        window.setTimeout(() => delete button.dataset.state, 1600)
    })
}
