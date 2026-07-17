---
change_id: F4-CHG-012
date: 2026-07-17
stage: H-planning
affected_state:
  - lesson_dictation
  - review_dictation
  - handwriting_word_game
  - rescue_word_input
production_behavior_change: planned
decision_owner: 爸爸
---

# 产出型练习统一使用英文文本答案

2026-07-17 爸爸裁决：描红的价值是书写动作本身，因此 Canvas 保留真实笔迹但不判分；默写、手写复习、手写单词游戏和救援补写的价值是回忆并拼出英文，因此统一判断最终英文文本，不区分文本来自屏幕键盘还是 iPad 系统/第三方手写输入法。

## 产品边界

- `trace`：Canvas + Pointer Events；不识别、不判分，可保留笔迹用于当屏反馈或未来图鉴。
- `dictation / review / word game / rescue`：标准英文文本输入框；系统输入法完成手写到文本的转换，应用不接触笔划。
- 输入框关闭浏览器级自动纠错、拼写检查、自动完成和自动大写，尽量避免系统替孩子修正答案。
- 判断前只清理首尾空白、规范 Unicode 并忽略英文大小写；内部空格、撇号和连字符按词库答案保留。
- 答错使用温和反馈和重试/队尾重考，不以 OCR 置信度或字形质量评价孩子。

## 工程影响

- 不接 MyScript Cloud、Google ML Kit 或自建手写 OCR。
- 不需要识别引擎密钥、语言模型下载、笔迹上传或原生 iOS 包装。
- PWA 只监听标准输入事件，因此 Apple Scribble、第三方手写键盘和普通按键输入走同一事件与判分路径。
- H-2 视觉候选不受影响；该裁决从 H-5 默写卡及后续产出型页面开始体现在逐屏候选中。
