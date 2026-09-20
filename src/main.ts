import './style.css'
import {mount} from './app.ts'
import {Banner} from './widget/banner.ts'
import {Sidebar} from './widget/sidebar.ts'

const root = document.querySelector<HTMLDivElement>('#app')!

// 应用外壳只渲染一次；正文由 app.ts 的路由在 #page 内替换
root.innerHTML = `
  ${Banner()}
  <div class="shell">
    ${Sidebar()}
    <main class="main" id="main">
      <div class="page" id="page"></div>
    </main>
  </div>`

mount(root)
