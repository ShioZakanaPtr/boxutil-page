import {href} from '../nav/router.ts'

/**
 * 条目页内的 h2 大纲。
 *
 * 内容文件保持纯 HTML：不要求作者把 h2 换成别的控件，也不需要在这里登记标题。
 * 正文挂载后自动扫描一遍 `#page-content` 里的 h2，给它们补上稳定 id，
 * 再把大纲同时渲染到两个地方：
 * - 左侧目录里当前条目的下方（折叠 / 展开由条目右侧的按钮控制，进入条目时自动展开）
 * - PC 端页面右上角的浮动快速导航（无背景，超高时内部滚动）
 *
 * 因此新增 h2 只需要在内容文件里写 `<h2>标题</h2>`，不需要改动本文件。
 */

interface OutlineEntry {
    id: string
    text: string
}

/** 当前页面的 h2 大纲 */
let entries: OutlineEntry[] = []
/** 当前条目的路由路径，用于拼跳转链接 */
let currentPath = ''
let pageOutline: HTMLElement | null = null
let scrollPending = false

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

        // 大纲条目：页面内跳转，不参与 hash 路由（否则会整页重渲染）
        const link = target.closest<HTMLElement>('[data-outline-target]')
        if (!link) return
        if (event.defaultPrevented || event.button !== 0) return
        // 修饰键 / 中键仍然交给浏览器在新标签页打开
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

        const id = link.dataset.outlineTarget
        if (!id) return

        event.preventDefault()
        // 用 replaceState 记下锚点：刷新后能回到同一小节，又不会触发 hashchange 重渲染
        history.replaceState(history.state, '', `${href(currentPath)}#${id}`)
        scrollToHeading(id, true)
        markActive(id)
    })

    window.addEventListener('scroll', onScroll, {passive: true})
}

/**
 * 换页时先清干净，避免上一次的大纲残留在目录里。
 * 这里不动 `has-outline`：正文还在加载时保持原来的正文宽度，
 * 等新内容落位后再由 mountDocOutline 一次性调整，避免出现一次宽度回弹。
 */
export function resetDocOutline(): void {
    entries = []
    for (const item of document.querySelectorAll<HTMLElement>('.nav-item')) {
        const list = item.querySelector<HTMLElement>('.nav-outline')
        const box = item.querySelector<HTMLElement>('.nav-item__outline')
        const toggle = item.querySelector<HTMLButtonElement>('.nav-item__toggle')
        if (list) list.innerHTML = ''
        if (box) {
            box.classList.remove('is-open')
            box.hidden = true
        }
        if (toggle) {
            toggle.hidden = true
            toggle.setAttribute('aria-expanded', 'false')
        }
    }
    if (pageOutline) {
        pageOutline.hidden = true
        pageOutline.querySelector<HTMLElement>('.page-outline__list')!.innerHTML = ''
    }
}

/** 正文挂载后调用：收集 h2 并渲染两处导航 */
export function mountDocOutline(content: HTMLElement, path: string): void {
    resetDocOutline()
    entries = collect(content)
    currentPath = path

    // 有 h2 时给悬浮导航让出右侧空间（宽度切换在这一帧内完成，不会看到回弹）
    document.documentElement.classList.toggle('has-outline', entries.length > 0)

    if (entries.length > 0) {
        mountSidebarOutline(path)
        mountPageOutline()
        restoreAnchor()
    }

    syncActive()
}

/** 给每个 h2 补上 id（已有 id 的沿用），并返回大纲 */
function collect(content: HTMLElement): OutlineEntry[] {
    const used = new Set<string>()
    const result: OutlineEntry[] = []
    let index = 0

    for (const heading of content.querySelectorAll<HTMLHeadingElement>('h2')) {
        const text = (heading.textContent ?? '').trim().replace(/\s+/g, ' ')
        if (!text) continue

        index += 1
        let id = heading.id || `h2-${index}`
        while (used.has(id)) id = `${id}-${index}`
        used.add(id)

        heading.id = id
        heading.dataset.outlineId = id
        result.push({id, text})
    }

    return result
}

/** 左侧目录：当前条目的 h2 列表 + 右侧的展开 / 折叠按钮 */
function mountSidebarOutline(path: string): void {
    const item = document.querySelector<HTMLElement>(`.nav-item[data-nav-item="${path}"]`)
    if (!item) return

    const list = item.querySelector<HTMLElement>('.nav-outline')
    const box = item.querySelector<HTMLElement>('.nav-item__outline')
    const toggle = item.querySelector<HTMLButtonElement>('.nav-item__toggle')
    if (!list || !box || !toggle) return

    list.innerHTML = entries.map((entry) => outlineItem(entry, 'nav-outline')).join('')
    box.hidden = false
    box.classList.add('is-open')
    toggle.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
    updateToggleLabel(toggle, true)

    // 展开后当前条目可能被顶出目录可视区，这里只滚动目录自身，不动页面
    const nav = item.closest<HTMLElement>('.sidebar__nav')
    if (!nav) return
    const itemBox = item.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    if (itemBox.bottom > navBox.bottom) nav.scrollTop += itemBox.bottom - navBox.bottom + 8
    else if (itemBox.top < navBox.top) nav.scrollTop -= navBox.top - itemBox.top + 8
}

/** PC 端右上角的浮动快速导航 */
function mountPageOutline(): void {
    const nav = ensurePageOutline()
    nav.querySelector<HTMLElement>('.page-outline__list')!.innerHTML = entries
        .map((entry) => outlineItem(entry, 'page-outline'))
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

function outlineItem(entry: OutlineEntry, block: string): string {
    const text = escapeHtml(entry.text)
    return `
        <li><a class="${block}__link" href="${href(currentPath)}#${entry.id}"
               data-outline-target="${entry.id}" title="${text}">
          <span class="${block}__text">${text}</span>
        </a></li>`
}

function toggleOutline(toggle: HTMLElement): void {
    const box = toggle.closest('.nav-item')?.querySelector<HTMLElement>('.nav-item__outline')
    if (!box) return
    const open = !box.classList.contains('is-open')
    box.classList.toggle('is-open', open)
    box.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
    updateToggleLabel(toggle, open)
}

function updateToggleLabel(toggle: HTMLElement, open: boolean): void {
    const label = open ? '收起本节小标题' : '展开本节小标题'
    toggle.setAttribute('aria-label', label)
    toggle.title = label
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
    // 等一帧：代码块懒高亮等会引起布局变化，早定位会偏
    window.requestAnimationFrame(() => {
        if (document.getElementById(anchor)) scrollToHeading(anchor, false)
        markActive(anchor)
    })
}

function onScroll(): void {
    if (scrollPending || entries.length === 0) return
    scrollPending = true
    window.requestAnimationFrame(() => {
        scrollPending = false
        syncActive()
    })
}

/** 高亮当前所在小节：第一个被横幅挡住的 h2 就是当前小节 */
function syncActive(): void {
    if (entries.length === 0) return

    const offset = bannerOffset()
    let active = entries[0].id
    for (const entry of entries) {
        const heading = document.getElementById(entry.id)
        if (!heading) continue
        if (heading.getBoundingClientRect().top - offset > 1) break
        active = entry.id
    }

    markActive(active)
}

function markActive(id: string): void {
    for (const link of document.querySelectorAll<HTMLElement>('[data-outline-target]')) {
        const active = link.dataset.outlineTarget === id
        link.classList.toggle('is-active', active)
        if (active) link.setAttribute('aria-current', 'true')
        else link.removeAttribute('aria-current')
    }
}

function bannerOffset(): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--banner-height')
    return parseFloat(value) || 58
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
