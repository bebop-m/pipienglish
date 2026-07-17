// 词包「颜色和形状」

import { definePack, type Word } from './types'

const w = definePack('颜色和形状', 1)

export const COLOR_SHAPE_WORDS: Word[] = [
  w('color', '/ˈkʌlər/', '颜色', '🎨', 'What color do you like?', '你喜欢什么颜色?'),
  w('red', '/red/', '红色', '🔴', 'The fire truck is red.', '消防车是红色的。'),
  w('yellow', '/ˈjeloʊ/', '黄色', '🟡', 'The chick is yellow.', '小鸡是黄色的。'),
  w('blue', '/bluː/', '蓝色', '🔵', 'The sky is blue today.', '今天天空是蓝色的。'),
  w('green', '/ɡriːn/', '绿色', '🟢', 'Frogs are green.', '青蛙是绿色的。'),
  w('pink', '/pɪŋk/', '粉色', '🌸', 'She has a pink dress.', '她有一条粉色裙子。'),
  w('purple', '/ˈpɜːrpl/', '紫色', '🟣', 'Grapes are purple.', '葡萄是紫色的。'),
  w('black', '/blæk/', '黑色', '⚫', 'The night sky is black.', '夜晚的天空是黑色的。'),
  w('white', '/waɪt/', '白色', '⚪', 'Snow is white and soft.', '雪又白又软。'),
  w('brown', '/braʊn/', '棕色', '🟤', 'The bear is big and brown.', '这只熊又大又棕。'),
  w('grey', '/ɡreɪ/', '灰色', '🩶', 'The little mouse is grey.', '小老鼠是灰色的。'),
  w('shape', '/ʃeɪp/', '形状', '🔷', 'What shape is the moon?', '月亮是什么形状?'),
  w('circle', '/ˈsɜːrkl/', '圆形', '⭕', 'Draw a big circle.', '画一个大圆。'),
  w('square', '/skwer/', '正方形', '🟦', 'The box is a square.', '这个盒子是正方形的。'),
  w('triangle', '/ˈtraɪæŋɡl/', '三角形', '🔺', 'The roof is a triangle.', '屋顶是三角形的。'),
  w('heart', '/hɑːrt/', '爱心;心', '❤️', 'I drew a heart for Mom.', '我给妈妈画了一颗爱心。'),
  w('line', '/laɪn/', '线', '📏', 'Draw a straight line.', '画一条直线。'),
  w('dot', '/dɑːt/', '圆点', '🔘', 'The ladybug has black dots.', '瓢虫身上有黑点。'),
]
