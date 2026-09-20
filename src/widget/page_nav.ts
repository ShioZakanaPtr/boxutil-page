import type {Route} from '../nav/nav.ts'
import {neighbours} from '../nav/nav.ts'
import {href} from '../nav/router.ts'
import {icon} from './icons.ts'

function prevArrow(): string {
    return icon('arrowLeft')
}

function nextArrow(): string {
    return icon('arrowRight')
}

function link(route: Route, direction: 'prev' | 'next'): string {
    const isPrev = direction === 'prev'
    return `
    <a class="page-nav__link page-nav__link--${direction}" href="${href(route.path)}" rel="${direction}">
      ${isPrev ? `<span class="page-nav__arrow">${prevArrow()}</span>` : ''}
      <span class="page-nav__text">
        <span class="page-nav__label">${isPrev ? '上一节' : '下一节'}</span>
        <span class="page-nav__title">${route.item.title}</span>
        <span class="page-nav__chapter">${route.chapter.title}</span>
      </span>
      ${isPrev ? '' : `<span class="page-nav__arrow">${nextArrow()}</span>`}
    </a>`
}

/**
 * 正文底部的左右翻页。位于首 / 末条目时，对应方向的占位会保留，
 * 保证布局不会因为按钮消失而跳动。
 */
export function PageNav(route: Route): string {
    const {prev, next} = neighbours(route.index)

    return `
  <nav class="page-nav" aria-label="章节内导航">
    ${prev ? link(prev, 'prev') : '<span class="page-nav__placeholder" aria-hidden="true"></span>'}
    ${next ? link(next, 'next') : '<span class="page-nav__placeholder" aria-hidden="true"></span>'}
  </nav>`
}
