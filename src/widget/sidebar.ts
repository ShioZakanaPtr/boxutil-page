import {chapterList} from '../nav/chapters.ts'
import {href} from '../nav/router.ts'
import {icon} from './icons.ts'

/**
 * 左侧章节目录：章节可展开 / 折叠，条目带缩进，点击进入对应页面。
 *
 * 目录面板停靠在页面最左侧（无留白），「目录」一行右侧的按钮可以把它整体
 * 收纳到屏幕外；收起后左上角只剩横幅里的目录按钮用于重新展开。
 */
export function Sidebar(): string {
    const groups = chapterList
        .map((chapter) => {
            const listId = `nav-group-${chapter.folder}`
            const items = chapter.items
                .map((item) => {
                    const path = `${chapter.folder}/${item.slug}`
                    return `
          <li class="nav-item" data-nav-item="${path}">
            <div class="nav-item__row">
              <a class="nav-link" href="${href(path)}"
                 data-nav-path="${path}"
                 title="${item.description ?? item.title}">
                <span class="nav-link__dot" aria-hidden="true"></span>
                <span class="nav-link__text">${item.title}</span>
              </a>
              <button type="button" class="nav-item__toggle" hidden aria-expanded="false"
                      aria-label="展开本节小标题" title="展开本节小标题">
                <span class="nav-item__chevron" aria-hidden="true">${icon('chevron')}</span>
              </button>
            </div>
            <div class="nav-item__outline" hidden>
              <ul class="nav-outline"></ul>
            </div>
          </li>`
                })
                .join('')

            return `
      <section class="nav-group" data-group="${chapter.folder}">
        <h3 class="nav-group__heading">
          <button type="button" class="nav-group__toggle" data-group-toggle="${chapter.folder}"
                  aria-expanded="false" aria-controls="${listId}">
            <span class="nav-group__chevron" aria-hidden="true">${icon('chevron')}</span>
            <span class="nav-group__title">${chapter.title}</span>
            <span class="nav-group__count">${chapter.items.length}</span>
          </button>
        </h3>
        <div class="nav-group__body" id="${listId}">
          <ul class="nav-list">${items}
          </ul>
        </div>
      </section>`
        })
        .join('')

    return `
  <aside class="sidebar" id="sidebar" aria-label="章节目录">
    <div class="sidebar__head">
      <a class="sidebar__home">目录</a>
      <div class="sidebar__head-actions">
        <button type="button" class="icon-btn sidebar__collapse" data-nav-collapse
                aria-label="收起目录" title="收起目录">
          ${icon('panelLeft')}
        </button>
        <button type="button" class="icon-btn sidebar__close" id="nav-close" aria-label="收起目录">
          ${icon('close')}
        </button>
      </div>
    </div>
    <nav class="sidebar__nav">${groups}
    </nav>
  </aside>
  <div class="backdrop" id="nav-backdrop" hidden></div>`
}
