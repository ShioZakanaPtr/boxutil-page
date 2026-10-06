import {icon} from './icons.ts'

/**
 * 文档插图（.doc-figure img）的放大预览。
 *
 * 打开时用 FLIP 思路做 0.1s 过渡：先按「自适应窗口」把图片放进 fixed 覆盖层，
 * 再反推它与页面里原始位置之间的位移与缩放当作过渡起点，
 * 于是图片看起来是从原位置淡入并平移到中央的。
 *
 * 过渡结束后可以自由缩放：
 * - PC：滚轮缩放（以光标为锚点）、单指拖动查看
 * - 触屏：双指缩放，单指拖动查看
 *
 * 底部工具条分三组，用分割线隔开：倍率 + 当前尺寸 | 尺寸调节 | 纹理过滤。
 */

/** 与 CSS 中的过渡时长保持一致（0.1s） */
const DURATION = 100
/** 缩放倍率的上下限（相对图片原始像素） */
const MIN_SCALE = 0.05
const MAX_SCALE = 16
/** 超过这个位移就认为是在拖动画面，而不是点击图片 */
const DRAG_THRESHOLD = 4
/** 纹理过滤模式的存档键：全局记忆，下次打开预览时沿用 */
const FILTER_KEY = 'boxutil-guide-image-filter'

type FilterMode = 'linear' | 'nearest'

interface LightboxRefs {
    root: HTMLDivElement
    backdrop: HTMLDivElement
    viewport: HTMLDivElement
    image: HTMLImageElement
    zoom: HTMLSpanElement
    size: HTMLSpanElement
    fit: HTMLButtonElement
    actual: HTMLButtonElement
    filter: HTMLButtonElement
    close: HTMLButtonElement
}

let refs: LightboxRefs | null = null

/** 覆盖层是否已打开：其它控件（目录 Esc、← → 翻页）据此让出按键 */
let opened = false
/** 打开 / 关闭的过渡进行中：期间忽略滚轮、点击、拖动与按键 */
let animating = false

/** 纹理过滤模式，全局记忆 */
let filter: FilterMode = 'linear'
let filterLoaded = false

let scale = 1
/** 刚好完整显示在窗口内所需的倍率；>= 1 表示无需缩小 */
let fitScale = 1
let naturalWidth = 0
let naturalHeight = 0
/** 触发预览的那张页面图片，关闭时飞回它的位置 */
let source: HTMLImageElement | null = null
let smoothTimer = 0

/** 参与手势的指针：1 个拖动画面，2 个双指缩放 */
const pointers = new Map<number, {x: number; y: number}>()
let pinchDistance = 0
let pan: {x: number; y: number; left: number; top: number} | null = null
let dragged = false

/** 覆盖层是否已打开（过渡期间也算打开） */
export function isLightboxOpen(): boolean {
    return opened
}

/** 过渡结束后才允许交互 */
function ready(): boolean {
    return opened && !animating
}

export function setupLightbox(): void {
    document.addEventListener('click', (event) => {
        const target = event.target
        if (!(target instanceof Element)) return
        if (event.defaultPrevented || event.button !== 0) return
        // 中键 / 修饰键点击交给浏览器（复制图片、在新标签页打开等）
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

        const image = target.closest('.doc-figure img')
        if (!(image instanceof HTMLImageElement) || image.closest('.lightbox')) return

        event.preventDefault()
        open(image)
    })

    ensure()
}

