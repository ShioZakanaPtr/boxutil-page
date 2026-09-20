export default `
<p>BoxUtil拥有一个内置的尾迹系统，借助 <b>GPU内存池+合批绘制+异步处理</b> 等多种技术，该系统能很好地应对大量复杂尾迹同屏的情况。</p>
<p>要为弹丸或导弹附着尾迹，你只需简单地填写表格文件即可在游戏中使用。</p>

<h2>数据表格</h2>
<p>注册所用的表格为 <code>csv</code> 文件，并遵从以下格式：</p>
<table>
    <thead>
        <tr><th>参数</th><th>类型</th><th>说明</th><th>默认值</th></tr>
    </thead>
    <tbody>
        <tr><td><code>proj_id</code> *</td><td><code>String</code></td><td>弹丸或导弹的ID</td><td>N/A</td></tr>
        <tr><td><code>trail_id</code> *</td><td><code>String</code></td><td>尾迹的ID，该ID必须是独一无二的，表示指定的投射物会使用该ID的尾迹</td><td>N/A</td></tr>
        <tr><td><code>use_existing_trail</code></td><td><code>boolean</code></td><td>是否使用已有的尾迹，会尝试查找从首行开始至当前行的已有尾迹，如果目标尾迹有效则直接复用</td><td><code>false</code></td></tr>
        <tr><td><code>is_vertical_tex</code></td><td><code>boolean</code></td><td>是否在加载 <code>diffuse</code>/<code>emissive</code> 纹理时顺时针旋转90度，以此转换为符合图形学习惯的朝向</td><td><code>false</code></td></tr>
        <tr><td><code>diffuse_path</code></td><td><code>String</code></td><td>漫反射纹理的带格式文件路径，也可以为"basecolor"纹理</td><td>无纹理</td></tr>
        <tr><td><code>normal_path</code></td><td><code>String</code></td><td>法线纹理的带格式文件路径</td><td><code>BUtil_Z</code></td></tr>
        <tr><td><code>complex_path</code></td><td><code>String</code></td><td>材质属性纹理的带格式文件路径</td><td><code>BUtil_COMPLEX_DEF</code></td></tr>
        <tr><td><code>emissive_path</code></td><td><code>String</code></td><td>自发光纹理的带格式文件路径，在Bloom后处理可用时可配合营造光晕效果</td><td>无纹理</td></tr>
        <tr><td><code>tangent_path</code></td><td><code>String</code></td><td>切线纹理的带格式文件路径</td><td><code>BUtil_X</code></td></tr>
        <tr><td><code>is_tangent_angle_map</code></td><td><code>boolean</code></td><td>表示加载的切线纹理记录的是归一化角度值，此时会将其转换为归一化向量形式的切线纹理，否则直接加载</td><td><code>true</code></td></tr>
        <tr><td><code>fade_in</code></td><td><code>float</code></td><td>尾迹从完全透明淡入的秒时间长度，且有效的总持续时间 (<code>fade_in</code> + <code>full</code> + <code>fade_out</code>) 不能低于 <code>0.1</code></td><td><code>0.1</code></td></tr>
        <tr><td><code>full</code></td><td><code>float</code></td><td>尾迹正常透明度的秒时间长度</td><td><code>0.4</code></td></tr>
        <tr><td><code>fade_out</code></td><td><code>float</code></td><td>尾迹淡出至完全透明的秒时间长度</td><td><code>1.5</code></td></tr>
        <tr><td><code>size_in</code></td><td><code>float</code></td><td>尾迹头部的宽度</td><td><code>16</code></td></tr>
        <tr><td><code>size_out</code></td><td><code>float</code></td><td>尾迹尾部的宽度</td><td><code>8</code></td></tr>
        <tr><td><code>smooth_ends</code></td><td><code>float</code></td><td>尾迹两端淡出至完全透明的比率，取值范围 <code>[0.0, 1.0]</code>，为 <code>0</code> 时关闭</td><td><code>1</code></td></tr>
        <tr><td><code>color_in</code></td><td><code>vec4u8</code></td><td>尾迹头部的RGBA颜色</td><td><code>null</code> / <code>[255,255,255,255]</code></td></tr>
        <tr><td><code>color_out</code></td><td><code>vec4u8</code></td><td>尾迹尾部的RGBA颜色</td><td><code>null</code> / <code>[255,255,255,255]</code></td></tr>
        <tr><td><code>glow_power</code></td><td><code>float</code></td><td>尾迹自发光层表现的Bloom后处理效果强度，取值范围 <code>[0.0, 1.0]</code>，为 <code>0</code> 时关闭</td><td><code>1</code></td></tr>
        <tr><td><code>tex_pixels</code></td><td><code>float</code></td><td>尾迹纹理的长度，应当为正数</td><td><code>256</code></td></tr>
        <tr><td><code>tex_speed</code></td><td><code>float</code></td><td>尾迹纹理沿尾迹方向的滚动速度，为正数时通常表现为朝着头部滚动</td><td><code>-256</code></td></tr>
        <tr><td><code>random_start_uv</code></td><td><code>boolean</code></td><td>应用随机偏移值至纹理，使得即便是相同时间生成的尾迹，其纹理起点也不同</td><td><code>true</code></td></tr>
        <tr><td><code>velocity_in_range</code></td><td><code>vec4f</code></td><td>尾迹头部的偏移率范围，基于其朝向，格式为 <code>[minX, minY, maxX, maxY]</code></td><td><code>null</code> / <code>[0,0,0,0]</code></td></tr>
        <tr><td><code>velocity_out_range</code></td><td><code>vec4f</code></td><td>尾迹尾部的偏移率范围，基于其朝向，格式为 <code>[minX, minY, maxX, maxY]</code></td><td><code>null</code> / <code>[0,0,0,0]</code></td></tr>
        <tr><td><code>angular_in_range</code></td><td><code>vec2f</code></td><td>尾迹头部的角动量范围，基于其朝向，格式为 <code>[min, max]</code></td><td><code>null</code> / <code>[0,0]</code></td></tr>
        <tr><td><code>angular_out_range</code></td><td><code>vec2f</code></td><td>尾迹尾部的角动量范围，基于其朝向，格式为 <code>[min, max]</code></td><td><code>null</code> / <code>[0,0]</code></td></tr>
        <tr><td><code>additive_blend</code></td><td><code>boolean</code></td><td>使用加法混合的绘制模式，也是粒子类视效的常见混合方式</td><td><code>true</code></td></tr>
        <tr><td><code>spawn_offset_range</code></td><td><code>vec4f</code></td><td>尾迹每一段生成时的偏移位置范围，基于其朝向，格式为 <code>[minX, minY, maxX, maxY]</code></td><td><code>null</code> / <code>[0,0,0,0]</code></td></tr>
        <tr><td><code>velocity_for_forward</code></td><td><code>boolean</code></td><td>优先使用投射物的 <code>velocity</code> 方向作为其朝向，对于 <code>BALLISTIC_AS_BEAM</code> 类型的投射物建议设为 <code>true</code></td><td><code>false</code></td></tr>
        <tr><td><code>render_below_explosions</code></td><td><code>boolean</code></td><td>控制尾迹渲染于原版explosion视效下方</td><td><code>false</code></td></tr>
        <tr><td><code>custom_tracker_id</code></td><td><code>String</code></td><td>根据ID使用指定的tracker控制尾迹的生成行为，需要通过 <code>StaticTrailManager.registerCustomTracker(String, BiFunction)</code> 进行注册</td><td><code>null</code> / 内置的默认tracker</td></tr>
        <tr><td><code>init_capacity</code></td><td><code>short</code></td><td>评估一般场景中会有多少个该尾迹同时存在，通过设置合适的值可以减少内存池扩容的次数</td><td><code>1024</code></td></tr>
    </tbody>
</table>
<div class="warn">
    <p>表格中除星号 <code>*</code> 标记的参数为必填项外，其余参数均可留空以使用默认值，但对于 <code>diffuse_path</code> 与 <code>emissive_path</code> 两者建议至少填写其中一个，否则将因为纹理缺失导致无法正确显示尾迹。</p>
</div>
<p>只要其路径能够被游戏找到，该表格可以存放在Mod文件夹中的任何地方，但文件命名上最好添加你的Mod的标识前缀，如命名为 <code>ABCD_trail_data.csv</code> 以避免文件恰巧处于同路径下与其他Mod发生冲突。</p>

<h2>加载数据</h2>
<p>填写完尾迹表格后，记下其文件路径，然后在ModPlugin中调用代码即可注册完毕：</p>
<!-- code: java -->
public final class YourModPlugin extends BaseModPlugin {
    public void onApplicationLoad() {
        BoxUtilModPlugin.initPre();
        
        StaticTrailManager.registerCustomTracker("ABCD_your_tracker_id", YourTrailTracker::new); // only call it if you have any custom tracker
        StaticTrailManager.loadTrailData("data/config/modFiles/ABCD_trail_data.csv");
    }
}
<!-- /code -->
<p>对于自定义tracker的编写，将于<a href="#/static_trail/custom_trail">自定义尾迹</a>一节讲解。</p>

<br>
<p>此外，也同时支持使用MagicLib格式的表格文件：</p>
<!-- code: java -->
public final class YourModPlugin extends BaseModPlugin {
    public void onApplicationLoad() {
        BoxUtilModPlugin.initPre();
        
        StaticTrailManager.loadMagicLibLayoutTrailData("data/config/modFiles/ABCD_trail_data.csv");
    }
}
<!-- /code -->
<div class="warn">
    <p>由于BoxUtil使用了截然不同的尾迹实现方案，对于使用MagicLib格式加载的尾迹，对比原本在实际视觉上会存在不小的差异。</p>
</div>

<h2>直接注册</h2>
<p>除了填写表格外，也可以仅编写Java代码完成所有尾迹的配置：</p>
<!-- code: java -->
public final class YourModPlugin extends BaseModPlugin {
    public void onApplicationLoad() {
        BoxUtilModPlugin.initPre();
        
        StaticTrailData yourTrailData = new YourTrailData();
        StaticTrailManager.registerTrail("ABCD_your_proj_id", yourTrailData);
    }
}
<!-- /code -->
<p>使用该方式注册可以避免本地文件的读取与冲突问题，并允许你在不同Mod环境下更灵活地处理尾迹加载。</p>
`
