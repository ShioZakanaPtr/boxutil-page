var e=`
<figure class="doc-figure">
    <img src="/boxutil-page/assets/TextField-Cr3ismrq.png" width="415" height="49" loading="lazy" decoding="async" alt="TextField"/>
    <figcaption>游戏中预览</figcaption>
</figure>
<p>更好的位图字体显示方案，支持多种文本样式，一次绘制最高可以同时使用4种字体，并且拥有较好的静态文本绘制性能。</p>
<p>在内部，使用了两套定制的查询容器用于烘焙文本内容，每个字符自身占用内存极小的同时，处理字符间kerning的开销同样极低。</p>
<p>支持直接在文本内容中使用 换行符<code>\\n</code> 与 制表符<code>\\t</code>，若字体本身没有特殊设定，制表符的长度默认为 <b>4</b> 个空格。</p>
<div class="note">
    <p>若目标设备不支持高版本OpenGL功能，可以使用 <code>org.boxutil.units.standard.misc</code> 路径下的 <code>TextFieldObject</code> 作为备选方案。</p>
    <p><code>TextFieldObject</code> 所支持的文本样式较少，且只支持使用1种字体，但至少能够确保任何设备都能使用。</p>
</div>

<h2>FontMapData</h2>
<p>为了显示文本，<code>FontMapData</code> 记录了加载的位图字体信息。</p>
<p>通常来说可以使用字体的路径如 <code>graphics/fonts/FiraCodeModified/Fira_Code_Regular_20.fnt</code> 进行创建，但更推荐的做法是，通过字体管理器 <code>TextureManager</code> 获取：</p>
<!-- code: java -->
final var font = FontDataManager.tryFont("graphics/fonts/FiraCodeModified/Fira_Code_Regular_20.fnt");
<!-- /code -->
<p>字体管理器会尝试加载并缓存该字体到内部的Map中，以便后续使用直接获取缓存的字体数据，也避免了创建大量重复对象。</p>
<br>
<p>对于任何位图字体，其纹理仅支持使用一个，字体不能拥有多个纹理page。</p>
<p>字体类创建时，会自动填充一个保留字符，如果没有定义 制表符<code>\\t</code> 或 空格字符 也会一并自动生成，此时 空格字符 会使用字体 <code>size</code> 属性的<b>一半</b>作为其 <code>xAdvance</code> 以实现空格功能。</p>

`;export{e as default};