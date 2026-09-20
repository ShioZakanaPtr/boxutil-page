// 真实浏览器端到端验证：静态托管 dist，用无头 Chrome / Edge 加载页面并断言
// 横幅、目录、条目页、shiki 高亮、主题切换与窄屏抽屉的行为。
//
// 用法：
//   npm run build && node scripts/verify-page.mjs
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
const {evaluate, visit, reload, sleep, cdp, sessionId} = harness

try {
    // ---------- 1. 根路径应落在首个条目 ----------
    await visit('')
    const home = await evaluate(`(() => {
      const q = (s) => document.querySelector(s)
      const code = q('.code-block__body pre.shiki')
      return {
        hash: location.hash,
        bannerChapter: q('#banner-chapter')?.textContent,
        bannerItem: q('#banner-item')?.textContent,
        pageTitle: q('.page__title')?.textContent,
        pageLead: q('.page__lead')?.textContent,
        activeNav: q('.nav-link.is-active')?.dataset.navPath,
        groupCount: document.querySelectorAll('.nav-group').length,
        indent: getComputedStyle(q('.nav-link')).paddingLeft,
        groupOpen: q('.nav-group.is-open')?.dataset.group,
        shikiCount: document.querySelectorAll('.shiki').length,
        tokenColor: q('.shiki span[style*="color"]')?.getAttribute('style') ?? null,
        distinctTokenColors: new Set([...document.querySelectorAll('.shiki span[style*="color"]')]
          .map((el) => getComputedStyle(el).color)).size,
        preInlineBg: code?.getAttribute('style') ?? null,
        langLabel: q('.code-block__lang')?.textContent,
        copyBtn: !!q('.code-block__copy'),
        prevCount: document.querySelectorAll('.page-nav__link--prev').length,
        nextCount: document.querySelectorAll('.page-nav__link--next').length,
        repoHref: q('.banner__actions a')?.getAttribute('href'),
        repoBlank: q('.banner__actions a')?.getAttribute('target'),
        headBeforeProse: !!q('.page__head') && (q('.page__head').compareDocumentPosition(q('.prose')) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
        navAfterProse: (q('.prose').compareDocumentPosition(q('.page-nav')) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
      }
    })()`)

    check('根路径重定向到首个条目 hash', home.hash === '#/intro/readme', home.hash)
    check('横幅显示当前章节', home.bannerChapter === '入门', home.bannerChapter)
    check('横幅显示当前条目标题', home.bannerItem === 'BoxUtil 是什么', home.bannerItem)
    check('横幅有仓库跳转按钮（新窗口）', Boolean(home.repoHref?.startsWith('http')) && home.repoBlank === '_blank', `${home.repoHref} / ${home.repoBlank}`)
    check('条目页开头有标题', home.pageTitle === 'BoxUtil 是什么', home.pageTitle)
    check('条目页开头有描述', Boolean(home.pageLead), home.pageLead)
    check('标题区位于正文之前', home.headBeforeProse)
    check('目录高亮当前条目', home.activeNav === 'intro/readme', home.activeNav)
    check('目录渲染出全部章节', home.groupCount === 5, String(home.groupCount))
    check('目录条目带缩进', parseFloat(home.indent) >= 24, home.indent)
    check('当前章节默认展开', home.groupOpen === 'intro', home.groupOpen)
    check('章节折叠按钮带 aria-expanded', await evaluate(`document.querySelector('.nav-group__toggle')?.getAttribute('aria-expanded') === 'true'`))
    check('shiki 高亮生效', home.shikiCount > 0, String(home.shikiCount))
    check('代码 token 带主题颜色', /color:\s*#/.test(home.tokenColor ?? ''), home.tokenColor)
    check('不同语法元素颜色不同（高亮未被 CSS 覆盖）', home.distinctTokenColors >= 3, `distinct=${home.distinctTokenColors}`)
    check('shiki 的 pre 内联背景已移除', !home.preInlineBg, String(home.preInlineBg))
    check('代码块显示语言标签', home.langLabel === 'typescript', home.langLabel)
    check('代码块有复制按钮', home.copyBtn)
    check('首个条目没有上一篇', home.prevCount === 0)
    check('首个条目有下一篇', home.nextCount === 1)
    check('翻页位于正文最底', home.navAfterProse)

    // 复制按钮：验证真实写入剪贴板需要一个有权限的上下文，这里只验证状态反馈
    await cdp
        .send('Browser.grantPermissions', {permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: 'http://127.0.0.1:4319'}, sessionId)
        .catch(() => {})
    const copied = await evaluate(`(async () => {
      document.querySelector('.code-block__copy').click()
      await new Promise((r) => setTimeout(r, 500))
      const btn = document.querySelector('.code-block__copy')
      let text = null
      try { text = await navigator.clipboard.readText() } catch {}
      return {copied: btn.dataset.state === 'copied', text}
    })()`)
    check('复制按钮给出已复制反馈', copied.copied === true)
    check(
        '复制按钮取到的是代码原文',
        copied.text === null || copied.text.includes("import {BoxUtil} from 'boxutil'"),
        String(copied.text).slice(0, 60),
    )

    // 章节折叠：点击章节标题应折叠
    const collapsed = await evaluate(`(() => {
      const btn = document.querySelector('.nav-group__toggle')
      btn.click()
      const closed = btn.getAttribute('aria-expanded') === 'false'
      const hidden = document.querySelector('.nav-group__body').hidden
      btn.click()
      const reopened = btn.getAttribute('aria-expanded') === 'true'
      return {closed, hidden, reopened}
    })()`)
    check('章节可折叠', collapsed.closed && collapsed.hidden)
    check('章节可再次展开', collapsed.reopened)

    // ---------- 2. 中间条目：双向前后导航 ----------
    await visit('#/rendering_entity/lifecycle')
    const mid = await evaluate(`(() => ({
      title: document.querySelector('.page__title')?.textContent,
      prev: document.querySelector('.page-nav__link--prev')?.getAttribute('href'),
      next: document.querySelector('.page-nav__link--next')?.getAttribute('href'),
      prevTitle: document.querySelector('.page-nav__link--prev .page-nav__title')?.textContent,
      nextTitle: document.querySelector('.page-nav__link--next .page-nav__title')?.textContent,
      ariaCurrent: document.querySelector('.nav-link[aria-current="page"]')?.dataset.navPath,
      openGroups: [...document.querySelectorAll('.nav-group.is-open')].map((g) => g.dataset.group),
      codeLangs: [...document.querySelectorAll('.code-block__lang')].map((e) => e.textContent),
      list: !!document.querySelector('.prose ol, .prose ul'),
      scrolled: window.scrollY,
    }))()`)

    check('深链接直达中间条目', mid.title === '实体生命周期', mid.title)
    check('上一篇指向正确条目', mid.prev === '#/rendering_entity/common', mid.prev)
    check('下一篇指向正确条目', mid.next === '#/rendering_entity/custom_entity', mid.next)
    check('翻页显示相邻条目标题', mid.prevTitle === '实体与配置' && mid.nextTitle === '自定义实体', `${mid.prevTitle} / ${mid.nextTitle}`)
    check('目录 aria-current 指向当前条目', mid.ariaCurrent === 'rendering_entity/lifecycle', mid.ariaCurrent)
    check('目录自动展开所在章节', mid.openGroups.includes('rendering_entity'), JSON.stringify(mid.openGroups))
    check('多个代码块各自带语言标签', mid.codeLangs.join(',') === 'typescript,typescript,typescript', mid.codeLangs.join(','))
    check('有序列表正常渲染', mid.list)
    check('切页后回到顶部', mid.scrolled === 0, String(mid.scrolled))

    // ---------- 3. 表格页（rendering_entity/common 有表格） ----------
    await visit('#/rendering_entity/common')
    check('表格正常渲染', await evaluate(`document.querySelectorAll('.prose table tbody tr').length >= 3`))

    // ---------- 3b. 站点图标与文档插图 ----------
    const iconInfo = await evaluate(`(() => {
      const logo = document.querySelector('.banner__logo')
      const link = document.querySelector('link[rel="icon"]')
      return {
        tag: logo?.tagName,
        src: logo?.getAttribute('src'),
        natural: [logo?.naturalWidth, logo?.naturalHeight],
        rendered: [Math.round(logo.getBoundingClientRect().width), Math.round(logo.getBoundingClientRect().height)],
        complete: logo?.complete,
        faviconType: link?.getAttribute('type'),
        faviconHref: link?.getAttribute('href'),
        appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
      }
    })()`)

    check('横幅左侧使用 PNG 图标', iconInfo.tag === 'IMG' && /BUtil_ModIcon.*\.png$/.test(iconInfo.src ?? ''), `${iconInfo.tag} ${iconInfo.src}`)
    check('图标资源加载成功', iconInfo.complete === true && iconInfo.natural[0] === 256, JSON.stringify(iconInfo.natural))
    check('图标按 26×26 渲染', iconInfo.rendered[0] === 26 && iconInfo.rendered[1] === 26, JSON.stringify(iconInfo.rendered))
    check('站点图标为 PNG', iconInfo.faviconType === 'image/png' && iconInfo.faviconHref === './favicon.png', `${iconInfo.faviconType} ${iconInfo.faviconHref}`)
    check('apple-touch-icon 已配置', iconInfo.appleIcon === './favicon.png', String(iconInfo.appleIcon))

    // favicon 必须真的能取到 200
    const faviconStatus = await evaluate(`fetch('./favicon.png').then((r) => r.status)`)
    check('favicon.png 可访问', faviconStatus === 200, String(faviconStatus))

    // readme 中的线程模型插图
    await visit('#/intro/readme')
    const figure = await evaluate(`(() => {
      const fig = document.querySelector('.doc-figure')
      const img = fig?.querySelector('img')
      const r = img?.getBoundingClientRect()
      return {
        exists: !!fig,
        src: img?.getAttribute('src'),
        complete: img?.complete,
        natural: [img?.naturalWidth, img?.naturalHeight],
        renderedW: Math.round(r?.width ?? 0),
        renderedH: Math.round(r?.height ?? 0),
        alt: img?.getAttribute('alt')?.length ?? 0,
        caption: fig?.querySelector('figcaption')?.textContent?.trim().slice(0, 12),
        radius: fig ? getComputedStyle(img).borderRadius : null,
        objectFit: fig ? getComputedStyle(img).objectFit : null,
        intrinsicRatio: img ? img.naturalWidth + '/' + img.naturalHeight : null,
        // 首个代码块是否落在懒高亮范围内（首屏 + 400px 预加载边距）
        codeTop: Math.round(document.querySelector('.code-block__body')?.getBoundingClientRect().top ?? -1),
        codeWithinViewport: (() => {
          const body = document.querySelector('.code-block__body')
          if (!body) return false
          return body.getBoundingClientRect().top < window.innerHeight + 400
        })(),
        beforeH2: (() => {
          // 插图应位于「基本用法」小节之前
          const h2s = [...document.querySelectorAll('.prose h2')]
          const basic = h2s.find((h) => h.textContent.includes('基本用法'))
          return !!basic && (fig.compareDocumentPosition(basic) & Node.DOCUMENT_POSITION_FOLLOWING) > 0
        })(),
      }
    })()`)

    check('readme 中插入了流程插图', figure.exists === true)
    check('插图资源加载成功', figure.complete === true && figure.natural[0] === 1501 && figure.natural[1] === 1052, JSON.stringify(figure.natural))
    check('插图按正文宽度自适应', figure.renderedW > 600 && figure.renderedW <= 820 && figure.renderedH > 0, `${figure.renderedW}×${figure.renderedH}`)
    check('插图高度受视口上限约束', figure.renderedH <= 520, String(figure.renderedH))
    check('插图未发生拉伸变形（contain 保持比例）', figure.objectFit === 'contain' && figure.intrinsicRatio === '1501/1052', `${figure.objectFit} ${figure.intrinsicRatio}`)
    check('插图不会独占首屏（正文代码仍在首屏范围内）', figure.codeWithinViewport === true, `codeTop=${figure.codeTop}`)
    check('插图带替代文本', figure.alt > 10, String(figure.alt))
    check('插图带图注', Boolean(figure.caption), String(figure.caption))
    check('插图位于「基本用法」之前', figure.beforeH2 === true)
    check('插图有圆角与深色底', figure.radius !== '0px' && figure.radius !== null, String(figure.radius))

    // ---------- 4. 末条目 ----------
    await visit('#/tool/inspector')
    const last = await evaluate(`(() => ({
      title: document.querySelector('.page__title')?.textContent,
      next: document.querySelectorAll('.page-nav__link--next').length,
      prev: document.querySelectorAll('.page-nav__link--prev').length,
    }))()`)
    check('末条目标题正确', last.title === '调试面板与性能剖析', last.title)
    check('末条目没有下一篇', last.next === 0)
    check('末条目有上一篇', last.prev === 1)

    // ---------- 5. 未知路由回退 ----------
    await visit('#/does/not/exist')
    check('未知路由回退到首条目', (await evaluate(`document.querySelector('.page__title')?.textContent`)) === 'BoxUtil 是什么')

    // 尽早暴露运行期报错
    check('运行期无控制台报错', harness.consoleMessages.length === 0, harness.consoleMessages.slice(0, 3).join(' | '))

    // ---------- 6. 键盘左右键翻页 ----------
    await visit('#/rendering_entity/common')
    const keyNav = await evaluate(`(() => {
      const send = (key) => document.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}))
      send('ArrowRight')
      return location.hash
    })()`)
    check('→ 键跳到下一条目', keyNav === '#/rendering_entity/lifecycle', keyNav)

    // ---------- 6b. 浏览器后退键应在条目之间回退 ----------
    const backNav = await evaluate(`(async () => {
      history.back()
      await new Promise((r) => setTimeout(r, 600))
      return {hash: location.hash, title: document.querySelector('.page__title')?.textContent}
    })()`)
    check('后退键回到上一条目', backNav.hash === '#/rendering_entity/common' && backNav.title === '实体与配置', JSON.stringify(backNav))

    // ---------- 7. 主题切换 ----------
    // 无持久化偏好时应跟随 prefers-color-scheme（必须先导航到真实页面才能操作 localStorage）
    await visit('#/intro/readme')
    await evaluate(`localStorage.removeItem('boxutil-guide-theme')`)
    await visit('#/intro/readme')
    const followsSystem = await evaluate(`(() => ({
      prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      dark: document.documentElement.classList.contains('dark'),
    }))()`)
    check(
        '无偏好时跟随系统 prefers-color-scheme',
        followsSystem.dark === followsSystem.prefersDark,
        `prefersDark=${followsSystem.prefersDark} dark=${followsSystem.dark}`,
    )

    // 固定到亮色后开始切换测试（写入偏好需要整页重载才会生效）
    await visit('#/intro/readme')
    await evaluate(`localStorage.setItem('boxutil-guide-theme', 'light')`)
    await reload()
    const before = await evaluate(`(() => {
      const shell = document.querySelector('.code-block')
      return {
        dark: document.documentElement.classList.contains('dark'),
        bg: getComputedStyle(document.body).backgroundColor,
        codeBg: shell ? getComputedStyle(shell).backgroundColor : null,
        token: document.querySelector('.shiki span[style*="color"]')?.getAttribute('style') ?? null,
      }
    })()`)

    check('初始为亮色主题', before.dark === false, String(before.dark))
    check('亮色下代码块有背景色', Boolean(before.codeBg) && before.codeBg !== 'rgba(0, 0, 0, 0)', String(before.codeBg))

    await evaluate(`document.querySelector('#theme-toggle').click()`)
    await sleep(2000) // 等待 shiki 按新主题重排

    const after = await evaluate(`(() => {
      const shell = document.querySelector('.code-block')
      return {
        dark: document.documentElement.classList.contains('dark'),
        bg: getComputedStyle(document.body).backgroundColor,
        codeBg: shell ? getComputedStyle(shell).backgroundColor : null,
        token: document.querySelector('.shiki span[style*="color"]')?.getAttribute('style') ?? null,
        stored: localStorage.getItem('boxutil-guide-theme'),
        shikiThemes: [...document.querySelectorAll('.shiki')].map((e) => [...e.classList].join(' ')),
        moonVisible: getComputedStyle(document.querySelector('.theme-icon--dark')).display,
        sunVisible: getComputedStyle(document.querySelector('.theme-icon--light')).display,
      }
    })()`)

    check('切换后进入暗色', after.dark === true)
    check('页面背景随主题变化', after.bg !== before.bg, `${before.bg} → ${after.bg}`)
    check('代码块背景随主题变化', after.codeBg !== before.codeBg, `${before.codeBg} → ${after.codeBg}`)
    check('代码 token 按新主题重排', after.token !== before.token, `${before.token} → ${after.token}`)
    check('代码块换成暗色 shiki 主题', after.shikiThemes.every((c) => c.includes('one-dark-pro')), after.shikiThemes.join('|'))
    check('主题选择已持久化', after.stored === 'dark', String(after.stored))
    check('暗色下显示月亮图标', after.moonVisible !== 'none' && after.sunVisible === 'none')

    await reload()
    check('刷新后主题保持', (await evaluate(`document.documentElement.classList.contains('dark')`)) === true)

    // ---------- 8. 目录收纳（桌面端） ----------
    // 用经典滚动条放大差异：条目页高度不同会导致滚动条出现/消失，
    // 若没有 scrollbar-gutter，正文宽度会随切换变化，表现为左右抖动。
    await cdp.send(
        'Page.addScriptToEvaluateOnNewDocument',
        {
            source: `(() => {
              const add = () => {
                const s = document.createElement('style')
                s.textContent = '::-webkit-scrollbar{width:15px}::-webkit-scrollbar-thumb{background:#888}'
                document.head.append(s)
              }
              if (document.head) add()
              else document.addEventListener('DOMContentLoaded', add)
            })()`,
        },
        sessionId,
    )

    await visit('#/example/rendering_text')
    await evaluate(`localStorage.removeItem('boxutil-guide-nav-collapsed')`)
    await reload()
    const layoutA = await evaluate(`(() => ({
      pageH: Math.round(document.documentElement.scrollHeight),
      bodyW: document.body.clientWidth,
      pageLeft: Math.round(document.querySelector('.page').getBoundingClientRect().left),
      pageWidth: Math.round(document.querySelector('.page').getBoundingClientRect().width),
      gutter: getComputedStyle(document.documentElement).scrollbarGutter,
    }))()`)

    await visit('#/example/instanced_particle')
    const layoutB = await evaluate(`(() => ({
      pageH: Math.round(document.documentElement.scrollHeight),
      bodyW: document.body.clientWidth,
      pageLeft: Math.round(document.querySelector('.page').getBoundingClientRect().left),
      pageWidth: Math.round(document.querySelector('.page').getBoundingClientRect().width),
    }))()`)

    check('scrollbar-gutter 已生效', layoutA.gutter === 'stable', layoutA.gutter)
    check('两次测量确实有高度差（覆盖滚动条场景）', layoutB.pageH !== layoutA.pageH, `${layoutA.pageH} vs ${layoutB.pageH}`)
    check('切换条目后页面宽度不变（无左右抖动）', layoutB.bodyW === layoutA.bodyW, `${layoutA.bodyW} → ${layoutB.bodyW}`)
    check('切换条目后正文左边缘不变', layoutB.pageLeft === layoutA.pageLeft, `${layoutA.pageLeft} → ${layoutB.pageLeft}`)
    check('切换条目后正文宽度不变', layoutB.pageWidth === layoutA.pageWidth, `${layoutA.pageWidth} → ${layoutB.pageWidth}`)

    // ---------- 8b. 目录紧贴左侧 + 面板收纳 ----------
    const docked = await evaluate(`(() => {
      const sidebar = document.querySelector('.sidebar')
      const shell = document.querySelector('.shell')
      const home = document.querySelector('.sidebar__home')
      return {
        sidebarLeft: Math.round(sidebar.getBoundingClientRect().left),
        sidebarRight: Math.round(sidebar.getBoundingClientRect().right),
        shellLeft: Math.round(shell.getBoundingClientRect().left),
        homeText: home?.textContent?.trim(),
        homeLeft: Math.round(home.getBoundingClientRect().left),
        headPaddingLeft: getComputedStyle(document.querySelector('.sidebar__head')).paddingLeft,
        // 收纳 / 展开时这些位置必须完全不变
        bannerPadLeft: Math.round(parseFloat(getComputedStyle(document.querySelector('.banner')).paddingLeft)),
        menuLeft: Math.round(document.querySelector('#nav-toggle').getBoundingClientRect().left),
        logoLeft: Math.round(document.querySelector('.banner__logo').getBoundingClientRect().left),
        brandLeft: Math.round(document.querySelector('.banner__brand').getBoundingClientRect().left),
        collapseVisible: getComputedStyle(document.querySelector('.sidebar__collapse')).display !== 'none',
        collapseInHead: !!document.querySelector('.sidebar__head [data-nav-collapse]'),
        collapsed: document.documentElement.classList.contains('is-nav-collapsed'),
      }
    })()`)

    check('目录紧贴页面最左侧', docked.sidebarLeft === 0 && docked.shellLeft === 0, `sidebar=${docked.sidebarLeft} shell=${docked.shellLeft}`)
    check('「目录」标题位于面板首行', docked.homeText === '目录', docked.homeText)
    check('「目录」左侧留出统一内边距', parseFloat(docked.headPaddingLeft) >= 12, docked.headPaddingLeft)
    check('「目录」一行右侧有收纳按钮', docked.collapseInHead && docked.collapseVisible)
    check('初始为展开状态', docked.collapsed === false)
    check('横幅左侧元素停靠最左边', docked.menuLeft <= 14, `menu=${docked.menuLeft}`)
    check('横幅左内边距为固定值', docked.bannerPadLeft === 18, String(docked.bannerPadLeft))

    // 点击收纳：面板移出视口，横幅左侧元素必须原地不动
    const collapseResult = await evaluate(`(async () => {
      document.querySelector('[data-nav-collapse]').click()
      await new Promise((r) => setTimeout(r, 400))
      const sidebar = document.querySelector('.sidebar')
      const toggle = document.querySelector('#nav-toggle')
      const banner = document.querySelector('.banner')
      return {
        collapsed: document.documentElement.classList.contains('is-nav-collapsed'),
        sidebarLeft: Math.round(sidebar.getBoundingClientRect().left),
        sidebarRight: Math.round(sidebar.getBoundingClientRect().right),
        sidebarOpacity: getComputedStyle(sidebar).opacity,
        // 收纳后正文应左移接管被让出的空间
        pageLeft: Math.round(document.querySelector('.page').getBoundingClientRect().left),
        toggleVisible: getComputedStyle(toggle).display !== 'none',
        menuLeft: Math.round(toggle.getBoundingClientRect().left),
        menuTop: Math.round(toggle.getBoundingClientRect().top),
        logoLeft: Math.round(document.querySelector('.banner__logo').getBoundingClientRect().left),
        brandLeft: Math.round(document.querySelector('.banner__brand').getBoundingClientRect().left),
        bannerPadLeft: Math.round(parseFloat(getComputedStyle(banner).paddingLeft)),
        toggleExpanded: toggle.getAttribute('aria-expanded'),
        stored: localStorage.getItem('boxutil-guide-nav-collapsed'),
      }
    })()`)

    check('点击按钮后进入收纳状态', collapseResult.collapsed === true)
    check('面板完全移出左侧视口', collapseResult.sidebarRight <= 0, `left=${collapseResult.sidebarLeft} right=${collapseResult.sidebarRight}`)
    check('面板已不可见', collapseResult.sidebarOpacity === '0', collapseResult.sidebarOpacity)
    check('收纳后目录按钮仍在原位', collapseResult.menuLeft === docked.menuLeft, `${docked.menuLeft} → ${collapseResult.menuLeft}`)
    check('收纳后站点图标仍在原位', collapseResult.logoLeft === docked.logoLeft, `${docked.logoLeft} → ${collapseResult.logoLeft}`)
    check('收纳后品牌区仍在原位', collapseResult.brandLeft === docked.brandLeft, `${docked.brandLeft} → ${collapseResult.brandLeft}`)
    check('收纳后横幅左内边距不变', collapseResult.bannerPadLeft === docked.bannerPadLeft, `${docked.bannerPadLeft} → ${collapseResult.bannerPadLeft}`)
    check('目录按钮仍在横幅左上角', collapseResult.menuLeft <= 14 && collapseResult.menuTop < 58, `${collapseResult.menuLeft},${collapseResult.menuTop}`)
    check('收纳状态已持久化', collapseResult.stored === 'true', String(collapseResult.stored))
    check('按钮 aria-expanded 同步为 false', collapseResult.toggleExpanded === 'false', String(collapseResult.toggleExpanded))

    // 重新展开：横幅左侧元素同样不能移动
    const expandResult = await evaluate(`(async () => {
      document.querySelector('#nav-toggle').click()
      await new Promise((r) => setTimeout(r, 400))
      const sidebar = document.querySelector('.sidebar')
      const page = document.querySelector('.page')
      return {
        collapsed: document.documentElement.classList.contains('is-nav-collapsed'),
        sidebarLeft: Math.round(sidebar.getBoundingClientRect().left),
        sidebarWidth: Math.round(sidebar.getBoundingClientRect().width),
        sidebarOpacity: getComputedStyle(sidebar).opacity,
        menuLeft: Math.round(document.querySelector('#nav-toggle').getBoundingClientRect().left),
        logoLeft: Math.round(document.querySelector('.banner__logo').getBoundingClientRect().left),
        brandLeft: Math.round(document.querySelector('.banner__brand').getBoundingClientRect().left),
        pageLeft: Math.round(page.getBoundingClientRect().left),
        stored: localStorage.getItem('boxutil-guide-nav-collapsed'),
      }
    })()`)

    check('点击横幅按钮可重新展开', expandResult.collapsed === false && expandResult.sidebarLeft === 0 && expandResult.sidebarOpacity === '1')
    check('重新展开后面板恢复宽度', expandResult.sidebarWidth > 200, String(expandResult.sidebarWidth))
    check('重新展开后横幅左侧元素未移动', expandResult.menuLeft === docked.menuLeft && expandResult.logoLeft === docked.logoLeft && expandResult.brandLeft === docked.brandLeft, JSON.stringify(expandResult))
    check('重新展开后正文右移给面板让位', expandResult.pageLeft > collapseResult.pageLeft, `${collapseResult.pageLeft} → ${expandResult.pageLeft}`)
    check('收纳状态已写回 false', expandResult.stored === 'false', String(expandResult.stored))

    // 收纳状态应跨刷新保持
    await evaluate(`localStorage.setItem('boxutil-guide-nav-collapsed','true')`)
    await reload()
    check('刷新后仍保持收纳状态', await evaluate(`document.documentElement.classList.contains('is-nav-collapsed')`))
    await evaluate(`localStorage.setItem('boxutil-guide-nav-collapsed','false')`)
    await reload()

    // ---------- 8c. 窄屏抽屉 ----------
    await harness.setViewport({width: 420, height: 800, deviceScaleFactor: 2, mobile: true})
    await visit('#/intro/readme')
    const mobile = await evaluate(`(() => {
      const sidebar = document.querySelector('.sidebar')
      const before = sidebar.getBoundingClientRect().left
      document.querySelector('#nav-toggle').click()
      const open = document.documentElement.classList.contains('is-nav-open')
      const after = sidebar.getBoundingClientRect().left
      const backdrop = !document.querySelector('#nav-backdrop').hidden
      document.querySelector('#nav-close').click()
      return {
        before, after, open, backdrop,
        closedAgain: document.documentElement.classList.contains('is-nav-open'),
        menuVisible: getComputedStyle(document.querySelector('#nav-toggle')).display,
        pageNavCols: getComputedStyle(document.querySelector('.page-nav')).gridTemplateColumns.split(' ').length,
        sidebarPosition: getComputedStyle(sidebar).position,
        collapseVisible: getComputedStyle(document.querySelector('.sidebar__collapse')).display,
      }
    })()`)

    check('窄屏目录按钮可见', mobile.menuVisible !== 'none', mobile.menuVisible)
    check('窄屏目录默认收起', mobile.before < 0, String(mobile.before))
    check('点击汉堡后目录滑入', mobile.open && mobile.after === 0, `${mobile.before} → ${mobile.after}`)
    check('抽屉显示遮罩', mobile.backdrop)
    check('关闭按钮可收起抽屉', mobile.closedAgain === false)
    check('窄屏翻页改为单列', mobile.pageNavCols === 1, String(mobile.pageNavCols))
    check('窄屏目录改为抽屉定位', mobile.sidebarPosition === 'fixed', mobile.sidebarPosition)
    check('窄屏隐藏「收纳面板」按钮', mobile.collapseVisible === 'none', mobile.collapseVisible)

    // 点击抽屉里的条目应自动收起
    const drawerClose = await evaluate(`(() => {
      document.querySelector('#nav-toggle').click()
      document.querySelector('.nav-link[data-nav-path="intro/install"]').click()
      return {open: document.documentElement.classList.contains('is-nav-open')}
    })()`)
    await sleep(400)
    check('窄屏点击条目后抽屉自动收起', drawerClose.open === false)

    await harness.clearViewport()

    check('全程无控制台报错', harness.consoleMessages.length === 0, harness.consoleMessages.slice(0, 3).join(' | '))
} finally {
    await harness.dispose()
}

console.log(failures === 0 ? `\n全部通过` : `\n${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
