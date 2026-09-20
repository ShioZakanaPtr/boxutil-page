export default `
<p>除了为弹丸或导弹附加尾迹外，BoxUtil的尾迹系统也允许你将尾迹生成至任何地方。</p>
<p>对比通过注册，托管至系统自动生成的尾迹，完全自定义生成的尾迹在运行性能上没有过多差异，更多取决于你所编写的tracker如何运作。</p>
<br>
<p>对于自定义尾迹，通常你只需要关注这两个类：</p>
<ul>
    <li><strong><code>StaticTrailData</code></strong>：记录了尾迹渲染所需的数据，同时也定义了一种尾迹类型。</li>
    <li><strong><code>StaticTrailTracker</code></strong>：控制每次记录循环中尾迹Node的生成，以及尾迹的自销毁。</li>
</ul>
<p>对于 <code>StaticTrailData</code> 各属性的配置可参考<a href="#/static_trail/autogen_register">静态尾迹</a>一节的内容，更多细节可参考 <b>JavaDoc</b> 配合使用。</p>

<h2>Tracker</h2>
<p>要让尾迹能够正确的出现在画面中，需要编写tracker进行控制；<code>StaticTrailTracker</code> 被设计为函数式接口以供快速编写简单的控制逻辑，也可以另行实现一个tracker类满足复杂的控制需求：</p>
<!-- code: java -->
public class YourTrailTracker implements StaticTrailTracker {
    protected final ShipAPI ship;

    // attach to ship
    public BaseProjectileTrailTracker(final ShipAPI ship) {
        this.ship = ship;
    }

    public void advance(float amount, float elapsedTime, Result callback) {
        if (callback.isExpired()) return; // directly return when trail was expired

        if (!ship.isAlive()) { // only remove the trail if ship not alive, in this example without other check
            callback.destroy();
            return;
        }

        final var currLoc = ship.getLocation();
        if (callback.isNotRecommendedRecordsCurrent(currLoc)) { // optional, for avoid too short trail segment here
            callback.pauseOnce();
            return;
        }

        callback.setCurrentLocation(currLoc); // records the location
        ship.getVelocity().normalise(callback.getCurrentFacing()); // just directly using ship's velocity as facing
    }
}
<!-- /code -->
<p>在这个示例中，编写了一个简单的附着于任意 <code>ShipAPI</code> 实体上的tracker。</p>
<p>每次tracker的 <code>advance</code> 运行代表记录了一个新的尾迹Node，配合 <code>Result</code> 中其他方法，你可以借此轻松制作出形态各异的尾迹。</p>
<div class="warn">
    <p>每一个tracker最终都会运行在后台线程上，考虑到线程安全问题，除非情况允许，否则不应该对尾迹所附着的实体或其他内容进行修改，同时也由于这个原因，同一帧中主线程上的更改不能保证第一时间在tracker执行记录时可见。</p>
</div>

<h2>添加尾迹</h2>
<p>准备好所需资源后，在合适的时机调用方法将其添加到渲染管理器即可：</p>
<!-- code: java -->
final ShipAPI targetShip;
final StaticTrailData yourTrailData = new YourTrailData();
CombatRenderingManager.addStaticTrail(
    yourTrailData,
    targetShip,
    CombatEngineLayers.ABOVE_PARTICLES_LOWER,
    new YourTrailTracker(targetShip);
);
<!-- /code -->
`
