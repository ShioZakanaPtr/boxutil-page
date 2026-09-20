import{t as e}from"./index-Dul7q8y_.js";var t=`
<figure class="doc-figure">
    <img src="${e}" width="512" height="512" loading="lazy" decoding="async" alt="BUtil_ModIcon"/>
</figure>

<p>该指南对前置Mod <a href="https://github.com/ShioZakanaPtr/BoxUtil" target="_blank" rel="noopener noreferrer">BoxUtil</a> 大部分内容的使用方法进行讲解，其中内容以当前对应的版本相适配，若未来该Mod进行了更新，文件内容将会视情况改动部分。</p>
<p>与 <b>JavaDoc</b> 不同，该指南着重讲解如何将BoxUtil应用到实际工程中。</p>
<p>截至目前，该指南对应的版本为 <code>1.6.3</code></p>

<h2>简介</h2>
<p>BoxUtil 将许多需要繁复的直接调用OpenGL方法、或需要编写着色器程序完成渲染任务的这些过程抽象成了各种渲染类，同时尽可能提供与开放足够的方法（包括直接的OpenGL调用）对这一过程进行控制，在尽可能保证更高可控性与便捷性的前提下提升渲染特定图形时的性能。</p>

<p>作为高可控性与性能的代价，大部分内容的并非面向完全初学者，建议Modder除了拥有一定的代码相关理解外，也同时拥有一定的几何方面知识（或线性代数）以应对随处可见的位置状态等数学运算。</p>
<p>非常建议Modder参与到对自行创建的BoxUtil各种相关渲染资源的管理之中，从而获得更好的控制和性能。</p>
<p>此外，也提供了一定的工具类用以减少实现目标功能时所需编写的代码，或相对原版更好的解决方案。</p>
<br>

<p>指南中大部分提及内容的调用较为简单，仅需基本的Java知识配合示例代码编写即可完成，极少部分内容需要 <b>OpenGL编写/调用/管理</b> 的相关知识支撑。</p>
<p>对于其中一些没有提及的方法，可以配合 <b>JavaDoc</b> (可从发布页中下载) 查阅。</p>
<p>对于Mod的源代码，前往仓库获取：<a href="https://github.com/ShioZakanaPtr/BoxUtil" target="_blank" rel="noopener noreferrer">GitHub</a></p>

<div class="note">
    <p>此外，如果有兴趣了解 OpenGL 相关的基础内容，可查阅：</p>
    <p><a href="https://www.fossic.org/thread-10051-1-1.html" target="_blank" rel="noopener noreferrer">【Modding基础】"SpriteAPI"与"Fixed Rendering Pipeline"</a></p>
    <p><a href="https://www.fossic.org/thread-10840-1-1.html" target="_blank" rel="noopener noreferrer">【Modding基础】更进一步代码绘画之路途"Shader"</a></p>
</div>

<h2>快速开始</h2>
<p>为Mod接入BoxUtil并配置完毕后，你可以在公开的内容中找到许多能简化Mod开发流程的方法，其中较为常用且简单的有：</p>
<ul>
    <li><strong><a href="#/static_trail/autogen_register">静态尾迹</a></strong>：借助内置的尾迹系统为弹丸或导弹轻松添加自定义尾迹，无需手动维护。</li>
    <li><strong><a href="#/tool/rendering_util">RenderingUtil</a></strong>：通过该工具类快速生成各种视觉特效，或通过BoxUtil引擎实现的类原版视效。</li>
    <li><strong><a href="#/tool/curve_util">CurveUtil</a></strong>：无需借助 <code>createFXDrone</code> 即可快速生成高度自定义的直线或曲线光束，也包含少量曲线几何相关方法。</li>
    <li><strong><a href="#/tool/shader_util">ShaderUtil</a></strong>：覆盖所有着色器类型的创建方法，以及特殊纹理的生成与处理。</li>
    <li><strong><a href="#/example/rendering_text">文本渲染</a></strong>：通过位图字体在任何位置显示样式丰富的文本消息。</li>
</ul>
<p>关于具体如何接入，可参考<a href="#/intro/install">代码配置</a>一节。</p>
<hr>

<div class="page__version">by: ShioZakana</div>
<div class="page__version">BoxUtil 1.6.3</div>
<div class="page__version">2026 / 09 / 32</div>
`;export{t as default};