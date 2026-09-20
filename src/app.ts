import {createRouter, HOME_HASH} from './nav/router.ts'
import type {Route} from './nav/nav.ts'
import {firstRoute, neighbours} from './nav/nav.ts'
import {href} from './nav/router.ts'
import {initTheme, onThemeChange, toggleTheme, type Theme} from './theme.ts'
import {setupSidebar, syncSidebar} from './widget/nav.ts'
import {mountCodeBlocks, renderCodeBlocks, setupCodeCopy} from './widget/code_block.ts'
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
            })
            .catch((error: unknown) => {
                if (attempt !== token) return
                console.error(`[page] 加载 ${route.path} 失败：`, error)
                container.innerHTML = errorHtml(route, error)
            })
    }

    router.start()
    setupShortcuts(router)
}

/** ← / → 在条目之间翻页（输入框内不拦截） */
function setupShortcuts(router: {current: () => Route}): void {
    window.addEventListener('keydown', (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

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
