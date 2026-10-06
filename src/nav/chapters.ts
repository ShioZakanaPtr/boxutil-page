import type {Chapter} from '../content/types.ts'

/**
 * 全部章节与条目。左侧目录、横幅标题、上一页/下一页都从这份清单推导，
 * 新增页面只需要在这里加一项并写好对应的 content 文件。
 */
export const chapterList: Chapter[] = [
    {
        folder: 'intro',
        title: '入门',
        icon: 'menu',
        items: [
            {
                slug: 'readme',
                title: '前言',
                description: 'BoxUtil ——适用于 Starsector 的近现代图形库/引擎',
                load: async () => (await import('../content/intro/readme.ts')).default,
            },
            {
                slug: 'install',
                title: '代码配置',
                description: '为Mod接入BoxUtil',
                load: async () => (await import('../content/intro/install.ts')).default,
            },
            {
                slug: 'manager',
                title: '资源管理类',
                description: '渲染资源，添加渲染类，与引擎交互等',
                load: async () => (await import('../content/intro/manager.ts')).default,
            },
            {
                slug: 'thread-dispatch',
                title: '多线程调度',
                description: '主线程与内置的后台线程',
                load: async () => (await import('../content/intro/thread-dispatch.ts')).default,
            },
        ],
    },
    {
        folder: 'rendering-entity',
        title: '渲染实体',
        icon: 'menu',
        items: [
            {
                slug: 'entities',
                title: '渲染实体',
                description: 'BoxUtil中的标准渲染类',
                load: async () => (await import('../content/rendering-entity/entities.ts')).default,
            },
            {
                slug: 'render-data',
                title: '接口 - RenderDataAPI',
                description: '所有渲染类的基础',
                load: async () => (await import('../content/rendering-entity/render-data.ts')).default,
            },
            {
                slug: 'material-render',
                title: '接口 - MaterialRenderAPI',
                description: '能使用纹理材质的渲染类',
                load: async () => (await import('../content/rendering-entity/material-render.ts')).default,
            },
            {
                slug: 'instance-render',
                title: '接口 - InstanceRenderAPI',
                description: '借助实例化渲染实现巨量粒子同屏的视觉效果',
                load: async () => (await import('../content/rendering-entity/instance-render.ts')).default,
            },
            {
                slug: 'common',
                title: 'CommonEntity',
                description: 'OBJ格式的3D模型渲染',
                load: async () => (await import('../content/rendering-entity/common.ts')).default,
            },
            {
                slug: 'sprite',
                title: 'SpriteEntity',
                description: '常用于各式粒子特效',
                load: async () => (await import('../content/rendering-entity/sprite.ts')).default,
            },
            {
                slug: 'curve',
                title: 'CurveEntity',
                description: '单形态实例化曲线',
                load: async () => (await import('../content/rendering-entity/curve.ts')).default,
            },
            {
                slug: 'segment',
                title: 'SegmentEntity',
                description: '多形态合批绘制曲线',
                load: async () => (await import('../content/rendering-entity/segment.ts')).default,
            },
            {
                slug: 'trail',
                title: 'TrailEntity',
                description: '一系列直线段的渲染',
                load: async () => (await import('../content/rendering-entity/trail.ts')).default,
            },
            {
                slug: 'flare',
                title: 'FlareEntity',
                description: '闪光与光斑',
                load: async () => (await import('../content/rendering-entity/flare.ts')).default,
            },
            {
                slug: 'text-field',
                title: 'TextFieldEntity',
                description: '支持多样式的位图字体显示',
                load: async () => (await import('../content/rendering-entity/text-field.ts')).default,
            },
            {
                slug: 'distortion',
                title: 'DistortionEntity',
                description: '失真与扭曲效果',
                load: async () => (await import('../content/rendering-entity/distortion.ts')).default,
            },
        ],
    },
    {
        folder: 'static-trail',
        title: '静态尾迹',
        icon: 'menu',
        items: [
            {
                slug: 'autogen-register',
                title: '静态尾迹',
                description: '自动为所有弹丸与导弹生成尾迹的内置系统',
                load: async () => (await import('../content/static-trail/autogen-register.ts')).default,
            },
            {
                slug: 'custom-trail',
                title: '自定义尾迹',
                description: '自行控制尾迹的创建，与尾迹Node的生成',
                load: async () => (await import('../content/static-trail/custom-trail.ts')).default,
            },
        ],
    },
    {
        folder: 'tool',
        title: '工具类与杂项',
        icon: 'menu',
        items: [
            {
                slug: 'rendering-util',
                title: 'RenderingUtil',
                description: '开箱即用的特效生成方法',
                load: async () => (await import('../content/tool/rendering-util.ts')).default,
            },
            {
                slug: 'curve-util',
                title: 'CurveUtil',
                description: '曲线几何与光束生成',
                load: async () => (await import('../content/tool/curve-util.ts')).default,
            },
            {
                slug: 'shader-util',
                title: 'ShaderUtil',
                description: '快速创建着色器程序与视效资源生成',
                load: async () => (await import('../content/tool/shader-util.ts')).default,
            },
            {
                slug: 'shader-program',
                title: '着色器程序',
                description: '封装完备的着色器类',
                load: async () => (await import('../content/tool/shader-program.ts')).default,
            },
            {
                slug: 'math-stuff',
                title: '数学工具',
                description: '侧重于图形业务的数学相关库',
                load: async () => (await import('../content/tool/math-stuff.ts')).default,
            },
            {
                slug: 'gpu-memory-pool',
                title: 'GPU内存池',
                description: '方便地管理一系列数据，避免创建大量缓冲对象或频繁绑定',
                load: async () => (await import('../content/tool/gpu-memory-pool.ts')).default,
            },
        ],
    },
    {
        folder: 'example',
        title: '示例',
        icon: 'menu',
        items: [
            {
                slug: 'curve-beam',
                title: '曲线光束',
                description: '',
                load: async () => (await import('../content/example/curve-beam.ts')).default,
            },
            {
                slug: 'instanced-particle',
                title: '实例化粒子',
                description: '',
                load: async () => (await import('../content/example/instanced-particle.ts')).default,
            },
            {
                slug: 'rendering-text',
                title: '文本渲染',
                description: '',
                load: async () => (await import('../content/example/rendering-text.ts')).default,
            },
        ],
    },
]
