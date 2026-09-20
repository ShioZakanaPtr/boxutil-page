export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'boxutil-guide-theme'
const DARK_CLASS = 'dark'

/** shiki 明暗主题名；主题切换后已渲染的代码块会按新主题重排（见 widget/code_block.ts） */
export const SHIKI_THEME: Record<Theme, string> = {
    light: 'one-light',
    dark: 'one-dark-pro',
}

export function getTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : prefersDark() ? 'dark' : 'light'
}

function prefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function apply(theme: Theme): void {
    document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
    document.documentElement.style.colorScheme = theme
}

type ThemeListener = (theme: Theme) => void

const listeners = new Set<ThemeListener>()

export function publishTheme(theme: Theme): void {
    listeners.forEach((listener) => listener(theme))
}

/**
 * 初始化主题并返回当前明暗状态。
 *
 * - 优先读取 localStorage 中用户的显式选择，没有则跟随系统 `prefers-color-scheme`
 * - 系统主题变化时，仅在用户尚未显式选择过的情况下跟随
 */
export function initTheme(): Theme {
    let theme = getTheme()
    apply(theme)

    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        if (localStorage.getItem(STORAGE_KEY)) return
        theme = event.matches ? 'dark' : 'light'
        apply(theme)
        publishTheme(theme)
    })

    return theme
}

export function toggleTheme(): Theme {
    const theme: Theme = document.documentElement.classList.contains(DARK_CLASS) ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, theme)
    apply(theme)
    publishTheme(theme)
    return theme
}

/** 注册主题变化监听（用于按新主题重渲染 shiki 代码块） */
export function onThemeChange(listener: ThemeListener): void {
    listeners.add(listener)
}
