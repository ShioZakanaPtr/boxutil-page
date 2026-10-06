export default `
<p>BoxUtil拥有一个简化了着色器程序初始化与uniform使用的封装类 <code>ShaderProgram</code>。</p>
<p>除了通过链式调用让初始化过程变得更易维护，其内部还使用了定制的哈希容器保存uniform位置，借此提升些许查询速度，并直接获得原始类型的位置值以免去拆箱开销。</p>
<p>如果能够记清初始化时的索引且有能力维护，使用索引直接访问对应的数组对象绝对是更推荐的选择。</p>
<p>一个简单的使用例子：</p>
<!-- code: java -->
// program init
final String vertSrc, fragSrc;
final var program = new ShaderProgram("YourShaderProgramTag-TheCommonDraw", vertSrc, fragSrc);
if (program.isValid()) {
    program.initUniformSize(2)
            .beginUniform()
            .loadUniformIndex("u_uniformNameA")
            .loadUniformIndex("u_uniformNameB");
}

// when running
GL20.glUniform1i(program.uniform("u_uniformNameA"), 127); // from map
// or
GL20.glUniform1i(program.location[0], 127); // from directly array
<!-- /code -->
`
