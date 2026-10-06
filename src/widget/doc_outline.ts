import {chapterList} from '../nav/chapters.ts'
import {href} from '../nav/router.ts'
import {renderCodeBlocks} from './code_block.ts'

/**
 * 条目页内的 h2 大纲。
 *
 * 内容文件保持纯 HTML：不要求作者把 h2 换成别的控件，也不需要在这里登记标题。
 * 启动后会在后台逐个载入各条目的正文（与路由用的是同一份动态 import），
 * 用 DOMParser 解析出每页 h2 的标题，攒成整站的索引，于是：
 * - 还没进过的条目也能在左侧目录里展开并点击它的小节
 * - 每次进入条目都会自动展开它的小节；离开后其它条目的大纲继续保持原样
 * - 收起只作用于这一次停留：再次进入同一条目会重新展开
 *
 * 当前页面的大纲以真正挂载到 DOM 的正文为准（扫描后补 id），
 * 顺便回写索引，写错内容文件也会立刻自愈。
 */

interface OutlineEntry {
    /** 页面内锚点 id，形如 h2-2 */
    id: string
    title: string
}

/** path → 该条目正文里 h2 的标题（按出现顺序） */
const outlineIndex = new Map<string, string[]>()
/** 当前处于展开状态的条目 */
const expanded = new Set<string>()

/** 当前页面的 h2 大纲（正文挂载后扫描得到） */
let entries: OutlineEntry[] = []
/** 当前条目的路由路径，用于拼跳转链接、区分「本页跳转」与「跨页跳转」 */
let currentPath = ''
/** 上一次渲染的条目路径，用来判断这次是「进入新条目」还是「还停在同一页」 */
let lastPath = ''
let pageOutline: HTMLElement | null = null

/** 程序化滚动期间锁定的高亮目标：滚动中间帧不得把高亮带偏 */
let pinned: string | null = null
let pinTimer = 0
let idleTimer = 0
let scrollPending = false
let indexStarted = false

export function setupDocOutline(): void {
    document.addEventListener('click', (event) => {
        const target = event.target
        if (!(target instanceof Element)) return

        // 条目右侧的展开 / 折叠按钮
        const toggle = target.closest<HTMLElement>('.nav-item__toggle')
        if (toggle) {
            event.preventDefault()
            toggleOutline(toggle)
            return
        }

        // 大纲条目
        const link = target.closest<HTMLElement>('[data-outline-target]')
        if (!link) return
        if (event.defaultPrevented || event.button !== 0) return
        // 修饰键 / 中键仍然交给浏览器在新标签页打开
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

        const path = link.dataset.outlinePath
        const id = link.dataset.outlineTarget
        if (!path || !id) return
        // 别的条目的小节：直接走 hash 跳转，路由会渲染目标页面并定位到锚点
        if (path !== currentPath) return

        event.preventDefault()
        // 用 replaceState 记下锚点：刷新后能回到同一小节，又不会触发 hashchange 重渲染
        history.replaceState(history.state, '', `${href(path)}#${id}`)
        pinActive(id)
        scrollToHeading(id, true)
    })

    window.addEventListener('scroll', onScroll, {passive: true})

    // 首次渲染之后再补索引，别和首屏抢带宽
    window.setTimeout(startIndex, 200)
}

/** 换页时清掉上一页的浮动导航；左侧目录里的大纲是常驻的，不动 */
export function resetDocOutline(): void {
    entries = []
    pinned = null
    window.clearTimeout(pinTimer)
    window.clearTimeout(idleTimer)
    idleTimer = 0
    if (pageOutline) {
        pageOutline.hidden = true
        pageOutline.querySelector<HTMLElement>('.page-outline__list')!.innerHTML = ''
    }
}

/** 正文挂载后调用：收集本页 h2、同步索引与两处导航 */
export function mountDocOutline(content: HTMLElement, path: string): void {
    const entering = path !== lastPath
    lastPath = path

    const scanned = collect(content)
    currentPath = path
    entries = scanned
    // DOM 是权威：顺手校正索引，内容文件的改动立刻生效
    outlineIndex.set(
        path,
        scanned.map((entry) => entry.title),
    )
    renderSidebar()

    document.documentElement.classList.toggle('has-outline', entries.length > 0)

    if (entries.length > 0) {
        // 每次「进入」这个条目都重新展开（上一次主动收起过也一样）；
        // 已经停在本页时再点一次导航不算进入，展开状态原样保留
        if (entering) setExpanded(path, true)
        mountPageOutline()
        restoreAnchor()
    }

    pinned = null
    window.clearTimeout(pinTimer)
    syncActive()
}

