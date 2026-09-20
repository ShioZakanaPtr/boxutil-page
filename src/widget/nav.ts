import {chapterList} from '../nav/chapters.ts'
import {icon} from './icons.ts'
const OPEN_GROUP_KEY = 'boxutil-guide-open-group'
const COLLAPSED_KEY = 'boxutil-guide-nav-collapsed'
const MOBILE_QUERY = '(max-width: 980px)'

function isMobile(): boolean {
    return window.matchMedia(MOBILE_QUERY).matches
}

/**
 * 左侧目录的交互：
 * - 章节标题按钮展开 / 折叠 item 列表（用 hidden 属性承载状态，配合 CSS grid 过渡）
 * - 桌面端：「目录」右侧的按钮把整个面板收纳到左侧屏幕外，状态写入 localStorage
 * - 窄屏：自动切换为抽屉，汉堡按钮打开，点击条目标签 / 遮罩 / Esc 关闭
 */
export function setupSidebar(): void {
    const root = document.documentElement
    const sidebar = document.querySelector<HTMLElement>('#sidebar')!
    const toggle = document.querySelector<HTMLButtonElement>('#nav-toggle')!
    const close = document.querySelector<HTMLButtonElement>('#nav-close')!
    const backdrop = document.querySelector<HTMLElement>('#nav-backdrop')!

    let collapsed = localStorage.getItem(COLLAPSED_KEY) === 'true'

    /** 桌面端的收纳状态 */
    const setCollapsed = (next: boolean): void => {
        collapsed = next
        localStorage.setItem(COLLAPSED_KEY, String(next))
        // 只在桌面端生效，避免和窄屏抽屉的 transform 打架（由 CSS 的媒体查询保证）
        root.classList.toggle('is-nav-collapsed', next)
        updateToggle()
    }

    /** 窄屏抽屉状态 */
    const setDrawer = (open: boolean): void => {
        root.classList.toggle('is-nav-open', open)
        backdrop.hidden = !open
        updateToggle()
    }

    /** 横幅按钮同时服务于两种模式，需要把状态同步到 aria 上 */
    function updateToggle(): void {
        const open = isMobile() ? root.classList.contains('is-nav-open') : !collapsed
        toggle.setAttribute('aria-expanded', String(open))
        const label = open ? '收起目录' : '展开目录'
        toggle.setAttribute('aria-label', label)
        toggle.title = label
        toggle.innerHTML = icon(open ? 'panelLeft' : 'menu')
    }

    // Esc：窄屏关抽屉，桌面端展开被收纳的面板
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return
        if (root.classList.contains('is-nav-open')) setDrawer(false)
        else if (collapsed) setCollapsed(false)
    })

    // 每个章节各自的展开 / 折叠
    const rememberedGroup = localStorage.getItem(OPEN_GROUP_KEY)

    for (const chapter of chapterList) {
        const group = sidebar.querySelector<HTMLElement>(`.nav-group[data-group="${chapter.folder}"]`)!
        const button = group.querySelector<HTMLButtonElement>('.nav-group__toggle')!
        const body = group.querySelector<HTMLElement>('.nav-group__body')!

        // 桌面端默认只展开第一章，其余折叠；窄屏抽屉里全部展开更省一次点击
        const open = isMobile()
            ? true
            : rememberedGroup
              ? rememberedGroup === chapter.folder
              : chapter.folder === chapterList[0].folder
        setGroupOpen(group, button, body, open)

        button.addEventListener('click', () => {
            const next = button.getAttribute('aria-expanded') !== 'true'
            setGroupOpen(group, button, body, next)
            if (next) localStorage.setItem(OPEN_GROUP_KEY, chapter.folder)
            else localStorage.removeItem(OPEN_GROUP_KEY)
        })
    }

    root.classList.toggle('is-nav-collapsed', collapsed)
    updateToggle()

    toggle.addEventListener('click', () => {
        if (isMobile()) setDrawer(!root.classList.contains('is-nav-open'))
        else setCollapsed(!collapsed)
    })

    close.addEventListener('click', () => setDrawer(false))
    backdrop.addEventListener('click', () => setDrawer(false))

    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-nav-collapse]')) {
        button.addEventListener('click', () => setCollapsed(true))
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-nav-expand]')) {
        button.addEventListener('click', () => {
            setCollapsed(false)
            setDrawer(false)
        })
    }

    // 抽屉里点条目后立刻收起，否则会挡住刚打开的正文
    sidebar.addEventListener('click', (event) => {
        if (isMobile() && (event.target as HTMLElement).closest('.nav-link')) setDrawer(false)
    })

    // 跨过断点时切换模式：拉宽回桌面要清掉抽屉状态，避免遮罩残留
    window.matchMedia(MOBILE_QUERY).addEventListener('change', (event) => {
        if (event.matches) {
            // 进入窄屏：收纳状态让位给抽屉，避免整个面板被移出视口
            root.classList.remove('is-nav-collapsed')
        } else {
            setDrawer(false)
            // 回到桌面：恢复用户此前选择的收纳状态
            root.classList.toggle('is-nav-collapsed', collapsed)
        }
        updateToggle()
    })
}

function setGroupOpen(group: HTMLElement, button: HTMLButtonElement, body: HTMLElement, open: boolean): void {
    group.classList.toggle('is-open', open)
    button.setAttribute('aria-expanded', String(open))
    body.hidden = !open
}

/**
 * 路由变化时同步目录：高亮当前条目、展开所属章节、把条目滚进可视区域。
 * 由 app.ts 在每次渲染后调用。
 */
export function syncSidebar(path: string): void {
    const sidebar = document.querySelector<HTMLElement>('#sidebar')
    if (!sidebar) return

    let active: HTMLElement | null = null

    for (const link of sidebar.querySelectorAll<HTMLElement>('.nav-link')) {
        const isActive = link.dataset.navPath === path
        link.classList.toggle('is-active', isActive)
        if (isActive) {
            link.setAttribute('aria-current', 'page')
            active = link
        } else {
            link.removeAttribute('aria-current')
        }
    }

    if (!active) return

    const group = active.closest<HTMLElement>('.nav-group')
    if (!group) return

    group.classList.add('is-open')
    group.querySelector<HTMLElement>('.nav-group__toggle')?.setAttribute('aria-expanded', 'true')
    const body = group.querySelector<HTMLElement>('.nav-group__body')
    if (body) body.hidden = false

    active.scrollIntoView({block: 'nearest'})
}
