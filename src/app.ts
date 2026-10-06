import {createRouter, HOME_HASH} from './nav/router.ts'
import type {Route} from './nav/nav.ts'
import {firstRoute, neighbours} from './nav/nav.ts'
import {href} from './nav/router.ts'
import {initTheme, onThemeChange, toggleTheme, type Theme} from './theme.ts'
import {setupSidebar, syncSidebar} from './widget/nav.ts'
import {mountCodeBlocks, renderCodeBlocks, setupCodeCopy} from './widget/code_block.ts'
import {closeLightbox, isLightboxOpen, setupLightbox} from './widget/lightbox.ts'
import {mountDocOutline, resetDocOutline, setupDocOutline} from './widget/doc_outline.ts'
import {pageShell} from './widget/page.ts'

function applyThemeIcon(theme: Theme): void {
    const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')
    if (!toggle) return
    const label = theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'
    toggle.setAttribute('aria-label', label)
    toggle.title = label
    toggle.dataset.theme = theme
}

function setBannerTitle(route: Route): void {
    document.querySelector('#banner-chapter')!.textContent = route.chapter.title
    document.querySelector('#banner-item')!.textContent = route.item.title
}

function errorHtml(route: Route, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    return `
    <div class="callout callout--danger">
      <p><strong>页面内容加载失败。</strong>请刷新重试，或返回
      <a href="${href(route.path)}">当前页面</a>。</p>
      <p><code>${route.path}</code> · ${message}</p>
    </div>`
}

export function mount(root: HTMLElement): void {
    applyThemeIcon(initTheme())
    onThemeChange((theme) => applyThemeIcon(theme))

    document.querySelector<HTMLButtonElement>('#theme-toggle')!.addEventListener('click', () => {
        applyThemeIcon(toggleTheme())
    })

    setupSidebar()
    // 代码块的复制按钮用事件委托，全局绑定一次即可
    setupCodeCopy()
    // 插图放大预览与正文 h2 大纲同样走全局事件委托
    setupLightbox()
    setupDocOutline()

    const page = root.querySelector<HTMLElement>('#page')!
    const router = createRouter(render)

    // 直接访问站点根路径时补上默认 hash，保证链接可分享、刷新后停在同一个条目
    if (!location.hash) history.replaceState({path: firstRoute.path}, '', HOME_HASH)

    let token = 0

    function render(route: Route): void {
        // 快速切换时会有多次异步加载在飞，用递增的 token 丢弃过期结果
        const attempt = ++token

        document.title = `${route.item.title} · BoxUtil 使用指南`
        setBannerTitle(route)
        document.documentElement.dataset.route = route.path

        page.innerHTML = pageShell(route)
        // 换页会连预览的源图片一起替换掉，直接收起预览（不做飞回动画）
        closeLightbox()
        // 上一条目的 h2 大纲不能留在目录里，正文加载期间先清空
        resetDocOutline()
        syncSidebar(route.path)

        // 换页后回到顶部；'instant' 覆盖 CSS 的 smooth，避免长文档平滑滚动耗时过长
        window.scrollTo({top: 0, behavior: 'instant'})

        const container = page.querySelector<HTMLElement>('#page-content')!

        route.item
            .load()
            .then((html) => {
                if (attempt !== token) return
                // 先替换代码围栏标记，再写入 DOM（写入后就取不到原始缩进了）
                container.innerHTML = renderCodeBlocks(html)
                mountCodeBlocks(container)
                // 正文就位后再扫描 h2：内容文件不需要为大纲做任何额外登记
                mountDocOutline(container, route.path)
            })
            .catch((error: unknown) => {
                if (attempt !== token) return
                console.error(`[page] 加载 ${route.path} 失败：`, error)
                container.innerHTML = errorHtml(route, error)
                // 错误正文里没有 h2，这里顺带把大纲与右侧留白复位
                mountDocOutline(container, route.path)
            })
    }

    router.start()
    setupShortcuts(router)
}

/** ← / → 在条目之间翻页（输入框内不拦截；图片预览打开时按键归预览所有） */
function setupShortcuts(router: {current: () => Route}): void {
    window.addEventListener('keydown', (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
        if (isLightboxOpen()) return

        // 事件目标可能是 document 或 window（不是 Element），必须先判断再调用 closest
        const target = event.target
        if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return

        const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        if (step === 0) return

        const {prev, next} = neighbours(router.current().index)
        const targetRoute = step < 0 ? prev : next
        if (!targetRoute) return

        event.preventDefault()
        location.hash = href(targetRoute.path)
    })
}
