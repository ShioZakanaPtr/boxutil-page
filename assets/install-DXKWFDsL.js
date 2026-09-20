var e=`
<p>在你的Mod项目中使用BoxUtil前，第一件事是配置你的<code>mod_info.json</code>：</p>
<!-- code: json -->
"dependencies":[
    {"id":"BoxUtil", "name":"BoxUtil"}
],
<!-- /code -->
<p>如果你只是需要在Combat或Campaign的每帧场景中，借助BoxUtil以生成粒子或只是使用部分工具，则配置至此完成。</p>
<p>否则，若需要借助BoxUtil加载你的OpenGL资源，或者于内置的尾迹系统注册你Mod中独特的尾迹等，则按照下文继续操作。</p>

<h2>初始化的调用</h2>
<p>目前，BoxUtil自身资源的初始化分为两部分：</p>
<ul>
    <li><strong><code>BoxUtilModPlugin.initPre()</code></strong>：载入BoxUtil运行所需的基础资源，包括但不限于OpenGL状态与其函数的Wrapper，配置文件游戏状态，各种托管的渲染所需数据等。</li>
    <li><strong><code>BoxUtilModPlugin.initLater()</code></strong>：初始化实际的OpenGL对象，各模块与后台线程的初始化，检查配置可用性等。</li>
</ul>
<br>

<p>首先，于你的Mod的ModPlugin中：</p>
<!-- code: java -->
public final class YourModPlugin extends BaseModPlugin {
    public void onApplicationLoad() {
        BoxUtilModPlugin.initPre();
    }
}
<!-- /code -->

<p>调用 <code>initPre</code> 是线程安全的，且通过内部检查防止多次调用，所以无需担心多个Mod情况下的重复初始化行为，对于 <code>initLater</code> 同理。</p>
<p>如果需要加载或注册静态尾迹的资源，加载OBJ模型，或者光影包资源，只需在调用 <code>initPre</code> 后，于同一个方法体中按需执行即可：</p>
<!-- code: java -->
public final class YourModPlugin extends BaseModPlugin {
    public void onApplicationLoad() {
        BoxUtilModPlugin.initPre();
        
        // the "ABCD" is your mod's prefix
        ModelManager.loadModelDataCSV("data/config/modFiles/ABCD_obj_data.csv");
        EntityShadingDataManager.loadTextureData("data/config/modFiles/ABCD_texture_data.csv");
        EntityShadingDataManager.loadIlluminantData("data/config/modFiles/ABCD_illuminant_data.csv");
        StaticTrailManager.loadTrailData("data/config/modFiles/ABCD_trail_data.csv");
    }
}
<!-- /code -->
<br>

<p>在此之上，如果还需要获知BoxUtil其他功能的状态，或者使用 <code>ShaderCore</code> 或 <code>KernelCore</code> 的内容，则需要在调用 <code>initPre</code> 之后，
于你的Mod首个 <code>BaseEveryFrameCombatPlugin</code> 或 <code>BaseCombatLayeredRenderingPlugin</code> 实现类中，在靠前的位置（于你的业务前）执行：</p>
<!-- code: java -->
// in this example, call init at BaseEveryFrameCombatPlugin
public final class YourEveryFrameCombatPlugin extends BaseEveryFrameCombatPlugin {
    public void init(CombatEntityAPI entity) {
        BoxUtilModPlugin.initLater();
        // do something
    }
}
<!-- /code -->
<p>承担这个任务的实现类，通常是你的Mod中于 <code>settings.json</code> 注册的那一个实现类。</p>

<h2>Java库</h2>
<p>查看BoxUtil的Mod文件夹时，你可以在 <code>jars</code> 子文件夹下找到：</p>
<ul>
    <li><strong><code>BoxUtilMod.jar</code></strong>：开放给开发者使用的接口约定，对象，工具类等。</li>
    <li><strong><code>backends/BoxUtilImpl.jar</code></strong>：BoxUtil引擎底层相关内容，用以支持其在游戏中运作。</li>
</ul>
<p>一般情况下，编写代码时，只需使用 <code>BoxUtilMod.jar</code> 中的内容即可，<code>backends/BoxUtilImpl.jar</code> 不是必要的依赖项。</p>
`;export{e as default};