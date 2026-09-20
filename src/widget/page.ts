import type {Route} from '../nav/nav.ts'
import {PageNav} from './page_nav.ts'

/** 该条目在仓库中的源码位置，显示在标题上方作为面包屑的补充 */
function sourceHint(route: Route): string {
    return `<code class="page__hint">src/content/${route.chapter.folder}/${route.item.slug}.ts</code>`
}

/**
 * 一个条目页面的静态外壳：
 * 开头的标题区（面包屑 + h1 + 描述）→ 正文挂载点 → 底部的左右翻页。
 */
export function pageShell(route: Route): string {
    const {item, chapter} = route

    return `
  <div class="page__head">
    <p class="page__eyebrow">
      <span class="page__chapter">${chapter.title}</span>
      <span class="page__crumb-sep" aria-hidden="true">/</span>
<!--      ${sourceHint(route)}-->
    </p>
    <h1 class="page__title">${item.title}</h1>
    ${item.description ? `<p class="page__lead">${item.description}</p>` : ''}
  </div>
  <article class="prose" id="page-content">
    <p class="page__loading">正在加载…</p>
  </article>
  ${PageNav(route)}`
}
