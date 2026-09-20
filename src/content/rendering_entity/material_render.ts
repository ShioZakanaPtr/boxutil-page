export default `
<p>部分渲染类会实现该接口，表明其能够通过设定纹理实现更复杂的视觉效果。</p>
<p>这些渲染类会使用 <code>MaterialData</code> 存放各式纹理与材质属性，每个实现了该接口的渲染类在创建后会拥有一个默认的非 <code>null</code> 材质类，故不用特地进行检查。</p>

<h2>MaterialData</h2>
<p>在BoxUtil引擎中，<code>MaterialData</code> 是包括渲染类在内，绝大部分业务都在使用的标准材质类。</p>
<p>目前，材质类可以配置五层不同用途的纹理：</p>
<table>
    <thead>
        <tr><th>类型</th><th>说明</th><th>默认值</th></tr>
    </thead>
    <tbody>
        <tr><td>Diffuse</td><td>用于表达基本的颜色，考虑到Starsector原版的画面风格，使用传统的Diffuse纹理会比Basecolor或Albedo纹理更加适合</td><td><code>BUtil_ONE</code> / 白色填充</td></tr>
        <tr><td>Normal</td><td>法线贴图，用于在进行光照计算中获知物体表面更细致的几何情况；通常情况下忽略Alpha通道</td><td><code>BUtil_Z</code> / Z填充</td></tr>
        <tr><td>Complex</td><td>为材料表现控制的贴图，其中Red通道控制自发光蒙版（用于将Diffuse添加到Emissive输出），Green通道控制粗糙度，Blue通道控制金属度；通常情况下忽略Alpha通道</td><td><code>BUtil_COMPLEX_DEF</code> / {0.0 自发光蒙版, 0.5 粗糙度, 0.5 金属度}</td></tr>
        <tr><td>Emissive</td><td>发光层，根据材质类的配置将能够根据该贴图应用Bloom后处理，以获得惊艳的视觉效果</td><td><code>BUtil_NONE</code> / 空填充</td></tr>
        <tr><td>Tangent</td><td>切线贴图，通常用于在各向异性着色（若当前启用的光影包支持）时控制光照情况；通常情况下忽略Alpha通道</td><td><code>BUtil_X</code> / X填充</td></tr>
    </tbody>
</table>
<p>所有纹理层都拥有相应的getter与setter，支持传入 <code>SpriteAPI</code> 对象或直接使用OpenGL纹理对象的ID。</p>
<p>除了设置纹理外，材质类还拥有以下属性：</p>
<table>
    <thead>
        <tr><th>方法</th><th>说明</th></tr>
    </thead>
    <tbody>
        <tr><td><code>setColor</code></td><td>设置材质的颜色</td></tr>
        <tr><td><code>setColorAlpha</code></td><td>设置材质颜色的透明度</td></tr>
        <tr><td><code>setEmissiveColor</code></td><td>设置Emissive层的颜色</td></tr>
        <tr><td><code>setEmissiveColorAlpha</code></td><td>设置Emissive层颜色的透明度</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setAlphaToEmissive</code></td><td>控制材质颜色的Alpha部分对EmissiveColor的影响量，默认为 <code>1.0</code></td></tr>
        <tr><td><code>setColorToEmissive</code></td><td>控制材质颜色的RGB部分对EmissiveColor的影响量，默认为 <code>0.0</code></td></tr>
        <tr><td><code>setGlowPower</code></td><td>控制从Emissive产生的Bloom强度</td></tr>
        <tr><td><code>setEmissiveState</code></td><td>同时对 <code>setAlphaToEmissive</code>，<code>setColorToEmissive</code>，<code>setGlowPower</code>三者进行设定</td></tr>
        <tr><td><code>setAdditionEmissive</code></td><td>控制Emissive是否以直接相加的方式叠加至Diffuse层，默认以替换的形式表现这两层贴图</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setCullBack</code></td><td>绘制时剔除背面，默认为该模式</td></tr>
        <tr><td><code>setCullFront</code></td><td>绘制时剔除正面</td></tr>
        <tr><td><code>setCullFrontAndBack</code></td><td>绘制时剔除正面与背面，会导致什么图像都没有渲染</td></tr>
        <tr><td><code>setDisableCullFace</code></td><td>关闭正反面剔除，对于粒子效果通常会使用该模式</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setAnisotropic</code></td><td>控制各向异性表现的强度，为负数时通常表现为交换XY方向上的各向异性情况</td></tr>
        <tr><td><code>setIgnoreIllumination</code></td><td>忽略光照着色，用于通知光影包进行着色绘制时跳过该片段，对于粒子效果通常会启用</td></tr>
    </tbody>
</table>
`
