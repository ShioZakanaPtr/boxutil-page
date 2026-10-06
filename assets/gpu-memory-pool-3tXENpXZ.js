var e=`
<p>为了应对引擎内置的尾迹系统与实例化渲染等业务中复杂的内存管理，BoxUtil提供了一个专门用于管理OpenGL缓冲对象的GPU内存池。</p>
<p>通过内存池，你可以很轻松的追踪与管理缓冲对象中各个区域的使用情况。</p>
<p>内存池被设计为同一时间下，只有一个线程能申请或释放内存空间，以此确保线程安全；且为了确保后续OpenGL资源安全使用，部分方法包含 <code>glFinish</code> 调用的强同步。</p>
<p>同时，内存池内部以有序列表的方式管理所有已申请或空闲的内存块，你可以很轻松地按地址顺序遍历所有块，或直接通过内部索引访问。</p>

<h2>内存池的组成</h2>
<p>使用BoxUtil的GPU内存池时，你需要关注这三个类：</p>
<ul>
    <li><strong><code>GPUMemoryPool</code></strong>：内存池本身，内存的申请与释放等操作都在其中。</li>
    <li><strong><code>InternalMemory</code></strong>：内存池类的内部类，是你最终拿到的内存空间对象。</li>
    <li><strong><code>GPUPoolBehavior</code></strong>：内存池行为定义类，帮助你控制内存池进行每个操作时需要做什么。</li>
</ul>
<p>内存池自身暴露了两个锁，用于供外部调用：</p>
<ul>
    <li><strong><code>getClientLock</code></strong>：维护客户端内容时使用到的锁，设计上需要足够轻量。</li>
    <li><strong><code>getGPULock</code></strong>：读写锁中的读锁，允许多个读操作，但仅限单个线程进行写操作，写锁提供给线程池内部扩容与移动显存内容使用。</li>
</ul>
<br>
<p>由于操作的复杂度，尽可能避免使用 <code>realloc</code> 为单块内存空间扩容，且非必要时降低 <code>compact</code> 的调用频率。</p>
`;export{e as default};