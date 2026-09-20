import type {Chapter, NavItem} from '../content/types.ts'
import {chapterList} from './chapters.ts'

export interface Route {
    chapter: Chapter
    item: NavItem
    /** 路由参数，形如 'intro/readme' */
    path: string
    /** 在扁平化条目列表中的下标，用于上一页 / 下一页 */
    index: number
}

interface FlatEntry {
    chapter: Chapter
    item: NavItem
    path: string
}

const flatEntries: FlatEntry[] = chapterList.flatMap((chapter) =>
    chapter.items.map((item) => ({
        chapter,
        item,
        path: `${chapter.folder}/${item.slug}`,
    })),
)

const byPath = new Map(flatEntries.map((entry, index) => [entry.path, index]))

export const firstRoute: Route = entryAt(0)

export function allRoutes(): Route[] {
    return flatEntries.map((_, index) => entryAt(index))
}

export function entryAt(index: number): Route {
    const entry = flatEntries[index]
    return {chapter: entry.chapter, item: entry.item, path: entry.path, index}
}

export function routeByPath(path: string): Route | null {
    const index = byPath.get(clean(path))
    return index === undefined ? null : entryAt(index)
}

/** 相邻条目：到边界时返回 null，用于隐藏对应方向的导航按钮 */
export function neighbours(index: number): {prev: Route | null; next: Route | null} {
    return {
        prev: index > 0 ? entryAt(index - 1) : null,
        next: index < flatEntries.length - 1 ? entryAt(index + 1) : null,
    }
}

/** 去掉多余的斜杠与查询串，'/#/intro/readme?x=1' → 'intro/readme' */
function clean(path: string): string {
    return path.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '')
}