/** 关闭预览（路由切换时由 app.ts 调用） */
export function closeLightbox(): void {
    if (!opened || animating) return

    const el = refs
    const target = source
    if (!el) return
    if (!target || !target.isConnected || target.getBoundingClientRect().width <= 0) {
        teardown()
        return
    }

    const to = el.image.getBoundingClientRect()
    const from = target.getBoundingClientRect()
    const ratio = to.width > 0 ? from.width / to.width : 1

    animating = true
    el.root.classList.remove('is-ready')
    el.root.classList.add('is-animating')
    el.image.classList.remove('is-smooth')
    el.image.style.transformOrigin = 'top left'
    el.image.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${ratio})`
    el.image.style.opacity = '0'
    el.backdrop.style.opacity = '0'

    window.setTimeout(teardown, DURATION + 30)
}

function open(image: HTMLImageElement): void {
    if (opened || animating) return

    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const from = image.getBoundingClientRect()
    if (!width || !height || from.width <= 0) return

    const el = ensure()

    naturalWidth = width
    naturalHeight = height
    source = image
    opened = true
    animating = true

    // 锁住页面滚动：html 上加了 overflow: hidden，配合 scrollbar-gutter: stable 不会左右抖动
    document.documentElement.classList.add('is-lightbox-open')

    el.image.src = image.currentSrc || image.src
    el.image.alt = image.alt
    el.image.classList.remove('is-smooth')
    el.image.style.transition = 'none'
    el.image.style.transformOrigin = 'top left'
    el.image.style.transform = 'none'
    el.image.style.opacity = '0'
    applyFilter()
    el.root.hidden = false
    el.root.setAttribute('aria-hidden', 'false')
    el.root.classList.remove('is-ready')
    el.root.classList.add('is-animating')
    el.backdrop.style.opacity = '0'

    fitScale = computeFit()
    scale = fitScale
    applySize()
    updateBar()

    // 目标位置（尚未应用 transform 的布局位置），据此反推过渡起点
    const to = el.image.getBoundingClientRect()
    const ratio = to.width > 0 ? from.width / to.width : 1
    el.image.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${ratio})`

    // 强制一次样式计算，让下面的改动成为过渡的终点，而不是被合并进同一帧
    void el.image.offsetWidth

    el.image.style.transition = ''
    el.image.style.transform = 'none'
    el.image.style.opacity = '1'
    el.backdrop.style.opacity = '1'

    el.close.focus({preventScroll: true})

    window.setTimeout(() => {
        animating = false
        el.root.classList.remove('is-animating')
        el.root.classList.add('is-ready')
    }, DURATION + 30)
}

function teardown(): void {
    const el = refs
    if (!el) return

    opened = false
    animating = false
    source = null
    pointers.clear()
    pan = null
    pinchDistance = 0
    dragged = false
    window.clearTimeout(smoothTimer)

    el.root.hidden = true
    el.root.classList.remove('is-ready', 'is-animating')
    el.root.setAttribute('aria-hidden', 'true')
    el.image.classList.remove('is-smooth')
    el.image.removeAttribute('style')
    el.backdrop.removeAttribute('style')

    document.documentElement.classList.remove('is-lightbox-open')
}

/**
 * 刚好完整显示在窗口内所需的倍率；图片本来就装得下时返回 1（按原尺寸显示，不放大）。
 *
 * 用 border box 而不是 clientWidth / clientHeight：后者会被滚动条吃掉十几像素，
 * 而滚动条是「先有内容再有滚动条」的，用它算倍率会让同一个窗口在不同时刻得到不同结果。
 * 末尾再留 1px 余量，避免算出的尺寸刚好卡在边界上又反过来撑出一条滚动条。
 */
function computeFit(): number {
    const el = refs!
    const style = getComputedStyle(el.viewport)
    const rect = el.viewport.getBoundingClientRect()
    const boxWidth = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 1
    const boxHeight = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 1
    if (boxWidth <= 0 || boxHeight <= 0) return 1
    return Math.max(MIN_SCALE, Math.min(1, boxWidth / naturalWidth, boxHeight / naturalHeight))
}

/** 按当前倍率写回图片尺寸 */
function applySize(): void {
    const el = refs!
    el.image.style.width = `${naturalWidth * scale}px`
    el.image.style.height = `${naturalHeight * scale}px`
}

function loadFilter(): void {
    if (filterLoaded) return
    filterLoaded = true
    if (localStorage.getItem(FILTER_KEY) === 'nearest') filter = 'nearest'
}

/** 纹理过滤：nearest 用 CSS 的 pixelated（对应 GL_NEAREST），其余交给浏览器的平滑缩放（GL_LINEAR） */
function applyFilter(): void {
    const el = refs
    if (!el) return
    el.image.style.imageRendering = filter === 'nearest' ? 'pixelated' : 'auto'
}

