// 用无头浏览器抓取各断点 / 主题 / 目录状态下的截图，便于人工核对视觉效果。
//
// 用法：npm run build && node scripts/shots.mjs
import {join} from 'node:path'
import {launch, PROJECT_ROOT} from './browser-harness.mjs'

const harness = await launch()
const {evaluate, visit, reload, sleep, screenshot, setViewport} = harness
const outDir = join(PROJECT_ROOT, '.screenshots')

const DESKTOP = {width: 1440, height: 900}
const MOBILE = {width: 420, height: 860, deviceScaleFactor: 2, mobile: true}

const shots = [
    {name: 'readme-light', hash: '#/intro/readme', theme: 'light', viewport: DESKTOP, collapsed: false},
    {name: 'readme-dark', hash: '#/intro/readme', theme: 'dark', viewport: DESKTOP, collapsed: false},
    {name: 'readme-collapsed', hash: '#/intro/readme', theme: 'light', viewport: DESKTOP, collapsed: true},
    {name: 'desktop-dark', hash: '#/rendering_entity/lifecycle', theme: 'dark', viewport: DESKTOP, collapsed: false},
    {name: 'tablet-light', hash: '#/static_trail/custom_trail', theme: 'light', viewport: {width: 900, height: 950}, collapsed: false},
    {name: 'wide-light', hash: '#/intro/install', theme: 'light', viewport: {width: 2200, height: 1000}, collapsed: false},
    {name: 'mobile-readme', hash: '#/intro/readme', theme: 'light', viewport: MOBILE, collapsed: false},
    {name: 'mobile-dark-drawer', hash: '#/intro/readme', theme: 'dark', viewport: MOBILE, openDrawer: true},
]

try {
    for (const shot of shots) {
        await setViewport(shot.viewport)
        await visit(shot.hash, {waitForShiki: false})
        // 写入主题与目录状态后整页重载，保证首帧就是目标状态
        await evaluate(`localStorage.setItem('boxutil-guide-theme', '${shot.theme}')`)
        await evaluate(`localStorage.setItem('boxutil-guide-nav-collapsed', '${shot.collapsed === true}')`)
        await reload()
        if (shot.openDrawer) await evaluate(`document.querySelector('#nav-toggle').click()`)
        await sleep(1800) // 等 shiki 高亮与布局动画结束
        console.log(`✓ ${await screenshot(join(outDir, `${shot.name}.png`))}`)
    }
} finally {
    await harness.dispose()
}
