var e=`
<p>部分渲染类会实现该接口，表明其能够通过填充实例化数据，以极高的性能一次性绘制数以万计的物体。</p>

<h2>实例类型与内存池</h2>
<p>BoxUtil中一共有四种实例数据类型，为枚举类 <code>InstanceType</code> 的值：</p>
<ul>
    <li><strong><code>DYNAMIC_2D</code></strong>：适用于2D平面的动态实例数据，设定完相关属性后，由引擎每帧更新与维护。</li>
    <li><strong><code>FIXED_2D</code></strong>：适用于2D平面的静态实例数据，由开发者自行维护属性，渲染时由引擎根据当前数据组装各种状态。</li>
    <li><strong><code>DYNAMIC_3D</code></strong>：适用于3D空间的动态实例数据，设定完相关属性后，由引擎每帧更新与维护。</li>
    <li><strong><code>FIXED_3D</code></strong>：适用于3D空间的静态实例数据，由开发者自行维护属性，渲染时由引擎根据当前数据组装各种状态。</li>
</ul>
<p>而容纳实例数据的载体为 <code>Instance2Data</code> 与 <code>Instance3Data</code>，两者皆实现了 <code>InstanceDataAPI</code> 接口类，以便引擎内部统一管理。</p>
<p>在实例数据中，无论是动态还是静态数据，都可以设置以下状态：</p>
<ul>
    <li><strong>位置(Location)</strong></li>
    <li><strong>朝向(Facing/Rotate)</strong></li>
    <li><strong>尺寸缩放(Scale)</strong></li>
    <li><strong>基础颜色(Color)</strong></li>
    <li><strong>自发光颜色(Emissive color)</strong></li>
</ul>
<p>对于动态数据，额外起效的状态有：</p>
<ul>
    <li><strong>速度(Velocity)</strong></li>
    <li><strong>转速(Turn rate/Rotate rate)</strong></li>
    <li><strong>缩放率(Scale rate)</strong></li>
    <li><strong>基础颜色混合(Low color + High color)</strong></li>
    <li><strong>基础自发光颜色混合(Low emissive color + High emissive color)</strong></li>
    <li><strong>生命周期(<code>setTimer</code>)</strong></li>
</ul>
<p>动态数据的总体透明度由生命周期各阶段决定，并根据生命周期进度，从Low颜色混合至High颜色。</p>
<p>静态数据由于不存在生命周期，其透明度与所处阶段可通过 <code>setFixedInstanceAlpha</code> 设定，并可使用 <code>copyFixedInstanceAlphaState</code> 直接复制已有透明度状态。</p>
<br>

<p>对于每种实例数据类型，都分别拥有一个<b>GPU内存池</b>，用于统一管理上传后引擎实际使用的数据。</p>
<p>从内存池申请一定数量的实例数据空间后，会得到 <code>MemoryBlock</code> 对象，用于记录与查询这些实例数据在对应的GPU缓冲对象中的<b>地址</b>与<b>大小</b>，以及在内存池中记录的引用数，与对应的类型。</p>
<p>你可以借助 <code>InstanceDataMemoryPool</code> 资源管理类来操作目标内存区域。</p>

<h2>渲染类的接口</h2>
<p>准备好实例数据后，你需要通过该接口的方法将实例数据赋予渲染类，以及进行提交与配置所需的渲染数量：</p>
<table>
    <thead>
        <tr><th>方法</th><th>说明</th></tr>
    </thead>
    <tbody>
        <tr><td><code>setInstanceData</code></td><td>直接使用给定的填充好实例数据的列表容器</td></tr>
        <tr><td><code>addInstanceData</code></td><td>为渲染类逐个增加实例数据</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setInstanceDataRefreshIndex</code></td><td>设置从列表的哪个对象索引开始上传数据</td></tr>
        <tr><td><code>setInstanceDataRefreshOffset</code></td><td>上传到目标内存区域的数据对象偏移量，一般情况下与 <code>setInstanceDataRefreshIndex</code> 保持一致即可</td></tr>
        <tr><td><code>setInstanceDataRefreshSize</code></td><td>设置上传数据时，从设定的列表索引开始，需要上传数据对象的数量</td></tr>
        <tr><td><code>setInstanceDataRefreshAllFromCurrentIndex</code></td><td>设置上传数据时，从设定的列表索引开始，上传直至列表末尾所有的数据对象</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setMappingInstanceSubmit</code></td><td>使用客户端内存映射的方式上传数据，适用于需要一次性上传大量数据的场合；若设备支持OpenGL客户端持久化映射特性，则该设置不会发挥作用。</td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>mallocInstance</code></td><td>为渲染类从目标类型的实例对象内存池申请一块内存空间，为了避免后续需求再次分配或扩展内存区域，建议预先申请足够的大小</td></tr>
        <tr><td><code>submitInstance</code></td><td>提交并上传当前设定范围的实例对象数据，在此之前，必须先调用 <code>mallocInstance</code> 以分配足够的空间</td></tr>
        <tr><td><code>resetMemory</code></td><td>特殊的实例数据内存设定方法，效果可参考C++11之后的智能指针 <code>reset</code> 函数</td></tr>
        <tr><td><code>setSharedInstanceData</code></td><td>从目标渲染类共享同一实例数据内存空间，目标渲染类若没有有效内存空间则操作无效</td></tr>
        <tr><td><code>getInstanceDataMemory</code></td><td>通过该方法获取当前渲染类分配到的内存空间，可能返回 <code>null</code></td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>callRefreshInstanceData</code></td><td>通知引擎维护一次已上传的实例化数据，以正常反映设定的速度和生命周期等属性，只对动态实例数据起效</td></tr>
        <tr><td><code>setAlwaysRefreshInstanceData</code></td><td>开启后，等同于每次计算前自动调用 <code>callRefreshInstanceData</code></td></tr>
        <tr><td style="border-right: 0"></td><td></td></tr>
        <tr><td><code>setRenderingOffset</code></td><td>设置渲染时，从列表的哪个对象索引开始使用数据</td></tr>
        <tr><td><code>setRenderingCount</code></td><td>设置渲染时，从设定的列表索引开始，一共需要渲染的数据对象数量</td></tr>
        <tr><td><code>setRenderingAllInstanceFromCurrentOffset</code></td><td>设置上传数据时，从设定的列表索引开始，渲染直至列表末尾所有的数据对象</td></tr>
        <tr><td><code>setInstanceTimerOverride</code></td><td>为所有渲染的实例数据对象强制使用指定的生命周期状态</td></tr>
        <tr><td><code>copyInstanceTimerOverride</code></td><td>复制目标实例化渲染类的生命周期状态</td></tr>
    </tbody>
</table>
`;export{e as default};