import { defineConfig } from 'vite'

/**
 * 部署到 GitHub Pages 时的仓库名（https://<user>.github.io/<REPO_NAME>/）。
 * 如果仓库名不是 boxutil_page，改这里即可；自定义域名请改成 '/'.
 */
const REPO_NAME = 'boxutil_page'

export default defineConfig(({ command }) => ({
    // 开发环境用 '/'，生产构建用 '/<REPO_NAME>/'，否则 GitHub Pages 上资源会 404
    base: command === 'build' ? `/${REPO_NAME}/` : '/',
    build: {
        target: 'es2020',
        outDir: 'dist',
        // shiki 的语法/主题是按需动态 import 的，产物里保留独立的 chunk 更利于缓存
        chunkSizeWarningLimit: 1200,
    },
    server: {
        port: 5173,
        open: true,
    },
}))
