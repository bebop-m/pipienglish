// 词包「穿什么」:衣物与穿戴

import { definePack, type Word } from './types'

const w = definePack('穿什么', 1)

export const CLOTHES_WORDS: Word[] = [
  w('clothes', '/kloʊz/', '衣服', '👚', 'Put on warm clothes today.', '今天穿暖和的衣服。'),
  w('shirt', '/ʃɜːrt/', '衬衫', '👔', 'Dad wears a white shirt.', '爸爸穿白衬衫。'),
  w('T-shirt', '/ˈtiːʃɜːrt/', 'T恤', '👕', 'My T-shirt has a chick on it.', '我的T恤上有一只小鸡。'),
  w('dress', '/dres/', '连衣裙', '👗', 'The dress has little stars.', '这条裙子上有小星星。'),
  w('skirt', '/skɜːrt/', '短裙', '👗', 'Her skirt is blue and white.', '她的裙子是蓝白色的。'),
  w('pants', '/pænts/', '裤子', '👖', 'These pants are too long.', '这条裤子太长了。'),
  w('shorts', '/ʃɔːrts/', '短裤', '🩳', 'I wear shorts in summer.', '夏天我穿短裤。'),
  w('coat', '/koʊt/', '外套', '🧥', 'Wear your coat, it is cold.', '穿上外套,天冷。'),
  w('jacket', '/ˈdʒækɪt/', '夹克', '🧥', 'My jacket has big pockets.', '我的夹克有大口袋。'),
  w('sweater', '/ˈswetər/', '毛衣', '🧶', 'Grandma made this sweater for me.', '这件毛衣是奶奶给我织的。'),
  w('hat', '/hæt/', '帽子', '👒', 'The farmer wears a straw hat.', '农场主戴着草帽。'),
  w('cap', '/kæp/', '鸭舌帽', '🧢', 'His cap is red.', '他的鸭舌帽是红色的。'),
  w('shoe', '/ʃuː/', '鞋', '👟', 'Tie your shoes before running.', '跑步前系好鞋带。'),
  w('sock', '/sɑːk/', '袜子', '🧦', 'One sock is missing!', '一只袜子不见了!'),
  w('glove', '/ɡlʌv/', '手套', '🧤', 'Gloves keep my hands warm.', '手套让我的手暖暖的。'),
  w('scarf', '/skɑːrf/', '围巾', '🧣', 'The hen wears a little scarf.', '母鸡戴着小围巾。'),
  w('glasses', '/ˈɡlæsɪz/', '眼镜', '👓', 'Grandpa reads with his glasses.', '爷爷戴眼镜看书。'),
  w('pocket', '/ˈpɑːkɪt/', '口袋', '👖', 'A candy hides in my pocket.', '我口袋里藏着一颗糖。'),
  w('button', '/ˈbʌtn/', '扣子', '🔘', 'This button is loose.', '这颗扣子松了。'),
  w('umbrella', '/ʌmˈbrelə/', '雨伞', '☂️', 'Take your umbrella, it may rain.', '带上伞,可能下雨。'),
  w('wear', '/wer/', '穿;戴', '🪞', 'What will you wear today?', '你今天穿什么?'),
]
