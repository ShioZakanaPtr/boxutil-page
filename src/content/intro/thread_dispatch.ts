import thread_flow from '../../assets/BUtil_ThreadFlow.png'

export default `
<p>BoxUtil 拥有多个后台线程，用于异步维护各种数据和状态以减轻主线程负担：</p>

<figure class="doc-figure">
    <img src="${thread_flow}" width="1501" height="1052" loading="lazy" decoding="async" alt="BUtil_ThreadFlow"/>
    <figcaption>线程执行的流程示意图</figcaption>
</figure>

<p>目前，所有线程皆使用JDK自带的 <code>Phaser</code> 进行CPU端执行的同步。</p>
<p>接着，如果对应线程的OpenGL共享上下文可用，且设备支持的情况下，每帧执行的最后阶段还会调用 <code>glMemoryBarrier</code> + <code>glFlush</code>进行GPU上OpenGL操作的同步。</p>
<p>对于这些线程：</p>
<ul>
    <li><strong>Vanilla</strong>：顾名思义，游戏原版线程，在Windows下通常为<code>Thread-2</code>，Linux下通常为<code>Thread-3</code>。</li>
    <li><strong>Rendering</strong>：于游戏原版 layered rendering 进行同步，通常用于异步绘制操作。</li>
    <li><strong>Logic</strong>：用于维护各种渲染数据，包括但不限于 实例化粒子的维护/静态尾迹的创建与维护/渲染类的每帧逻辑 等非直接绘制操作。</li>
    <li><strong>Aux-Logic</strong>：同Logic线程，除了额外分担压力外也用于执行某些线程间准备工作。</li>
</ul>

<h2>自定义后台插件</h2>

<p>在后台线程中，除了内置的执行阶段外，也允许Modder以类似原版的每帧插件的形式自行添加异步业务。</p>
<p>可以使用 <code>BackgroundEveryFramePlugin</code> 来创建一个后台插件，一个在Combat场景中运作的插件示例如下：</p>
<!-- code: java -->
public final class YourBackgroundPlugin implements BackgroundEveryFramePlugin {
    private boolean isExpried = false;

    public boolean isAdvanceExpired() {
        return this.isExpried;
    }
    
    public void runBeginAdvance(float amount, boolean isPaused) {
        // do something
        // ...
        // again, but check it should be shutdown now
        this.isExpried = true;
    }
}
<!-- /code -->

<p>随后在合适的时机将其添加，注意，因为要执行插件的 <code>runBeginAdvance</code> ，所以调用的应当是 <code>addBackgroundLogicalPlugin</code>：</p>
<!-- code: java -->
CombatRenderingManager.addBackgroundLogicalPlugin(new MyBackgroundPlugin());
<!-- /code -->
<div class="warn">
    <p>如果本该运行Logic业务的插件，错误地通过 <code>addBackgroundRenderingPlugin</code> 添加则不会有任何效果，并且由于插件永不过时，会导致永久占用着这部分内存。</p>
    <p>同时，由于游戏原版绝大部分业务都只考虑了单线程运行，你应该在编写代码时着重注意线程安全问题。</p>
</div>

<h2>与内置线程同步</h2>

<p>如果你的Mod中也创建了自己的线程，并且需要与BoxUtil的后台线程同步，或是直接使用现有的屏障点，你可以在 <code>BoxThreadSync</code> 中找到所需要的 <code>Phaser</code>。</p>
<p>或者，在其他线程中有不得不在游戏原版主线程上执行的GL函数调用，也可以在 <code>BoxThreadSync</code> 中找到相应的方法，将指令打包排队到相关阶段延迟执行：</p>
<!-- code: java -->
BoxThreadSync.Logical.offerBeginAdvanceDelayGLCmd(() -> {
    // some GL funs
}, false); // add to combat scene
<!-- /code -->
`
