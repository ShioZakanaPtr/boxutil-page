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
                description: 'BoxUtil ——适用于 StartSector 的近现代图形库/引擎',
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
                slug: 'thread_dispatch',
                title: '多线程调度',
                description: '主线程与内置的后台线程',
                load: async () => (await import('../content/intro/thread_dispatch.ts')).default,
            },
        ],
    },
    {
        folder: 'rendering_entity',
        title: '渲染实体',
        icon: 'menu',
        items: [
            {
                slug: 'entities',
                title: '渲染实体',
                description: 'BoxUtil中的标准渲染类',
                load: async () => (await import('../content/rendering_entity/entities.ts')).default,
            },
            {
                slug: 'render_data',
                title: '接口 - RenderDataAPI',
                description: '所有渲染类的基础',
                load: async () => (await import('../content/rendering_entity/render_data.ts')).default,
            },
            {
                slug: 'material_render',
                title: '接口 - MaterialRenderAPI',
                description: '能使用纹理材质的渲染类',
                load: async () => (await import('../content/rendering_entity/material_render.ts')).default,
            },
            {
                slug: 'instance_render',
                title: '接口 - InstanceRenderAPI',
                description: '借助实例化渲染实现巨量粒子同屏的视觉效果',
                load: async () => (await import('../content/rendering_entity/instance_render.ts')).default,
            },
            {
                slug: 'common',
                title: 'CommonEntity',
                description: 'OBJ格式的3D模型渲染',
                load: async () => (await import('../content/rendering_entity/common.ts')).default,
            },
            {
                slug: 'sprite',
                title: 'SpriteEntity',
                description: '常用于各式粒子特效',
                load: async () => (await import('../content/rendering_entity/sprite.ts')).default,
            },
            {
                slug: 'curve',
                title: 'CurveEntity',
                description: '单形态实例化曲线',
                load: async () => (await import('../content/rendering_entity/curve.ts')).default,
            },
            {
                slug: 'segment',
                title: 'SegmentEntity',
                description: '多形态合批绘制曲线',
                load: async () => (await import('../content/rendering_entity/segment.ts')).default,
            },
            {
                slug: 'trail',
                title: 'TrailEntity',
                description: '一系列直线段的渲染',
                load: async () => (await import('../content/rendering_entity/trail.ts')).default,
            },
            {
                slug: 'flare',
                title: 'FlareEntity',
                description: '闪光与光斑',
                load: async () => (await import('../content/rendering_entity/flare.ts')).default,
            },
            {
                slug: 'text_field',
                title: 'TextFieldEntity',
                description: '支持多样式的位图字体显示',
                load: async () => (await import('../content/rendering_entity/text_field.ts')).default,
            },
            {
                slug: 'distortion',
                title: 'DistortionEntity',
                description: '失真与扭曲效果',
                load: async () => (await import('../content/rendering_entity/distortion.ts')).default,
            },
        ],
    },
    {
        folder: 'static_trail',
        title: '静态尾迹',
        icon: 'menu',
        items: [
            {
                slug: 'autogen_register',
                title: '静态尾迹',
                description: '自动为所有弹丸与导弹生成尾迹的内置系统',
                load: async () => (await import('../content/static_trail/autogen_register.ts')).default,
            },
            {
                slug: 'custom_trail',
                title: '自定义尾迹',
                description: '自行控制尾迹的创建，与尾迹Node的生成',
                load: async () => (await import('../content/static_trail/custom_trail.ts')).default,
            },
        ],
    },
    {
        folder: 'tool',
        title: '工具类与杂项',
        icon: 'menu',
        items: [
            {
                slug: 'rendering_util',
                title: 'RenderingUtil',
                description: '开箱即用的特效生成方法',
                load: async () => (await import('../content/tool/rendering_util.ts')).default,
            },
            {
                slug: 'curve_util',
                title: 'CurveUtil',
                description: '曲线几何与光束生成',
                load: async () => (await import('../content/tool/curve_util.ts')).default,
            },
            {
                slug: 'shader_util',
                title: 'ShaderUtil',
                description: '快速创建着色器程序与视效资源生成',
                load: async () => (await import('../content/tool/shader_util.ts')).default,
            },
            {
                slug: 'gpu_memory_pool',
                title: 'GPU内存池',
                description: '方便地管理一系列数据，避免创建大量缓冲对象或频繁绑定',
                load: async () => (await import('../content/tool/gpu_memory_pool.ts')).default,
            },
        ],
    },
    {
        folder: 'example',
        title: '示例',
        icon: 'menu',
        items: [
            {
                slug: 'curve_beam',
                title: '曲线光束',
                description: '',
                load: async () => (await import('../content/example/curve_beam.ts')).default,
            },
            {
                slug: 'instanced_particle',
                title: '实例化粒子',
                description: '',
                load: async () => (await import('../content/example/instanced_particle.ts')).default,
            },
            {
                slug: 'rendering_text',
                title: '文本渲染',
                description: '',
                load: async () => (await import('../content/example/rendering_text.ts')).default,
            },
        ],
    },
]
