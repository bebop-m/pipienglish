// 词包「我的身体」

import { definePack, type Word } from './types'

const w = definePack('我的身体', 1)

export const BODY_WORDS: Word[] = [
  w('body', '/ˈbɑːdi/', '身体', '🧍', 'Move your body to the music.', '跟着音乐动动身体。'),
  w('head', '/hed/', '头', '🙂', 'Touch your head!', '摸摸你的头!'),
  w('hair', '/her/', '头发', '💇', 'Her hair is long and black.', '她的头发又长又黑。'),
  w('face', '/feɪs/', '脸', '😊', 'Wash your face every morning.', '每天早上洗脸。'),
  w('eye', '/aɪ/', '眼睛', '👀', 'Close your eyes and guess.', '闭上眼睛猜一猜。'),
  w('ear', '/ɪr/', '耳朵', '👂', 'Rabbits have long ears.', '兔子有长长的耳朵。'),
  w('nose', '/noʊz/', '鼻子', '👃', 'My nose can smell cookies!', '我的鼻子能闻到曲奇香!'),
  w('mouth', '/maʊθ/', '嘴巴', '👄', 'Open your mouth, ah!', '张开嘴,啊!'),
  w('tooth', '/tuːθ/', '牙齿', '🦷', 'My tooth is loose!', '我的牙齿松动啦!'),
  w('tongue', '/tʌŋ/', '舌头', '👅', 'Stick out your tongue.', '伸出舌头。'),
  w('neck', '/nek/', '脖子', '🦒', 'My scarf keeps my neck warm.', '围巾让我的脖子暖暖的。'),
  w('shoulder', '/ˈʃoʊldər/', '肩膀', '🤷', 'The parrot sits on his shoulder.', '鹦鹉站在他的肩膀上。'),
  w('arm', '/ɑːrm/', '手臂', '💪', 'Open your arms for a hug.', '张开手臂来抱抱。'),
  w('hand', '/hænd/', '手', '✋', 'Wash your hands before dinner.', '晚饭前要洗手。'),
  w('finger', '/ˈfɪŋɡər/', '手指', '👆', 'Count on your fingers.', '用手指数一数。'),
  w('leg', '/leɡ/', '腿', '🦵', 'The crab has ten legs.', '螃蟹有十条腿。'),
  w('knee', '/niː/', '膝盖', '🧎', 'I fell and hurt my knee.', '我摔倒磕到了膝盖。'),
  w('foot', '/fʊt/', '脚', '🦶', 'Hop on one foot!', '单脚跳!'),
  w('tummy', '/ˈtʌmi/', '肚子', '🎈', 'My tummy is full and happy.', '我的肚子饱饱的,很满足。'),
  w('back', '/bæk/', '背;后面', '🔙', 'The turtle carries a shell on its back.', '乌龟背上背着壳。'),
  w('bone', '/boʊn/', '骨头', '🦴', 'The dog hides a bone.', '狗狗藏了一根骨头。'),
  w('smile', '/smaɪl/', '微笑', '😄', 'Your smile makes me happy.', '你的微笑让我开心。'),
]
