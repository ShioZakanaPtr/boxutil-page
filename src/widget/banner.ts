import {repo} from '../config.ts'
import {href} from '../nav/router.ts'
import {firstRoute} from '../nav/nav.ts'
import modIcon from '../assets/BUtil_ModIcon.png'
import {icon} from './icons.ts'

/**
 * 顶部横幅：左侧显示当前章节 + 条目标题，右侧是仓库跳转与亮暗主题切换。
 * 标题部分由 app.ts 在路由变化时填充。
 *
 * 左侧元素（目录按钮 / 图标 / 品牌名）始终停靠横幅最左边，
 * 不随目录面板展开或收纳而移动。
 */
export function Banner(): string {
    return `
  <header class="banner">
    <button type="button" class="icon-btn banner__menu" id="nav-toggle"
            aria-label="展开目录" aria-expanded="true" aria-controls="sidebar">
      ${icon('menu')}
    </button>

    <a class="banner__brand" href="${href(firstRoute.path)}" aria-label="回到指南首页">
      <img class="banner__logo" src="${modIcon}" alt="" width="26" height="26" />
      <span class="banner__brand-text">BoxUtil</span>
    </a>

    <div class="banner__titles" aria-live="polite">
      <span class="banner__chapter" id="banner-chapter">指南</span>
      <span class="banner__sep" aria-hidden="true">/</span>
      <span class="banner__item" id="banner-item">${firstRoute.item.title}</span>
    </div>

    <div class="banner__actions">
      <a class="btn btn--icon" href="${repo.url}" target="_blank" rel="noreferrer noopener"
         aria-label="${repo.label}" title="${repo.label}">
        ${icon('github')}
      </a>
      <button type="button" class="btn btn--icon" id="theme-toggle"
              aria-label="切换亮暗主题" title="切换亮暗主题">
        <span class="theme-icon theme-icon--light">${icon('sun')}</span>
        <span class="theme-icon theme-icon--dark">${icon('moon')}</span>
      </button>
    </div>
  </header>`
}