/**
 * 后台补齐整站索引。
 *
 * 顺序加载：既能少占带宽，也不会和首屏渲染抢主线程；
 * 模块 import 有缓存，之后真正进入页面时不会再下载一次。
 */
async function startIndex(): Promise<void> {
    if (indexStarted) return
    indexStarted = true

    for (const chapter of chapterList) {
        for (const item of chapter.items) {
            const path = `${chapter.folder}/${item.slug}`
            if (outlineIndex.has(path)) continue
            try {
                outlineIndex.set(path, extractTitles(await item.load()))
            } catch (error) {
                console.error(`[outline] 解析 ${path} 的 h2 失败：`, error)
                outlineIndex.set(path, [])
            }
        }
    }

    renderSidebar()
}

/**
 * 从正文 HTML 里取出 h2 标题。
 *
 * 用 DOMParser 而不是往游离 div 里塞 innerHTML：后者会让插图真的发起请求，
 * 而这里只需要标题文本。
 */
function extractTitles(html: string): string[] {
    const doc = new DOMParser().parseFromString(renderCodeBlocks(html), 'text/html')
    const titles: string[] = []
    for (const heading of doc.body.querySelectorAll('h2')) {
        const title = (heading.textContent ?? '').trim().replace(/\s+/g, ' ')
        if (title) titles.push(title)
    }
    return titles
}

/** 给每个 h2 补上稳定 id（已有 id 的沿用），并返回大纲 */
function collect(content: HTMLElement): OutlineEntry[] {
    const used = new Set<string>()
    const result: OutlineEntry[] = []
    let index = 0

    for (const heading of content.querySelectorAll<HTMLHeadingElement>('h2')) {
        const title = (heading.textContent ?? '').trim().replace(/\s+/g, ' ')
        if (!title) continue

        index += 1
        let id = heading.id || `h2-${index}`
        while (used.has(id)) id = `${id}-${index}`
        used.add(id)

        heading.id = id
        heading.dataset.outlineId = id
        result.push({id, title})
    }

    return result
}

/** 按索引与展开状态重建左侧目录里所有条目的小节列表 */
function renderSidebar(): void {
    for (const item of document.querySelectorAll<HTMLElement>('.nav-item')) {
        const path = item.dataset.navItem
        if (!path) continue

        const list = item.querySelector<HTMLElement>('.nav-outline')
        const box = item.querySelector<HTMLElement>('.nav-item__outline')
        const toggle = item.querySelector<HTMLButtonElement>('.nav-item__toggle')
        if (!list || !box || !toggle) continue

        const titles = outlineIndex.get(path) ?? []
        list.innerHTML = titles.map((title, index) => outlineItem(path, `h2-${index + 1}`, title, 'nav-outline')).join('')

        const has = titles.length > 0
        const open = has && expanded.has(path)
        toggle.hidden = !has
        toggle.setAttribute('aria-expanded', String(open))
        updateToggleLabel(toggle, open)
        box.hidden = !open
        box.classList.toggle('is-open', open)
    }
}

/** 只更新一个条目的展开状态（带 0.1s 过渡） */
function setExpanded(path: string, open: boolean): void {
    const item = document.querySelector<HTMLElement>(`.nav-item[data-nav-item="${path}"]`)
    const box = item?.querySelector<HTMLElement>('.nav-item__outline')
    const toggle = item?.querySelector<HTMLButtonElement>('.nav-item__toggle')
    if (!box || !toggle) return

    if (open) expanded.add(path)
    else expanded.delete(path)

    box.hidden = !open
    box.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    updateToggleLabel(toggle, open)
}

function toggleOutline(toggle: HTMLElement): void {
    const path = toggle.closest<HTMLElement>('.nav-item')?.dataset.navItem
    if (!path) return
    setExpanded(path, !expanded.has(path))
}

