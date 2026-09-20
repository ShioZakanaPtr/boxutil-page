// 浏览器测试基础设施：静态托管 dist + 用 CDP 驱动无头 Chrome / Edge。
// verify-page.mjs 与 shots.mjs 共用这一层。
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {mkdtemp, readFile, rm} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {dirname, extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'

export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST = join(PROJECT_ROOT, 'dist')

/** 模拟 GitHub Pages 的子路径部署，保证 base 配置真的生效 */
export const PREFIX = '/boxutil_page/'

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
}

const BROWSERS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function startStaticServer(port) {
    const server = createServer(async (req, res) => {
        let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
        if (pathname.startsWith(PREFIX)) pathname = pathname.slice(PREFIX.length - 1)
        if (pathname === '' || pathname === '/') pathname = '/index.html'

        // 必须以 DIST 为根解析，去掉开头斜杠以免 path.join 丢弃根目录
        const file = join(DIST, normalize(pathname).replace(/^[/\\]+/, ''))
        try {
            const body = await readFile(file)
            res.writeHead(200, {
                'content-type': MIME[extname(file)] ?? 'application/octet-stream',
                // 必须禁用缓存：否则同一浏览器会话会复用上一轮构建里同名的 CSS/JS
                'cache-control': 'no-store, no-cache, must-revalidate',
            })
            res.end(body)
        } catch {
            res.writeHead(404, {'content-type': 'text/plain'}).end('not found')
        }
    })
    return server
}

/** 极简 CDP 客户端：只需要 send / on / once / close */
function connectCdp(url) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url)
        const pending = new Map()
        const handlers = new Map() // method → Set<handler>
        let nextId = 1

        socket.addEventListener('open', () =>
            resolve({
                send(method, params = {}, sessionId) {
                    const id = nextId++
                    return new Promise((res, rej) => {
                        pending.set(id, {res, rej, method})
                        socket.send(JSON.stringify({id, method, params, sessionId}))
                    })
                },
                on(method, handler) {
                    if (!handlers.has(method)) handlers.set(method, new Set())
                    handlers.get(method).add(handler)
                    return () => handlers.get(method)?.delete(handler)
                },
                once(method, handler) {
                    const off = this.on(method, (params) => {
                        off()
                        handler(params)
                    })
                    return off
                },
                close: () => socket.close(),
            }),
        )
        socket.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')))
        socket.addEventListener('message', (event) => {
            const msg = JSON.parse(event.data)
            if (msg.id && pending.has(msg.id)) {
                const {res, rej, method} = pending.get(msg.id)
                pending.delete(msg.id)
                if (msg.error) rej(new Error(`${method}: ${msg.error.message}`))
                else res(msg.result)
                return
            }
            if (!msg.method) return
            for (const handler of handlers.get(msg.method) ?? []) handler(msg.params)
        })
    })
}

/**
 * 启动静态服务器 + 无头浏览器，返回一组操作页面的辅助函数。
 * 调用方负责在 finally 里执行 `await harness.dispose()`。
 */
