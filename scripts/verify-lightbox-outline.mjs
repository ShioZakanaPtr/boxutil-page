// 真实浏览器端到端验证「插图放大预览」与「页内 h2 导航」。
//
// 用法：
//   npm run build && npm run verify:interaction
import {launch} from './browser-harness.mjs'

let failures = 0
function check(label, ok, extra = '') {
    if (ok) {
        console.log(`✓ ${label}`)
    } else {
        failures++
        console.error(`✗ ${label}${extra ? ` — ${extra}` : ''}`)
    }
}

const harness = await launch()
const {evaluate, visit, reload, sleep, setViewport, clearViewport} = harness

/** 轮询等待页面进入某个状态：SPA 的路由渲染与后台索引都是异步的 */
async function waitFor(expression, timeout = 10000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
        if (await evaluate(expression)) return true
        await sleep(100)
    }
    return false
}

async function diagnose(context) {
    const probe = await evaluate(`(() => ({
      href: location.href,
      title: document.querySelector('.page__title')?.textContent ?? null,
      figures: document.querySelectorAll('.doc-figure img').length,
      outlines: document.querySelectorAll('.nav-outline__link').length,
      loadError: document.querySelector('.callout--danger')?.textContent?.trim().slice(0, 200) ?? null,
    }))()`).catch((error) => ({probeFailed: String(error)}))
    console.error(`页面状态（${context}）：`, JSON.stringify(probe))
}