/** 同步底部工具条：倍率、当前尺寸、两个尺寸按钮的选中态、过滤模式按钮 */
function updateBar(): void {
    const el = refs
    if (!el) return

    el.zoom.textContent = `${Math.round(scale * 100)}%`
    el.size.textContent = `${Math.round(naturalWidth * scale)} x ${Math.round(naturalHeight * scale)}`

    // 两个按钮始终可点：即便当前倍率已经相同，也允许再点一次（不做禁用）
    const atFit = Math.abs(scale - fitScale) < 0.005
    const atActual = Math.abs(scale - 1) < 0.005
    el.fit.classList.toggle('is-active', atFit)
    el.actual.classList.toggle('is-active', atActual)
    el.fit.setAttribute('aria-pressed', String(atFit))
    el.actual.setAttribute('aria-pressed', String(atActual))

    const fitLabel = '缩放至自适应尺寸'
    const actualLabel = '缩放至原尺寸'
    el.fit.title = fitLabel
    el.actual.title = actualLabel
    el.fit.setAttribute('aria-label', fitLabel)
    el.actual.setAttribute('aria-label', actualLabel)

    el.filter.dataset.filter = filter
    el.filter.setAttribute('aria-pressed', String(filter === 'nearest'))
    el.filter.innerHTML = icon(filter === 'nearest' ? 'filterNearest' : 'filterLinear')
    const label = filter === 'nearest' ? '邻近过滤（点击切换为线性过滤）' : '线性过滤（点击切换为邻近过滤）'
    el.filter.title = label
    el.filter.setAttribute('aria-label', label)
}

/**
 * 以 (clientX, clientY) 为锚点缩放到 next 倍率。
 * smooth 为 true 时交给 CSS 过渡（按钮 / 点击切换），否则立即生效（滚轮 / 双指）。
 */
function zoom(clientX: number, clientY: number, next: number, smooth: boolean): void {
    const el = refs
    if (!el) return

    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
    if (Math.abs(clamped - scale) < 1e-4) return

    const before = el.image.getBoundingClientRect()

    el.image.classList.toggle('is-smooth', smooth)
    if (smooth) {
        window.clearTimeout(smoothTimer)
        smoothTimer = window.setTimeout(() => el.image.classList.remove('is-smooth'), DURATION * 3)
    }

    scale = clamped
    applySize()
    updateBar()

    // 让光标下的那个点在缩放前后停在同一处。smooth 时尺寸尚未变化，
    // 这里算出的修正量为 0，交给浏览器在过渡结束后自然夹紧滚动位置。
    if (before.width <= 0 || before.height <= 0) return
    const after = el.image.getBoundingClientRect()
    const ratioX = (clientX - before.left) / before.width
    const ratioY = (clientY - before.top) / before.height
    el.viewport.scrollLeft += after.width * ratioX - (clientX - after.left)
    el.viewport.scrollTop += after.height * ratioY - (clientY - after.top)
}

/** 以画面中心为锚点切换到指定倍率 */
function zoomTo(next: number): void {
    const el = refs
    if (!el) return
    zoom(el.viewport.clientWidth / 2, el.viewport.clientHeight / 2, next, true)
}

