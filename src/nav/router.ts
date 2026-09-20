import {firstRoute, routeByPath, type Route} from './nav.ts'

export const ROUTE_PREFIX = '#/'
export const HOME_HASH = `${ROUTE_PREFIX}${firstRoute.path}`

export function readRoute(): Route {
    const path = location.hash.replace(/^#\/?/, '')
    return routeByPath(path) ?? firstRoute
}

export function href(path: string): string {
    return `${ROUTE_PREFIX}${path}`
}

export function isHomeHash(): boolean {
    const hash = location.hash
    return hash === '' || hash === '#' || hash === '#/'
}

type RouteListener = (route: Route) => void

/**
 * 基于 location.hash 的路由。
 *
 * 之所以不用 History API 的路径形式：静态托管（GitHub Pages）上直接刷新
 * /intro/readme 会 404，而 hash 路由永远指向 index.html，分享出去的链接也能直接打开。
 *
 * 历史记录由 hash 跳转和初始的 replaceState 共同维护，因此浏览器后退键可以
 * 在条目之间回退；这里额外把路由存进 history.state，方便调试与恢复。
 */
export function createRouter(onChange: RouteListener) {
    let lastHash = ''

    const sync = (): void => {
        const route = readRoute()
        const hash = location.hash || HOME_HASH

        // hashchange 与 popstate 可能同时触发，去重避免同一路由渲染两次
        if (hash === lastHash) return
        lastHash = hash

        // 只写 state，不改动 URL：URL 已经由 hash 跳转或初始化负责
        history.replaceState({path: route.path}, '', hash)
        onChange(route)
    }

    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)

    return {
        current: readRoute,
        /** 首次渲染：补上默认 hash 并渲染，不额外留下历史记录 */
        start: () => sync(),
        /** 手动触发一次同步（用于 hash 未变化的边界情况） */
        sync,
    }
}