export async function launch({httpPort = 4319, cdpPort = 9333, viewport = {width: 1440, height: 900}} = {}) {
    const executable = BROWSERS.find((p) => existsSync(p))
    if (!executable) throw new Error('未找到 Chrome / Edge，无法执行浏览器验证')

    if (!existsSync(join(DIST, 'index.html'))) {
        throw new Error('dist/index.html 不存在，请先执行 npm run build')
    }

    const server = startStaticServer()
    await new Promise((resolve) => server.listen(httpPort, '127.0.0.1', resolve))

    const profile = await mkdtemp(join(tmpdir(), 'boxutil-cdp-'))
    const browser = spawn(
        executable,
        [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-background-networking',
            `--window-size=${viewport.width},${viewport.height}`,
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${cdpPort}`,
            'about:blank',
        ],
        {stdio: 'ignore'},
    )

    let cdpUrl = null
    for (let i = 0; i < 80 && !cdpUrl; i++) {
        try {
            const info = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()
            cdpUrl = info.webSocketDebuggerUrl ?? null
        } catch {
            await sleep(250)
        }
    }
    if (!cdpUrl) throw new Error('CDP 端点未就绪')

    const cdp = await connectCdp(cdpUrl)
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'})
    const {sessionId} = await cdp.send('Target.attachToTarget', {targetId, flatten: true})

    const consoleMessages = []
    cdp.on('Runtime.consoleAPICalled', (params) => {
        if (params.type !== 'error' && params.type !== 'warning') return
        consoleMessages.push(params.args.map((a) => a.value ?? a.description ?? a.type).join(' '))
    })
    cdp.on('Runtime.exceptionThrown', (params) => {
        consoleMessages.push(params.exceptionDetails?.exception?.description ?? 'unknown exception')
    })

    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send('Emulation.setDeviceMetricsOverride', {...viewport, deviceScaleFactor: 1, mobile: false}, sessionId)

    async function evaluate(expression) {
        const {result, exceptionDetails} = await cdp.send(
            'Runtime.evaluate',
            {expression, returnByValue: true, awaitPromise: true},
            sessionId,
        )
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'evaluate failed')
        return result.value
    }

    /**
     * 导航到某个 hash 路由，并等待「新内容」真正渲染出来。
     *
     * 难点：SPA 的 hash 跳转不触发 loadEventFired，而旧文档里残留的 .shiki
     * 又会让简单轮询提前返回。这里先在页面上放一个标记节点，之后轮询等待它消失——
     * 无论是整页导航（新文档）还是 hash 跳转（innerHTML 被替换），标记都会消失，
     * 从而保证断言一定跑在新内容上。
     */
    async function visit(hash, {waitForShiki = true, timeout = 8000} = {}) {
        const url = `http://127.0.0.1:${httpPort}${PREFIX}${hash}`
        const marker = `__visit_${Date.now()}_${Math.random().toString(36).slice(2)}`

        // 停在 about:blank 等场景没有可标记的文档，直接用 loadEventFired
        let marked = false
        try {
            marked = (await evaluate(`(() => {
              const el = document.createElement('div')
              el.id = ${JSON.stringify(marker)}
              document.documentElement.append(el)
              return true
            })()`)) === true
        } catch {
            marked = false
        }

        const loaded = marked
            ? Promise.resolve()
            : new Promise((resolve) => {
                  const off = cdp.once('Page.loadEventFired', resolve)
                  setTimeout(() => {
                      off()
                      resolve()
                  }, timeout)
              })

        await cdp.send('Page.navigate', {url}, sessionId)
        await loaded

        const deadline = Date.now() + timeout
        while (Date.now() < deadline) {
            await sleep(80)
            // 新文档还没有这个 id → 标记已随旧内容消失，说明新页面已经渲染
            if (!(await evaluate(`!!document.getElementById(${JSON.stringify(marker)})`))) break
        }

        if (!waitForShiki) return
        await waitForHighlights(timeout)
    }

    /**
     * 等待代码块高亮完成。
     *
     * 代码块是 IntersectionObserver 懒高亮的：当插图把代码推到首屏之外时，
     * 首屏内没有任何 .shiki，需要先滚动一遍把它们带进过视口再等待。
     */
    async function waitForHighlights(timeout) {
        if ((await evaluate(`document.querySelectorAll('.shiki').length`)) === 0) {
            await evaluate(`(() => {
              const step = Math.round(window.innerHeight * 0.8)
              for (let y = 0; y < document.documentElement.scrollHeight; y += step) window.scrollTo(0, y)
              window.scrollTo(0, 0)
              return true
            })()`)
        }

        const deadline = Date.now() + timeout
        while (Date.now() < deadline) {
            await sleep(100)
            if (await evaluate(`!!document.querySelector('.shiki')`)) return
        }
    }

    /** 强制整页重新加载（hash 跳转不会重新执行 index.html 里的首帧主题脚本） */
    async function reload({waitForShiki = true, timeout = 8000} = {}) {
        const {result} = await cdp.send(
            'Runtime.evaluate',
            {expression: 'location.href', returnByValue: true},
            sessionId,
        )
        const url = new URL(result.value)
        // 加一个查询参数，确保是一次真正的文档加载而不是同文档跳转
        url.searchParams.set('__reload', String(Date.now()))

        const markers = await evaluate(`(() => {
          const el = document.createElement('div')
          el.id = '__reload_marker'
          document.documentElement.append(el)
          return true
        })()`)

        const loaded = markers
            ? Promise.resolve()
            : new Promise((resolve) => {
                  const off = cdp.once('Page.loadEventFired', resolve)
                  setTimeout(() => {
                      off()
                      resolve()
                  }, timeout)
              })

        await cdp.send('Page.navigate', {url: url.toString()}, sessionId)
        await loaded

        const deadline = Date.now() + timeout
        while (Date.now() < deadline) {
            await sleep(80)
            if (!(await evaluate(`!!document.getElementById('__reload_marker')`))) break
        }

        if (!waitForShiki) return
        await waitForHighlights(timeout)
    }

    return {
        cdp,
        sessionId,
        evaluate,
        visit,
        reload,
        sleep,
        consoleMessages,
        setViewport: (v) =>
            cdp.send('Emulation.setDeviceMetricsOverride', {...v, deviceScaleFactor: v.deviceScaleFactor ?? 1, mobile: v.mobile ?? false}, sessionId),
        clearViewport: () => cdp.send('Emulation.clearDeviceMetricsOverride', {}, sessionId),
        screenshot: async (file) => {
            const {data} = await cdp.send('Page.captureScreenshot', {format: 'png'}, sessionId)
            const {writeFile, mkdir} = await import('node:fs/promises')
            await mkdir(dirname(file), {recursive: true})
            await writeFile(file, Buffer.from(data, 'base64'))
            return file
        },
        async dispose() {
            cdp.close()
            browser.kill()
            server.close()
            await rm(profile, {recursive: true, force: true}).catch(() => {})
        },
    }
}
