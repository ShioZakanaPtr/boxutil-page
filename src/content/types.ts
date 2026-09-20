import type { IconName } from '../widget/icons.ts'

export interface NavItem {
    /** URL 片段，最终路由为 #/<chapterFolder>/<slug> */
    slug: string
    title: string
    /** 可选短描述，显示在标题下方与左侧目录的悬浮提示里 */
    description?: string
    /** 懒加载的正文 HTML */
    load: () => Promise<string>
}

export interface Chapter {
    /** 目录文件夹名，同时作为路由前缀 */
    folder: string
    title: string
    /** 可选小图标，渲染在章节标题左侧 */
    icon?: IconName
    items: NavItem[]
}
