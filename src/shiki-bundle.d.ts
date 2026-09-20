/**
 * shiki 的 `bundle/web` 入口没有从自身路径导出 BundledLanguage / BundledTheme
 * 这两个联合类型（它们定义在内部的 `.d.mts` chunk 中），而从 'shiki' 根入口导入
 * 拿到的是 bundle/full 的类型，与 web bundle 不兼容。
 *
 * 本文件只在类型层面做一次重导出，让业务代码能引用到正确的联合类型。
 * 纯声明文件，不产生任何运行时代码。
 */
export type {BundledLanguage, BundledTheme, Highlighter} from 'shiki/dist/bundle-web'
