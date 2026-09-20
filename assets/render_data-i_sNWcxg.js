var e=`
<p><code>RenderDataAPI</code> 定义了所有渲染类都至少拥有的一些属性，包括但不限于模型矩阵，混合模式，生命周期，渲染层级。</p>
<p>某些渲染类的实现因为其性质，不需要设置部分属性，此时对应方法会在渲染类中标记为 <code>@Deprecated</code> 作为提醒。</p>
<p>渲染类的配置类似状态机，且部分渲染类包含独有的提交(submit)方法，用于预计算一部分复杂的渲染用数据，避免在数据不需要改变时产生不必要的开销。</p>

<h2>基础配置</h2>
<p>创建一个渲染类后，通常会使用如下方法设定基础的状态信息等：</p>
<table>
    <thead>
        <tr><th>方法</th><th>说明</th></tr>
    </thead>
    <tbody>
        <tr><td><code>setGlobalTimer</code></td><td>用于设定渲染类的生命周期</td></tr>
        <tr><td><code>setTimingWhenPaused</code></td><td>控制游戏暂停时是否仍然推进计时</td></tr>
        <tr><td><code>setTimerPaused</code></td><td>控制是否暂停计时器的运作</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setLocation</code></td><td>设定渲染类的渲染位置</td></tr>
        <tr><td><code>setStateVanilla</code></td><td>设定渲染类平面上的渲染位置，方向与缩放尺寸</td></tr>
        <tr><td><code>appendToEntity</code></td><td>根据传入的原版实体设定该渲染类的位置，方向与缩放尺寸</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>getModelMatrix</code></td><td>获取当前的模型矩阵</td></tr>
        <tr><td><code>setModelMatrix</code></td><td>直接将其模型矩阵设定为传入的矩阵</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setBlendFunc</code></td><td>设定渲染类的混合方式，默认情况下为 <code>setNormalBlend</code> 的效果</td></tr>
        <tr><td><code>setBlendFuncSeparate</code></td><td>设定渲染类的混合方式，但分别对RGB与Alpha通道单独设定</td></tr>
        <tr><td><code>setBlendEquation</code></td><td>设定渲染类混合函数的结算方式</td></tr>
        <tr><td><code>setAdditiveBlend</code></td><td>将渲染类的混合方式设为加法混合，原版大部分粒子效果都是用该种混合方式</td></tr>
        <tr><td><code>setNormalBlend</code></td><td>将渲染类的混合方式设为普通的按照透明度混合，类似原版中舰船，导弹等物体的混合方式</td></tr>
        <tr><td><code>setNegativeBlend</code></td><td>将渲染类的混合方式设为特殊的减法混合，类似原版<code>CombatEngineAPI</code>中Negative系列的粒子所使用的混合方式</td></tr>
        <tr><td><code>setDisableBlend</code></td><td>关闭渲染类在绘制时的混合，会导致直接替换画面原有内容</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setLayer</code></td><td>渲染层级的设定，按需求传入 <code>CombatEngineLayers</code> 或 <code>CampaignEngineLayers</code> 的枚举</td></tr>
    </tbody>
</table>

<p>默认情况下，对大部分渲染类状态的修改可以认为是立即可见的，代价则为每帧渲染时，引擎会为每一个渲染类不断重复地组装数据。</p>
<p>为了避免不必要的开销，在确认后续没有调整需求后，可以通过以下方法将相关数据提前准备完毕并缓存，供引擎在渲染时直接获取使用：</p>
<table>
    <thead>
        <tr><th>方法</th><th>说明</th></tr>
    </thead>
    <tbody>
        <tr><td><code>setAutoSubmitEntityData</code></td><td>是否在每帧绘制时组装渲染类属性数据</td></tr>
        <tr><td><code>submitEntityData</code></td><td>提交一次渲染类属性数据</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setAutoSubmitPrimeMatrix</code></td><td>是否在每帧绘制时组装渲染类主矩阵</td></tr>
        <tr><td><code>submitPrimeMatrix</code></td><td>提交一次渲染类主矩阵</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setAutoSubmitModelMatrix</code></td><td>是否在每帧绘制时组装渲染类模型矩阵</td></tr>
        <tr><td><code>submitModelMatrix</code></td><td>提交一次渲染类模型矩阵</td></tr>
    </tbody>
</table>

<h2>ControlDataAPI</h2>
<p>对于渲染类，其拥有一些独特方法，用于实现对每一个实例对象做出行为各异的精细控制：</p>
<table>
    <thead>
        <tr><th>方法</th><th>说明</th></tr>
    </thead>
    <tbody>
        <tr><td><code>setControlData</code></td><td>设定这个渲染类的自定义控制插件</td></tr>
        <tr><td><code>getCustomData</code></td><td>获取这个渲染类的自定义数据，常用于配合 <code>ControlDataAPI</code> 使用，一个渲染类在创建后，其默认的自定义数据为 <code>null</code>；由于内部保存为Object类型，所以使用时你需要为其进行动态类型转换</td></tr>
        <tr><td><code>setCustomData</code></td><td>设置这个渲染类的自定义数据，常用于配合 <code>ControlDataAPI</code> 使用</td></tr>
    </tbody>
</table>

<p><code>ControlDataAPI</code> 是一种专门使用在渲染类上的每帧插件，并且部分方法会托管至后台线程异步执行：</p>
<figure class="doc-figure">
    <img src="/boxutil-page/assets/BUtil_ControlDataFlow-49foDzDl.png" width="921" height="861" loading="lazy" decoding="async" alt="BUtil_ControlDataFlow"/>
    <figcaption><code>ControlDataAPI</code> 执行示意图</figcaption>
</figure>
<p>通过使用 <code>ControlDataAPI</code> 来控制渲染类，你可以避免创建过多的 <code>BaseEveryFrameCombatPlugin</code> 等原版每帧插件导致主线程任务加重，并将渲染类自身业务与原版逻辑隔离。</p>
`;export{e as default};