function ensure(): LightboxRefs {
    if (refs) return refs

    loadFilter()

    const root = document.createElement('div')
    root.className = 'lightbox'
    root.id = 'lightbox'
    root.hidden = true
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-modal', 'true')
    root.setAttribute('aria-label', '图片预览')
    root.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__viewport">
      <img class="lightbox__image" alt="" decoding="async" draggable="false">
    </div>
    <div class="lightbox__bar">
      <span class="lightbox__zoom" aria-live="polite">100%</span>
      <span class="lightbox__size">0 x 0</span>
      <span class="lightbox__divider" aria-hidden="true"></span>
      <button type="button" class="lightbox__action" data-action="fit">${icon('fit')}</button>
      <button type="button" class="lightbox__action" data-action="actual">${icon('actual')}</button>
      <span class="lightbox__divider" aria-hidden="true"></span>
      <button type="button" class="lightbox__action" data-action="filter">${icon('filterLinear')}</button>
    </div>
    <button type="button" class="lightbox__close icon-btn" aria-label="关闭预览" title="关闭预览（Esc）">
      ${icon('close')}
    </button>`
    document.body.append(root)

    const backdrop = root.querySelector<HTMLDivElement>('.lightbox__backdrop')!
    const viewport = root.querySelector<HTMLDivElement>('.lightbox__viewport')!
    const image = root.querySelector<HTMLImageElement>('.lightbox__image')!
    const zoomLabel = root.querySelector<HTMLSpanElement>('.lightbox__zoom')!
    const size = root.querySelector<HTMLSpanElement>('.lightbox__size')!
    const fitButton = root.querySelector<HTMLButtonElement>('.lightbox__action[data-action="fit"]')!
    const actualButton = root.querySelector<HTMLButtonElement>('.lightbox__action[data-action="actual"]')!
    const filterButton = root.querySelector<HTMLButtonElement>('.lightbox__action[data-action="filter"]')!
    const close = root.querySelector<HTMLButtonElement>('.lightbox__close')!

    const el: LightboxRefs = {
        root,
        backdrop,
        viewport,
        image,
        zoom: zoomLabel,
        size,
        fit: fitButton,
        actual: actualButton,
        filter: filterButton,
        close,
    }
    refs = el

    /** 双指的距离与中点 */
    const pinch = (): {distance: number; x: number; y: number} | null => {
        const [a, b] = [...pointers.values()]
        if (!a || !b) return null
        return {
            distance: Math.hypot(a.x - b.x, a.y - b.y),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
        }
    }

    // ---- 空白处点击关闭 ----
    viewport.addEventListener('click', (event) => {
        if (!ready()) return
        if (event.target instanceof Element && event.target.closest('.lightbox__image')) return
        closeLightbox()
    })

    close.addEventListener('click', () => closeLightbox())

    // ---- 尺寸调节：两个按钮各自应用对应倍率，任何时候都可点 ----
    fitButton.addEventListener('click', () => {
        if (!ready()) return
        zoomTo(fitScale)
    })

    actualButton.addEventListener('click', () => {
        if (!ready()) return
        zoomTo(1)
    })

    // ---- 纹理过滤：全局记忆 ----
    filterButton.addEventListener('click', () => {
        if (!ready()) return
        filter = filter === 'nearest' ? 'linear' : 'nearest'
        localStorage.setItem(FILTER_KEY, filter)
        applyFilter()
        updateBar()
    })

    // ---- 点击图片：放大到原尺寸，或从原尺寸缩回自适应 ----
    image.addEventListener('click', (event) => {
        event.stopPropagation()
        if (!ready() || dragged) return
        const next = Math.abs(scale - 1) < 1e-3 ? fitScale : 1
        const rect = image.getBoundingClientRect()
        const cx = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth)
        const cy = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight)
        zoom(cx, cy, next, true)
    })

    // ---- PC：滚轮缩放 ----
    viewport.addEventListener(
        'wheel',
        (event) => {
            if (!ready()) return
            event.preventDefault()
            // deltaMode 1 = 以「行」为单位，换算成像素后再统一处理
            const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
            zoom(event.clientX, event.clientY, scale * Math.exp(-delta * 0.0014), false)
        },
        {passive: false},
    )

    // ---- 触屏：单指拖动 / 双指缩放 ----
    viewport.addEventListener('pointerdown', (event) => {
        if (!ready()) return
        if (event.pointerType === 'mouse' && event.button !== 0) return
        pointers.set(event.pointerId, {x: event.clientX, y: event.clientY})
        dragged = false
        if (pointers.size === 1) {
            pan = {x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop}
            pinchDistance = 0
        } else {
            pan = null
            pinchDistance = pinch()?.distance ?? 0
        }
    })

    window.addEventListener('pointermove', (event) => {
        if (!pointers.has(event.pointerId) || !ready()) return
        pointers.set(event.pointerId, {x: event.clientX, y: event.clientY})

        if (pointers.size >= 2) {
            const current = pinch()
            if (!current) return
            if (pinchDistance > 0) zoom(current.x, current.y, scale * (current.distance / pinchDistance), false)
            pinchDistance = current.distance
            dragged = true
            return
        }

        if (!pan) return
        const dx = event.clientX - pan.x
        const dy = event.clientY - pan.y
        if (!dragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragged = true
        if (!dragged) return
        viewport.scrollLeft = pan.left - dx
        viewport.scrollTop = pan.top - dy
    })

    const release = (event: PointerEvent): void => {
        if (!pointers.delete(event.pointerId)) return
        pinchDistance = 0
        const rest = [...pointers.values()][0]
        pan = rest ? {x: rest.x, y: rest.y, left: viewport.scrollLeft, top: viewport.scrollTop} : null
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)

    // ---- Esc 关闭（捕获阶段，先于目录的 Esc 处理） ----
    window.addEventListener(
        'keydown',
        (event) => {
            if (event.key !== 'Escape' || !opened) return
            event.preventDefault()
            event.stopPropagation()
            closeLightbox()
        },
        true,
    )

    // ---- 窗口尺寸变化：重新计算自适应倍率 ----
    window.addEventListener('resize', () => {
        if (!ready()) return
        const wasFit = Math.abs(scale - fitScale) < 1e-3
        fitScale = computeFit()
        if (!wasFit) {
            updateBar()
            return
        }
        scale = fitScale
        el.image.classList.remove('is-smooth')
        applySize()
        updateBar()
    })

    return el
}