function outlineItem(path: string, id: string, title: string, block: string): string {
    const text = escapeHtml(title)
    return `
        <li><a class="${block}__link" href="${href(path)}#${id}"
               data-outline-target="${id}" data-outline-path="${path}" title="${text}">
          <span class="${block}__text">${text}</span>
        </a></li>`
}

function updateToggleLabel(toggle: HTMLElement, open: boolean): void {
    const label = open ? '收起本节小标题' : '展开本节小标题'
    toggle.setAttribute('aria-label', label)
    toggle.title = label
}

/** PC 端右上角的浮动快速导航 */
function mountPageOutline(): void {
    const nav = ensurePageOutline()
    nav.querySelector<HTMLElement>('.page-outline__list')!.innerHTML = entries
        .map((entry) => outlineItem(currentPath, entry.id, entry.title, 'page-outline'))
        .join('')
    nav.hidden = false
    nav.scrollTop = 0
}

function ensurePageOutline(): HTMLElement {
    if (pageOutline?.isConnected) return pageOutline

    const nav = document.createElement('nav')
    nav.className = 'page-outline'
    nav.id = 'page-outline'
    nav.setAttribute('aria-label', '页面内快速导航')
    nav.hidden = true
    nav.innerHTML = '<ul class="page-outline__list"></ul>'
    document.body.append(nav)

    pageOutline = nav
    return nav
}

/** 页面内跳转；位置由 CSS 的 scroll-margin-top 预留横幅高度，标题不会被压住 */
function scrollToHeading(id: string, smooth: boolean): void {
    const target = document.getElementById(id)
    if (!target) return
    target.scrollIntoView({behavior: smooth ? 'smooth' : 'instant', block: 'start'})
}

/** 带锚点打开 / 后退回到某页时，恢复到对应小节 */
function restoreAnchor(): void {
    const anchor = location.hash.split('#')[2]
    if (!anchor || !document.getElementById(anchor)) return
    pinActive(anchor)
    // 等一帧：代码块懒高亮等会引起布局变化，早定位会偏
    window.requestAnimationFrame(() => {
        if (!document.getElementById(anchor)) return
        scrollToHeading(anchor, false)
        markActive(anchor)
    })
}

/**
 * 点过小节之后先把高亮锁在这个小节上，
 * 否则平滑滚动的中间帧会按「当前滚到哪」反复改写高亮，看起来就是没跟上。
 */
function pinActive(id: string): void {
    pinned = id
    markActive(id)
    window.clearTimeout(pinTimer)
    pinTimer = window.setTimeout(releasePin, 1400)
}

function releasePin(): void {
    if (!pinned) return
    pinned = null
    window.clearTimeout(pinTimer)
    syncActive()
}

function onScroll(): void {
    // 滚动停下来才把高亮交回自动判定
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => {
        idleTimer = 0
        releasePin()
    }, 140)

    if (pinned || entries.length === 0) return
    scheduleSync()
}

function scheduleSync(): void {
    if (scrollPending) return
    scrollPending = true
    window.requestAnimationFrame(() => {
        scrollPending = false
        syncActive()
    })
}

/**
 * 高亮当前所在小节：阈值为视口中线，
 * h2 越过屏幕一半就算「已经读到这一节」，而不是等它顶到页面最上方。
 */
function syncActive(): void {
    if (entries.length === 0) return
    if (pinned) {
        markActive(pinned)
        return
    }

    const line = window.innerHeight / 2
    let active = entries[0].id
    for (const entry of entries) {
        const heading = document.getElementById(entry.id)
        if (!heading) continue
        if (heading.getBoundingClientRect().top > line) break
        active = entry.id
    }

    markActive(active)
}

/**
 * 只高亮当前页面的大纲：不同条目里的 h2-1 / h2-2 是同名的，
 * 不按路径过滤会把整站的同名小节一起点亮。
 */
function markActive(id: string): void {
    for (const link of document.querySelectorAll<HTMLElement>('[data-outline-target]')) {
        const active = link.dataset.outlinePath === currentPath && link.dataset.outlineTarget === id
        link.classList.toggle('is-active', active)
        if (active) link.setAttribute('aria-current', 'true')
        else link.removeAttribute('aria-current')
    }
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
