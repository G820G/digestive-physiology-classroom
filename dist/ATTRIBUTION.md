# 消化与吸收交互课堂 · 素材署名

## 三维解剖模型

BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution 4.0 International.

- 数据集：BodyParts3D 4.0，成人男性参考解剖。
- 官方数据：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- 官方许可：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- 许可条款：https://creativecommons.org/licenses/by/4.0/
- 论文：Mitsuhashi et al. (2009), BodyParts3D: 3D structure database for anatomical concepts. https://doi.org/10.1093/nar/gkn613

本网站使用的几何资源来自 https://github.com/ashemag/human-atlas ，提取版本：`1c38bf35c254a891200d3cedecfd57abebe83d8d`。

上游已将坐标及单位转换为米制 Y-up，并通过 meshoptimizer 简化几何（每个结构相对误差上限 0.2%），将法线量化为 Int16。本网站进一步筛选了 121 个原始网格（120 个结构网格和 1 个人体外形网格，含甲状软骨、会厌、环状软骨、左右杓状软骨、左右声韧带及气管），保留原始源 ID，重新打包为独立二进制文件；调整了配色、透明度、显示分组及显示范围，气管裁切为邻近喉部的一小段。吞咽模式通过副本的位移和会厌旋转制作简化教学动画；补充的喉入口轮廓、腔道和关闭面为本项目创建的教学示意。提取后的模型保留 CC BY 4.0 许可。上游完整署名见同目录的 UPSTREAM-ATTRIBUTION.md。

本项目重新编写了用于中文消化生理教学的界面、教学内容与交互。上游 Human Atlas 应用代码依据 MIT 许可发布；其许可文本随项目保存在 LICENSE-UPSTREAM。

## 教学内容

参考：OpenStax, Anatomy and Physiology 2e, Chapter 23, The Digestive System。

https://openstax.org/books/anatomy-and-physiology-2e/pages/23-introduction

页面说明为重新撰写的中文教学摘要。食物路径与吸收图为简化教学示意，并非精确的腔内轨迹或按比例的组织切片。三维素材未完整表示咽、肛管及全部胆道结构；标题覆盖相应教学过程，不意味着每一个结构都有独立网格。生理范围与进食状态、部位和个体有关。此页面用于教学。

吞咽过程已刻意放慢，运动、食团和气流为功能示意；不模拟完整的软组织变形、喉部肌肉活动或食团两侧分流。会厌翻转、喉上提、喉前庭及声门关闭和吞咽性呼吸暂停共同保护气道。

## 第三方软件

- Three.js — MIT，https://github.com/mrdoob/three.js
- Lucide — ISC，https://github.com/lucide-icons/lucide
- Vite — MIT，https://github.com/vitejs/vite

发布及转发模型时，请保留本署名文件与模型许可信息。
