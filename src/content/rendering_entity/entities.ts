import rendering_entity from '../../assets/BUtil_RenderingEntity.png'

export default `
<p>在BoxUtil中，主要借助 <code>org.boxutil.units.standard.entity</code> 下的一系列渲染类实现各种常见的视觉效果。</p>
<p>一般情况下，只需创建所需渲染类，接着为实例对象配置各种数据，最后将其加入渲染管理类即可实现需求，在渲染类运作期间，其生命周期由引擎管理，故无需过多留意资源释放问题。</p>

<h2>类结构</h2>
<p>对于所有能够纳入引擎管理的渲染类，皆以 <code>RenderDataAPI</code> 接口类为基础，配合其他接口组成一种专门用途的渲染类：</p>
<figure class="doc-figure">
    <img src="${rendering_entity}" width="1502" height="901" loading="lazy" decoding="async" alt="BUtil_RenderingEntity"/>
    <figcaption>各种渲染类与接口的关系图</figcaption>
</figure>
<p>一般情况下，所有渲染类都可同时在Combat与Campaign场景下使用，在设定完属性后只需通过管理类添加即可：</p>
<!-- code: java -->
final RenderDataAPI yourEntity = new SpriteEntity();
// do some settings

CombatRenderingManager.addEntity(yourEntity); // add to combat
// or
CampaignRenderingManager.addEntity(yourEntity); // add to campaign
<!-- /code -->

`
