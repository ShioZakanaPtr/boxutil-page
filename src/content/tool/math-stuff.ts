export default `
<p>为了满足图形业务中频繁使用到的各种计算与矩阵构建需求，目前BoxUtil提供了一些相关工具：</p>
<ul>
    <li><strong><code>CalculateUtil</code></strong>：现成的各式数学方法，包括从着色器移植的函数，基础的几何相关方法，以及某些更快的实现。</li>
    <li><strong><code>TransformUtil</code></strong>：MVP矩阵相关，图形业务中不可或缺的一部分。</li>
    <li><strong><code>TrigUtil</code></strong>：主要为基于平方关系的三角函数求值，或复合三角函数求值，通过一定误差换取略快于直接使用对应函数的性能。</li>
</ul>

`
