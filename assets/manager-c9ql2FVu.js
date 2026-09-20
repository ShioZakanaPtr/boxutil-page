var e=`
<p>你可以在 <code>org.boxutil.manager</code> 下找到这些资源管理类：</p>
<ul>
    <li><strong><code>CombatRenderingManager</code></strong>：绝大多数情况下需要使用的管理类，添加渲染类，渲染插件，自定义尾迹，后台线程插件等都需要用到。</li>
    <li><strong><code>CampaignRenderingManager</code></strong>：同 <code>CombatRenderingManager</code> 的作用，但是用于管理生涯大地图中的资源。</li>
    <li><strong><code>ShaderCore</code></strong>：存放BoxUtil运行时所需的各种OpenGL资源。</li>
    <li><strong><code>EntityShadingDataManager</code></strong>：存放光影包工作时所用到的资源，用于定义各种对象的默认材质等。</li>
    <li><strong><code>StaticTrailManager</code></strong>：存放内置的尾迹系统生成所需相关资源，以及加载与注册新的自动生成尾迹类型。</li>
    <li><strong><code>FontDataManager</code></strong>：存放字体信息，避免在使用文本渲染时重复读取本地文件。</li>
    <li><strong><code>ModelManager</code></strong>：存放OBJ模型信息，主要供 <code>CommonEntity</code> 使用。</li>
    <li><strong><code>TextureManager</code></strong>：存放OpenGL纹理对象，正常情况下，其他资源管理类在需要从本地加载贴图文件时，都会缓存一份至该管理类中。</li>
    <li><strong><code>InstanceDataMemoryPool</code></strong>：实例化渲染相关，用于直接在对应内存池申请或释放内存空间。</li>
    <li><strong><code>KernelCore</code></strong>：OpenCL相关资源，只存放了OpenCL上下文与所需的基础资源。</li>
</ul>
<p>一般情况下使用BoxUtil时，无论是粒子生成，模型渲染，尾迹生成，还是文本显示，绝大部分业务都或多或少会使用到资源管理类。</p>
<p>当需要完成某项业务时，不妨先在这些管理类中寻找是否有能够用得上的方法，以免重复工作。</p>
`;export{e as default};