try {
    // ======================= 一、插图放大预览 =======================
    // 先把上一轮可能残留的界面偏好清掉，保证断言从默认状态开始
    await visit('#/intro/thread-dispatch')
    await evaluate(`localStorage.removeItem('boxutil-guide-image-filter')`)
    await evaluate(`localStorage.removeItem('boxutil-guide-nav-outline-collapsed')`)
    await reload()
    if (!(await waitFor(`!!document.querySelector('.doc-figure img')`))) {
        await diagnose('打开 thread-dispatch')
        throw new Error('条目页没有渲染出插图')
    }

    const source = await evaluate(`(() => {
      const img = document.querySelector('.doc-figure img')
      return {
        exists: !!img,
        complete: img.complete,
        natural: [img.naturalWidth, img.naturalHeight],
        cursor: getComputedStyle(img).cursor,
      }
    })()`)

    check('正文里有插图', source.exists === true && source.complete === true, JSON.stringify(source.natural))
    check('插图比窗口大（覆盖缩小分支）', source.natural[0] > 1440 && source.natural[1] > 900, JSON.stringify(source.natural))
    check('插图鼠标指针提示可放大', source.cursor === 'zoom-in', source.cursor)

    // 打开预览：同一帧内应该已经进入「从原位置起飞」的状态，
    // 因此这里把「起飞状态」和「过渡期间屏蔽输入」放在同一次求值里，避免 CDP 往返错过动画窗口
    const opened = await evaluate(`(() => {
      const root = document.documentElement
      window.scrollTo({top: 240, behavior: 'instant'})
      const scrollBefore = window.scrollY
      document.querySelector('.doc-figure img').click()

      const box = document.querySelector('.lightbox')
      const img = document.querySelector('.lightbox__image')
      const style = getComputedStyle(img)
      const start = {
        hidden: box.hidden,
        modal: box.getAttribute('aria-modal'),
        locked: root.classList.contains('is-lightbox-open'),
        rootOverflow: getComputedStyle(root).overflow,
        animating: box.classList.contains('is-animating'),
        ready: box.classList.contains('is-ready'),
        startTransform: style.transform,
        startOpacity: style.opacity,
        alt: img.alt,
        scrollBefore,
        scrollAfter: window.scrollY,
      }

      // 过渡进行中：滚轮与 Esc 都必须被忽略
      const zoomBefore = document.querySelector('.lightbox__zoom').textContent
      const rect = img.getBoundingClientRect()
      document.querySelector('.lightbox__viewport').dispatchEvent(new WheelEvent('wheel', {
        deltaY: -400, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        bubbles: true, cancelable: true,
      }))
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))

      return {
        ...start,
        zoomBefore,
        zoomAfter: document.querySelector('.lightbox__zoom').textContent,
        stillOpen: box.hidden === false,
      }
    })()`)

    check('点击插图后预览层出现', opened.hidden === false)
    check('预览层是模态对话框', opened.modal === 'true')
    check('预览打开时锁定页面滚动', opened.locked === true && opened.rootOverflow === 'hidden', `${opened.locked} / ${opened.rootOverflow}`)
    check('锁定滚动不改变当前滚动位置', opened.scrollAfter === opened.scrollBefore && opened.scrollBefore === 240, `${opened.scrollBefore} → ${opened.scrollAfter}`)
    check('过渡期间标记为动画中', opened.animating === true && opened.ready === false)
    check('图片从页面原位置起飞（起点不是单位变换）', opened.startTransform !== 'none', opened.startTransform)
    check('图片淡入（起点透明度低于 1）', parseFloat(opened.startOpacity) < 1, opened.startOpacity)
    check('预览沿用插图的替代文本', opened.alt === 'BUtil_ThreadFlow', opened.alt)
    check('过渡期间忽略滚轮', opened.zoomBefore === opened.zoomAfter, `${opened.zoomBefore} → ${opened.zoomAfter}`)
    check('过渡期间忽略 Esc', opened.stillOpen === true)

    await sleep(320)

    const landed = await evaluate(`(() => {
      const box = document.querySelector('.lightbox')
      const img = document.querySelector('.lightbox__image')
      const r = img.getBoundingClientRect()
      const viewport = document.querySelector('.lightbox__viewport')
      const style = getComputedStyle(viewport)
      const vpRect = viewport.getBoundingClientRect()
      const boxWidth = vpRect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const boxHeight = vpRect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const natural = [img.naturalWidth, img.naturalHeight]
      const fit = Math.max(0.05, Math.min(1, boxWidth / natural[0], boxHeight / natural[1]))
      const actions = [...document.querySelectorAll('.lightbox__action')]
      return {
        ready: box.classList.contains('is-ready'),
        animating: box.classList.contains('is-animating'),
        rect: {left: r.left, width: r.width, height: r.height},
        cx: r.left + r.width / 2,
        natural,
        fit,
        zoom: document.querySelector('.lightbox__zoom').textContent,
        size: document.querySelector('.lightbox__size').textContent.trim(),
        dividers: document.querySelectorAll('.lightbox__divider').length,
        actionCount: actions.length,
        actionTags: actions.map((b) => b.tagName),
        actionHasSvg: actions.map((b) => !!b.querySelector('svg')),
        actionText: actions.map((b) => b.textContent.trim()),
        actionDisabled: actions.map((b) => b.disabled),
        iconPaths: actions.map((b) => b.querySelector('path')?.getAttribute('d') ?? ''),
        fitActive: document.querySelector('[data-action="fit"]').classList.contains('is-active'),
        actualActive: document.querySelector('[data-action="actual"]').classList.contains('is-active'),
        filterActive: document.querySelector('[data-action="filter"]').dataset.filter,
        imageRendering: getComputedStyle(img).imageRendering,
        storedFilter: localStorage.getItem('boxutil-guide-image-filter'),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        barBottom: getComputedStyle(document.querySelector('.lightbox__bar')).bottom,
        barOpacity: getComputedStyle(document.querySelector('.lightbox__bar')).opacity,
      }
    })()`)

    check('过渡结束后进入可交互状态', landed.ready === true && landed.animating === false)
    check('工具条在过渡结束后淡入', parseFloat(landed.barOpacity) > 0.5, landed.barOpacity)
    check('工具条位于画面下方', parseFloat(landed.barBottom) > 0, landed.barBottom)
    check('图片水平居中', Math.abs(landed.cx - landed.innerWidth / 2) <= 1, `${landed.cx} vs ${landed.innerWidth / 2}`)
    check(
        '图片按自适应尺寸完整显示在窗口内',
        landed.rect.width <= landed.innerWidth &&
            landed.rect.height <= landed.innerHeight &&
            landed.rect.width <= landed.natural[0] * landed.fit + 0.5 &&
            landed.rect.width >= landed.natural[0] * landed.fit - 3 &&
            landed.rect.height <= landed.natural[1] * landed.fit + 0.5 &&
            landed.rect.height >= landed.natural[1] * landed.fit - 3,
        `${Math.round(landed.rect.width)}×${Math.round(landed.rect.height)} fit=${landed.fit.toFixed(3)}`,
    )
    check('自适应倍率小于 100%（说明确实缩小了）', landed.fit < 0.99, String(landed.fit))
    check('缩放倍率与实际显示一致', landed.zoom === `${Math.round(landed.fit * 100)}%`, landed.zoom)

    // ---- 工具条结构：三组 + 分割线 + 图标按钮 ----
    check('倍率右侧显示当前尺寸', /^\d+ x \d+$/.test(landed.size), landed.size)
    check(
        '尺寸文本等于当前显示像素',
        landed.size === `${Math.round(landed.rect.width)} x ${Math.round(landed.rect.height)}`,
        `${landed.size} vs ${Math.round(landed.rect.width)} x ${Math.round(landed.rect.height)}`,
    )
    check('三组之间有两道分割线', landed.dividers === 2, String(landed.dividers))
    check('共三个调节按钮', landed.actionCount === 3, String(landed.actionCount))
    check('调节按钮都是 button', landed.actionTags.every((t) => t === 'BUTTON'), landed.actionTags.join(','))
    check('调节按钮改用 svg 图标（无文字）', landed.actionHasSvg.every(Boolean) && landed.actionText.every((t) => t === ''), JSON.stringify(landed.actionText))
    check('三个按钮图标互不相同', new Set(landed.iconPaths).size === 3, landed.iconPaths.join(' | '))
    check('没有按钮被禁用', landed.actionDisabled.every((d) => d === false), JSON.stringify(landed.actionDisabled))
    check('初始高亮「自适应尺寸」', landed.fitActive === true && landed.actualActive === false)

    // ---- 两个尺寸按钮：各自应用对应倍率，且总是可点 ----
    const actualClick = await evaluate(`(() => {
      document.querySelector('[data-action="actual"]').click()
      return {
        zoom: document.querySelector('.lightbox__zoom').textContent,
        size: document.querySelector('.lightbox__size').textContent.trim(),
        actualActive: document.querySelector('[data-action="actual"]').classList.contains('is-active'),
        fitActive: document.querySelector('[data-action="fit"]').classList.contains('is-active'),
      }
    })()`)
    await sleep(240)
    const atActual = await evaluate(`(() => ({
      zoom: document.querySelector('.lightbox__zoom').textContent,
      size: document.querySelector('.lightbox__size').textContent.trim(),
      width: Math.round(document.querySelector('.lightbox__image').getBoundingClientRect().width),
      natural: document.querySelector('.lightbox__image').naturalWidth,
      disabled: document.querySelector('[data-action="actual"]').disabled,
    }))()`)

    check('点「原尺寸」直接进入 100%', actualClick.zoom === '100%', actualClick.zoom)
    check('原尺寸下尺寸文本等于图片原始像素', atActual.size === `${atActual.natural} x ${landed.natural[1]}`, atActual.size)
    check('原尺寸下按钮高亮切换', actualClick.actualActive === true && actualClick.fitActive === false)
    check('倍率已经等于原尺寸时按钮仍可点击', atActual.disabled === false)

    // 再点一次同一个按钮：不做禁用，也不炸
    const repeatActual = await evaluate(`(() => {
      document.querySelector('[data-action="actual"]').click()
      return {
        zoom: document.querySelector('.lightbox__zoom').textContent,
        disabled: document.querySelector('[data-action="actual"]').disabled,
      }
    })()`)
    check('重复点击同一倍率按钮仍可用', repeatActual.zoom === '100%' && repeatActual.disabled === false, JSON.stringify(repeatActual))

    // 滚轮缩放后两个按钮都不高亮
    await evaluate(`(() => {
      const viewport = document.querySelector('.lightbox__viewport')
      const r = document.querySelector('.lightbox__image').getBoundingClientRect()
      viewport.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -500, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        bubbles: true, cancelable: true,
      }))
    })()`)
    const wheeled = await evaluate(`(() => ({
      zoom: document.querySelector('.lightbox__zoom').textContent,
      size: document.querySelector('.lightbox__size').textContent.trim(),
      fitActive: document.querySelector('[data-action="fit"]').classList.contains('is-active'),
      actualActive: document.querySelector('[data-action="actual"]').classList.contains('is-active'),
      smooth: document.querySelector('.lightbox__image').classList.contains('is-smooth'),
    }))()`)

    check('过渡结束后滚轮可放大', parseInt(wheeled.zoom) > 100, wheeled.zoom)
    check('滚轮缩放时两个尺寸按钮都不高亮', wheeled.fitActive === false && wheeled.actualActive === false)
    check('滚轮缩放不经过渡（跟手）', wheeled.smooth === false)
    check('尺寸文本随倍率变化', wheeled.size !== atActual.size, `${atActual.size} → ${wheeled.size}`)

    const fitClick = await evaluate(`(() => {
      document.querySelector('[data-action="fit"]').click()
      return {zoom: document.querySelector('.lightbox__zoom').textContent}
    })()`)
    await sleep(240)
    const backToFit = await evaluate(`(() => ({
      zoom: document.querySelector('.lightbox__zoom').textContent,
      disabled: document.querySelector('[data-action="fit"]').disabled,
      active: document.querySelector('[data-action="fit"]').classList.contains('is-active'),
    }))()`)
    check('点「自适应尺寸」回到自适应倍率', backToFit.zoom === `${Math.round(landed.fit * 100)}%`, `${fitClick.zoom} → ${backToFit.zoom}`)
    check('自适应下按钮保持可点击并高亮', backToFit.disabled === false && backToFit.active === true)

    // ---- 纹理过滤：默认线性、可切换、全局记忆 ----
    check('预览默认使用线性过滤', landed.filterActive === 'linear' && landed.imageRendering === 'auto', `${landed.filterActive} / ${landed.imageRendering}`)
    check('未手动切换前不写存档', landed.storedFilter === null || landed.storedFilter === 'linear', String(landed.storedFilter))

    const filtered = await evaluate(`(() => {
      const button = document.querySelector('[data-action="filter"]')
      const before = button.querySelector('path').getAttribute('d')
      button.click()
      return {
        mode: button.dataset.filter,
        rendering: getComputedStyle(document.querySelector('.lightbox__image')).imageRendering,
        iconChanged: button.querySelector('path').getAttribute('d') !== before,
        stored: localStorage.getItem('boxutil-guide-image-filter'),
        pressed: button.getAttribute('aria-pressed'),
      }
    })()`)

    check('可切换到邻近过滤', filtered.mode === 'nearest' && filtered.rendering === 'pixelated', `${filtered.mode} / ${filtered.rendering}`)
    check('切换过滤模式时图标同步变化', filtered.iconChanged === true)
    check('过滤模式写入全局存档', filtered.stored === 'nearest' && filtered.pressed === 'true', String(filtered.stored))

    // 关闭再打开：同一次会话内沿用
    await evaluate(`document.querySelector('.lightbox__close').click()`)
    await sleep(240)
    const reopened = await evaluate(`(async () => {
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))
      return {
        mode: document.querySelector('[data-action="filter"]').dataset.filter,
        rendering: getComputedStyle(document.querySelector('.lightbox__image')).imageRendering,
        zoom: document.querySelector('.lightbox__zoom').textContent,
      }
    })()`)

    check('再次打开预览沿用记忆的过滤模式', reopened.mode === 'nearest' && reopened.rendering === 'pixelated', `${reopened.mode} / ${reopened.rendering}`)
    check('再次打开仍默认自适应尺寸', reopened.zoom === `${Math.round(landed.fit * 100)}%`, reopened.zoom)

    // 整页刷新后依然是记忆的模式
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))`)
    await sleep(240)
    await reload()
    await waitFor(`!!document.querySelector('.doc-figure img')`)
    const afterReload = await evaluate(`(async () => {
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))
      return {
        mode: document.querySelector('[data-action="filter"]').dataset.filter,
        rendering: getComputedStyle(document.querySelector('.lightbox__image')).imageRendering,
        stored: localStorage.getItem('boxutil-guide-image-filter'),
      }
    })()`)
    check(
        '刷新后仍然记得过滤模式（全局记忆）',
        afterReload.mode === 'nearest' && afterReload.rendering === 'pixelated' && afterReload.stored === 'nearest',
        JSON.stringify(afterReload),
    )

    // 切回线性
    const backToLinear = await evaluate(`(() => {
      document.querySelector('[data-action="filter"]').click()
      return {
        mode: document.querySelector('[data-action="filter"]').dataset.filter,
        rendering: getComputedStyle(document.querySelector('.lightbox__image')).imageRendering,
        stored: localStorage.getItem('boxutil-guide-image-filter'),
      }
    })()`)
    check('可切回线性过滤', backToLinear.mode === 'linear' && backToLinear.rendering === 'auto' && backToLinear.stored === 'linear', JSON.stringify(backToLinear))

    // ---- 点击图片：放大到原尺寸，或从原尺寸缩回自适应 ----
    const toActual = await evaluate(`(() => {
      document.querySelector('.lightbox__image').click()
      return {zoom: document.querySelector('.lightbox__zoom').textContent}
    })()`)
    check('点击图片放大到原尺寸（100%）', toActual.zoom === '100%', toActual.zoom)

    // 打开预览时 ← / → 不应翻页
    const routeLocked = await evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}))
      return location.hash
    })()`)
    check('预览打开时 ← / → 不翻页', routeLocked === '#/intro/thread-dispatch', routeLocked)

    // Esc 关闭（先收起当前预览，把滚动位置设成基准再重新打开）
    const closedByEsc = await evaluate(`(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
      await new Promise((r) => setTimeout(r, 280))

      window.scrollTo({top: 240, behavior: 'instant'})
      const before = window.scrollY
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))

      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))
      const mid = document.querySelector('.lightbox').hidden === false
      await new Promise((r) => setTimeout(r, 280))
      return {
        before,
        mid,
        hidden: document.querySelector('.lightbox').hidden,
        locked: document.documentElement.classList.contains('is-lightbox-open'),
        overflow: getComputedStyle(document.documentElement).overflow,
        scroll: window.scrollY,
      }
    })()`)
    check('Esc 触发关闭过渡', closedByEsc.mid === true)
    check('Esc 关闭后预览层隐藏并解锁滚动', closedByEsc.hidden === true && closedByEsc.locked === false && closedByEsc.overflow !== 'hidden', JSON.stringify(closedByEsc))
    check('关闭后滚动位置保持不变', closedByEsc.scroll === closedByEsc.before && closedByEsc.before === 240, `${closedByEsc.before} → ${closedByEsc.scroll}`)

    // 点击空白处关闭
    const closedByBlank = await evaluate(`(async () => {
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))
      const viewport = document.querySelector('.lightbox__viewport')
      const r = viewport.getBoundingClientRect()
      viewport.dispatchEvent(new MouseEvent('click', {clientX: r.left + 6, clientY: r.top + 6, bubbles: true}))
      await new Promise((r2) => setTimeout(r2, 280))
      return {hidden: document.querySelector('.lightbox').hidden}
    })()`)
    check('点击空白处关闭预览', closedByBlank.hidden === true)

    // 点击右上角叉键关闭
    const closedByButton = await evaluate(`(async () => {
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))
      const close = document.querySelector('.lightbox__close')
      const r = close.getBoundingClientRect()
      close.click()
      await new Promise((r2) => setTimeout(r2, 280))
      return {hidden: document.querySelector('.lightbox').hidden, top: Math.round(r.top), right: window.innerWidth - Math.round(r.right)}
    })()`)
    check('叉键位于右上角', closedByButton.top < 40 && closedByButton.right < 40, `${closedByButton.top},${closedByButton.right}`)
    check('点击叉键关闭预览', closedByButton.hidden === true)

    // 窗口尺寸变化后重算自适应倍率
    const beforeResize = await evaluate(`(async () => {
      document.querySelector('.doc-figure img').click()
      await new Promise((r) => setTimeout(r, 260))
      return {zoom: document.querySelector('.lightbox__zoom').textContent}
    })()`)
    await setViewport({width: 1000, height: 700})
    await sleep(300)
    const afterResize = await evaluate(`(() => {
      const r = document.querySelector('.lightbox__image').getBoundingClientRect()
      return {
        zoom: document.querySelector('.lightbox__zoom').textContent,
        width: Math.round(r.width),
        height: Math.round(r.height),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      }
    })()`)
    check(
        '窗口变小后图片仍完整显示在窗口内',
        afterResize.width <= afterResize.innerWidth && afterResize.height <= afterResize.innerHeight,
        `${afterResize.width}×${afterResize.height} in ${afterResize.innerWidth}×${afterResize.innerHeight}`,
    )
    check('窗口变小后重新计算自适应倍率', afterResize.zoom !== beforeResize.zoom, `${beforeResize.zoom} → ${afterResize.zoom}`)

    await clearViewport()
    await sleep(200)
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))`)
    await sleep(280)

    // ======================= 二、页内 h2 导航 =======================
    await visit('#/intro/readme')
    if (!(await waitFor(`!!document.querySelector('.nav-item[data-nav-item="intro/readme"] .nav-outline__link')`))) {
        await diagnose('打开 readme 的大纲')
        throw new Error('目录里没有渲染出小节列表')
    }
    // 后台索引：等待一个本次测试从未进入过的条目出现小节
    const indexed = await waitFor(`document.querySelectorAll('[data-outline-path="intro/install"]').length > 0`)
    check('未进入过的条目也能提前拿到小节（后台索引）', indexed === true)

    const outline = await evaluate(`(() => {
      const item = document.querySelector('.nav-item[data-nav-item="intro/readme"]')
      const links = [...item.querySelectorAll('.nav-outline__link')]
      const box = item.querySelector('.nav-item__outline')
      const toggle = item.querySelector('.nav-item__toggle')
      const install = document.querySelector('.nav-item[data-nav-item="intro/install"]')
      const installLinks = [...install.querySelectorAll('.nav-outline__link')]
      const floating = document.querySelector('#page-outline')
      return {
        texts: links.map((a) => a.textContent.trim()),
        hrefs: links.map((a) => a.getAttribute('href')),
        open: box.classList.contains('is-open'),
        expanded: toggle.getAttribute('aria-expanded'),
        toggleRight: Math.round(toggle.getBoundingClientRect().left) >=
            Math.round(item.querySelector('.nav-link').getBoundingClientRect().right) - 1,
        otherOpen: [...document.querySelectorAll('.nav-item')]
          .filter((n) => n.dataset.navItem !== 'intro/readme')
          .filter((n) => n.querySelector('.nav-item__outline').classList.contains('is-open')).length,
        headings: [...document.querySelectorAll('.prose h2')].map((h) => h.id),
        scrollMargin: getComputedStyle(document.querySelector('.prose h2')).scrollMarginTop,
        indent: getComputedStyle(item.querySelector('.nav-outline')).marginLeft,
        installTexts: installLinks.map((a) => a.textContent.trim()),
        installHref: installLinks[0]?.getAttribute('href'),
        installToggleHidden: install.querySelector('.nav-item__toggle').hidden,
        installOpen: install.querySelector('.nav-item__outline').classList.contains('is-open'),
        floatingHidden: floating.hidden,
        floatingLinks: [...floating.querySelectorAll('.page-outline__link')].map((a) => a.textContent.trim()),
        floatingBackground: getComputedStyle(floating).backgroundColor,
        floatingOverflow: getComputedStyle(floating).overflowY,
        floatingMaxHeight: getComputedStyle(floating).maxHeight,
        transition: getComputedStyle(box).transitionDuration,
      }
    })()`)

    check('目录中展开当前条目的小节', outline.texts.join('|') === '简介|快速开始', outline.texts.join('|'))
    check('进入条目时自动展开小节', outline.open === true && outline.expanded === 'true')
    check('小节展开动画为 0.1s', outline.transition.split(',')[0].trim() === '0.1s', outline.transition)
    check('小节条目可点击跳转（带锚点链接）', outline.hrefs[0] === '#/intro/readme#h2-1', outline.hrefs[0])
    check('展开按钮位于条目控件右侧', outline.toggleRight === true)
    check('正文 h2 获得稳定 id', outline.headings.join(',') === 'h2-1,h2-2', outline.headings.join(','))
    check('h2 预留了横幅高度（scroll-margin-top）', parseFloat(outline.scrollMargin) >= 58, outline.scrollMargin)
    check('h2 控件比 items 再缩进 16px', parseFloat(outline.indent) === 49, outline.indent)

    check('未进入的条目也有小节条目', outline.installTexts.join('|') === '初始化的调用|Java库', outline.installTexts.join('|'))
    check('未进入的条目默认收起但按钮可用', outline.installToggleHidden === false && outline.installOpen === false)
    check('未进入条目的小节指向目标页面锚点', outline.installHref === '#/intro/install#h2-1', String(outline.installHref))

    check('PC 端存在右上角快速导航', outline.floatingHidden === false)
    check('快速导航无背景', outline.floatingBackground === 'rgba(0, 0, 0, 0)', outline.floatingBackground)
    check('快速导航高度受限并带内部滚动条', outline.floatingOverflow === 'auto' && outline.floatingMaxHeight !== 'none', `${outline.floatingOverflow} / ${outline.floatingMaxHeight}`)
    check('快速导航列出同样的 h2', outline.floatingLinks.join('|') === '简介|快速开始', outline.floatingLinks.join('|'))

    const floatingBox = await evaluate(`(() => {
      const nav = document.querySelector('#page-outline')
      const page = document.querySelector('.page').getBoundingClientRect()
      const r = nav.getBoundingClientRect()
      return {
        top: Math.round(r.top),
        right: window.innerWidth - Math.round(r.right),
        pageRight: Math.round(page.right),
        navLeft: Math.round(r.left),
      }
    })()`)
    check('快速导航位于横幅之下', floatingBox.top >= 58, String(floatingBox.top))
    check('快速导航贴住右边缘', floatingBox.right > 0 && floatingBox.right < 40, String(floatingBox.right))
    check('正文为快速导航让出空间（互不重叠）', floatingBox.navLeft >= floatingBox.pageRight, `${floatingBox.pageRight} vs ${floatingBox.navLeft}`)

    // ---- 点击快速导航：高亮要立刻跟上，并在滚动过程中锁定 ----
    const jump = await evaluate(`(async () => {
      const link = document.querySelector('#page-outline .page-outline__link[data-outline-target="h2-2"]')
      const sidebar = document.querySelector('.nav-outline__link[data-outline-path="intro/readme"][data-outline-target="h2-2"]')
      link.click()
      const immediate = {floating: link.classList.contains('is-active'), sidebar: sidebar.classList.contains('is-active')}
      await new Promise((r) => setTimeout(r, 200))
      const mid = {floating: link.classList.contains('is-active'), sidebar: sidebar.classList.contains('is-active')}
      await new Promise((r) => setTimeout(r, 1400))
      const other = document.querySelector('.nav-outline__link[data-outline-path="intro/readme"][data-outline-target="h2-1"]')
      return {
        immediate,
        mid,
        settled: {
          floating: link.classList.contains('is-active'),
          sidebar: sidebar.classList.contains('is-active'),
          firstInactive: !other.classList.contains('is-active'),
          hash: location.hash,
          titleSame: true,
        },
      }
    })()`)

    check('点击小节后立刻同步左右两侧高亮', jump.immediate.floating === true && jump.immediate.sidebar === true, JSON.stringify(jump.immediate))
    check('滚动过程中高亮不被中间帧带偏', jump.mid.floating === true && jump.mid.sidebar === true, JSON.stringify(jump.mid))
    check('滚动停止后高亮仍停在目标小节', jump.settled.floating === true && jump.settled.sidebar === true && jump.settled.firstInactive === true, JSON.stringify(jump.settled))
    check('点击小节后 URL 记下锚点', jump.settled.hash === '#/intro/readme#h2-2', jump.settled.hash)

    // 页内跳转不应重渲染
    const noRerender = await evaluate(`(() => ({
      title: document.querySelector('.page__title')?.textContent,
    }))()`)
    check('页内跳转不会重渲染页面', noRerender.title === '前言', String(noRerender.title))

    // ---- 高亮阈值：视口中线，而不是页面顶部 ----
    await setViewport({width: 1440, height: 520})
    await sleep(200)
    const threshold = await evaluate(`(async () => {
      const midline = Math.round(window.innerHeight / 2)
      const h2 = document.getElementById('h2-2')
      const want = midline - 40
      const y = window.scrollY + h2.getBoundingClientRect().top - want
      window.scrollTo({top: y, behavior: 'instant'})
      await new Promise((r) => setTimeout(r, 400))
      const top = Math.round(h2.getBoundingClientRect().top)
      const active = [...document.querySelectorAll('#page-outline .page-outline__link.is-active')].map((a) => a.dataset.outlineTarget)
      return {midline, want, top, active, banner: 58}
    })()`)

    check(
        'h2 越过视口中线即高亮（不是等它到页面顶部）',
        threshold.top <= threshold.midline && threshold.top > threshold.banner && threshold.active.join('|') === 'h2-2',
        JSON.stringify(threshold),
    )

    // 把 h2-2 推回中线以下，高亮应回到上一节
    const below = await evaluate(`(async () => {
      const midline = Math.round(window.innerHeight / 2)
      const h2 = document.getElementById('h2-2')
      const y = window.scrollY + h2.getBoundingClientRect().top - (midline + 60)
      window.scrollTo({top: y, behavior: 'instant'})
      await new Promise((r) => setTimeout(r, 400))
      return {
        top: Math.round(h2.getBoundingClientRect().top),
        active: [...document.querySelectorAll('#page-outline .page-outline__link.is-active')].map((a) => a.dataset.outlineTarget),
      }
    })()`)
    check(
        'h2 退回中线以下时高亮回到上一节',
        below.top > threshold.midline && below.active.join('|') === 'h2-1',
        JSON.stringify(below),
    )
    await clearViewport()
    await sleep(200)

    // ---- 未进入的条目：直接点它的小节就能跳过去 ----
    await visit('#/intro/readme')
    await waitFor(`document.querySelectorAll('[data-outline-path="intro/install"]').length > 0`)
    const crossPage = await evaluate(`(async () => {
      const link = document.querySelector('.nav-item[data-nav-item="intro/install"] .nav-outline__link[data-outline-target="h2-1"]')
      link.click()
      await new Promise((r) => setTimeout(r, 900))
      const h2 = document.getElementById('h2-1')
      return {
        hash: location.hash,
        title: document.querySelector('.page__title')?.textContent,
        top: Math.round(h2.getBoundingClientRect().top),
        scrollY: Math.round(window.scrollY),
        installOpen: document.querySelector('.nav-item[data-nav-item="intro/install"] .nav-item__outline').classList.contains('is-open'),
        readmeStillOpen: document.querySelector('.nav-item[data-nav-item="intro/readme"] .nav-item__outline').classList.contains('is-open'),
      }
    })()`)

    check('点击未进入条目的小节能跳到目标页面锚点', crossPage.hash === '#/intro/install#h2-1' && crossPage.title === '代码配置', `${crossPage.hash} / ${crossPage.title}`)
    check('跨页跳转后定位到该小节', crossPage.scrollY > 0 && crossPage.top >= 58 && crossPage.top <= 120, `top=${crossPage.top} y=${crossPage.scrollY}`)
    check('目标条目进入后自动展开', crossPage.installOpen === true)
    check('离开后原条目保持展开状态', crossPage.readmeStillOpen === true)

    // ---- 主动收起：之后进入该条目也不再自动展开 ----
    const collapseState = await evaluate(`(async () => {
      const item = document.querySelector('.nav-item[data-nav-item="intro/install"]')
      item.querySelector('.nav-item__toggle').click()
      await new Promise((r) => setTimeout(r, 200))
      return {
        open: item.querySelector('.nav-item__outline').classList.contains('is-open'),
        stored: JSON.parse(localStorage.getItem('boxutil-guide-nav-outline-collapsed') || '[]'),
      }
    })()`)
    check('可以手动收起当前条目的小节', collapseState.open === false && collapseState.stored.includes('intro/install'), JSON.stringify(collapseState))

    await visit('#/intro/readme')
    await visit('#/intro/install')
    await sleep(500)
    const remembered = await evaluate(`(() => {
      const item = document.querySelector('.nav-item[data-nav-item="intro/install"]')
      return {
        open: item.querySelector('.nav-item__outline').classList.contains('is-open'),
        expanded: item.querySelector('.nav-item__toggle').getAttribute('aria-expanded'),
      }
    })()`)
    check('主动收起的条目再次进入仍保持收起', remembered.open === false && remembered.expanded === 'false', JSON.stringify(remembered))

    // 主动展开一次之后再进入应该恢复自动展开
    const reExpand = await evaluate(`(async () => {
      const item = document.querySelector('.nav-item[data-nav-item="intro/install"]')
      item.querySelector('.nav-item__toggle').click()
      await new Promise((r) => setTimeout(r, 200))
      const opened = item.querySelector('.nav-item__outline').classList.contains('is-open')
      await new Promise((r) => setTimeout(r, 100))
      return {opened, stored: JSON.parse(localStorage.getItem('boxutil-guide-nav-outline-collapsed') || '[]')}
    })()`)
    check('主动展开后撤销「保持收起」的记忆', reExpand.opened === true && !reExpand.stored.includes('intro/install'), JSON.stringify(reExpand))

    // 切到没有 h2 的条目
    await visit('#/intro/manager')
    await waitFor(`document.querySelector('.nav-link.is-active')?.dataset.navPath === 'intro/manager'`)
    await waitFor(`document.querySelectorAll('[data-outline-path="intro/install"]').length > 0`)
    const withoutH2 = await evaluate(`(() => {
      const item = document.querySelector('.nav-item[data-nav-item="intro/manager"]')
      return {
        hasClass: document.documentElement.classList.contains('has-outline'),
        floatingHidden: document.querySelector('#page-outline') ? document.querySelector('#page-outline').hidden : null,
        ownLinks: item.querySelectorAll('.nav-outline__link').length,
        toggleHidden: item.querySelector('.nav-item__toggle').hidden,
        otherOutlinesKept: document.querySelectorAll('.nav-outline__link').length,
      }
    })()`)
    check('没有 h2 的条目不显示小节列表与按钮', withoutH2.ownLinks === 0 && withoutH2.toggleHidden === true)
    check('没有 h2 的条目隐藏快速导航并归还右侧空间', withoutH2.floatingHidden === true && withoutH2.hasClass === false)
    check('其它条目的大纲依然常驻', withoutH2.otherOutlinesKept > 0, String(withoutH2.otherOutlinesKept))

    // 带锚点直接打开
    await visit('#/intro/readme#h2-1', {waitForShiki: false})
    await waitFor(`!!document.querySelector('.nav-outline__link')`)
    await sleep(700)
    const deepLink = await evaluate(`(() => ({
      top: Math.round(document.getElementById('h2-1').getBoundingClientRect().top),
      scrollY: Math.round(window.scrollY),
      active: document.querySelector('.nav-outline__link[data-outline-path="intro/readme"][data-outline-target="h2-1"]')
        ? document.querySelector('.nav-outline__link[data-outline-path="intro/readme"][data-outline-target="h2-1"]').classList.contains('is-active')
        : null,
    }))()`)
    check('带锚点的链接可直接定位到小节', deepLink.scrollY > 0 && deepLink.top >= 58 && deepLink.top <= 110, JSON.stringify(deepLink))
    check('带锚点打开时高亮对应小节', deepLink.active === true)

    // 窄屏：只保留目录里的小节，隐藏右上角快速导航
    await setViewport({width: 420, height: 860, deviceScaleFactor: 2, mobile: true})
    await visit('#/intro/readme')
    await waitFor(`document.querySelectorAll('.nav-item[data-nav-item="intro/readme"] .nav-outline__link').length === 2`)
    const mobile = await evaluate(`(() => ({
      floatingDisplay: getComputedStyle(document.querySelector('#page-outline')).display,
      sidebarLinks: document.querySelectorAll('.nav-item[data-nav-item="intro/readme"] .nav-outline__link').length,
    }))()`)
    check('窄屏隐藏右上角快速导航', mobile.floatingDisplay === 'none', mobile.floatingDisplay)
    check('窄屏保留目录里的小节列表', mobile.sidebarLinks === 2, String(mobile.sidebarLinks))
    await clearViewport()

    check('全程无控制台报错', harness.consoleMessages.length === 0, harness.consoleMessages.slice(0, 3).join(' | '))
} catch (error) {
    failures++
    console.error(`✗ 验证中断：${error && error.message ? error.message : String(error)}`)
    await diagnose('中断时')
} finally {
    if (harness.consoleMessages.length > 0) {
        console.error(`控制台消息（${harness.consoleMessages.length}）：${harness.consoleMessages.slice(0, 5).join(' | ')}`)
    }
    await harness.dispose()
}

console.log(failures === 0 ? `\n全部通过` : `\n${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
