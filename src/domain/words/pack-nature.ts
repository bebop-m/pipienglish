// 词包「天气和大自然」

import { definePack, type Word } from './types'

const w = definePack('天气和大自然', 1)

export const NATURE_WORDS: Word[] = [
  // —— 天上 ——
  w('sun', '/sʌn/', '太阳', '☀️', 'The sun wakes up the farm.', '太阳唤醒了农场。'),
  w('moon', '/muːn/', '月亮', '🌙', 'The moon is round tonight.', '今晚的月亮圆圆的。'),
  w('star', '/stɑːr/', '星星', '⭐', 'Stars twinkle in the sky.', '星星在天上眨眼。'),
  w('sky', '/skaɪ/', '天空', '🌌', 'The sky turns pink at sunset.', '日落时天空变成粉色。'),
  w('cloud', '/klaʊd/', '云', '☁️', 'That cloud looks like a rabbit.', '那朵云像一只兔子。'),
  w('rainbow', '/ˈreɪnboʊ/', '彩虹', '🌈', 'A rainbow came after the rain.', '雨后出了彩虹。'),
  // —— 天气 ——
  w('weather', '/ˈweðər/', '天气', '🌦️', 'How is the weather today?', '今天天气怎么样?'),
  w('rain', '/reɪn/', '雨;下雨', '🌧️', 'The rain sings on the roof.', '雨在屋顶上唱歌。'),
  w('snow', '/snoʊ/', '雪;下雪', '❄️', 'Let us play in the snow!', '我们去玩雪吧!'),
  w('wind', '/wɪnd/', '风', '🌬️', 'The wind flies my kite high.', '风把我的风筝吹得好高。'),
  w('sunny', '/ˈsʌni/', '晴朗的', '😎', 'It is sunny, let us go out!', '天晴啦,出去玩吧!'),
  w('cloudy', '/ˈklaʊdi/', '多云的', '⛅', 'It is cloudy but warm.', '多云但是很暖和。'),
  w('rainy', '/ˈreɪni/', '下雨的', '☔', 'Rainy days are for reading.', '下雨天适合看书。'),
  w('snowy', '/ˈsnoʊi/', '下雪的', '🌨️', 'The snowy hill is so white.', '雪后的小山好白呀。'),
  w('windy', '/ˈwɪndi/', '刮风的', '🍃', 'It is too windy for the umbrella.', '风太大,伞撑不住啦。'),
  w('warm', '/wɔːrm/', '暖和的', '🌞', 'The nest is warm and cozy.', '窝里暖和又舒服。'),
  w('cool', '/kuːl/', '凉快的;酷的', '🆒', 'The river water is cool.', '河水凉凉的。'),
  // —— 地上 ——
  w('tree', '/triː/', '树', '🌳', 'The old tree gives us shade.', '老树给我们遮荫。'),
  w('flower', '/ˈflaʊər/', '花', '🌼', 'Bees visit every flower.', '蜜蜂拜访每一朵花。'),
  w('grass', '/ɡræs/', '草', '🌱', 'The grass is soft and green.', '草地又软又绿。'),
  w('leaf', '/liːf/', '叶子', '🍁', 'A leaf falls on my head.', '一片叶子落在我头上。'),
  w('seed', '/siːd/', '种子', '🌰', 'Plant a seed and wait.', '种下一颗种子,等一等。'),
  w('mountain', '/ˈmaʊntn/', '山', '⛰️', 'The mountain wears a snow hat.', '大山戴着雪帽子。'),
  w('hill', '/hɪl/', '小山', '⛰️', 'We roll down the grassy hill.', '我们从草坡上滚下来。'),
  w('river', '/ˈrɪvər/', '河', '🏞️', 'Fish swim in the river.', '鱼在河里游。'),
  w('lake', '/leɪk/', '湖', '🏞️', 'Ducks float on the lake.', '鸭子浮在湖面上。'),
  w('sea', '/siː/', '大海', '🌊', 'The sea is big and blue.', '大海又大又蓝。'),
  w('beach', '/biːtʃ/', '沙滩', '🏖️', 'We build castles on the beach.', '我们在沙滩上堆城堡。'),
  w('sand', '/sænd/', '沙子', '⏳', 'Sand gets everywhere!', '沙子哪儿都是!'),
  w('stone', '/stoʊn/', '石头', '🪨', 'The frog sits on a stone.', '青蛙坐在石头上。'),
  w('forest', '/ˈfɔːrɪst/', '森林', '🌲', 'Owls live in the forest.', '猫头鹰住在森林里。'),
  w('earth', '/ɜːrθ/', '地球', '🌍', 'The earth is our home.', '地球是我们的家。'),
  w('world', '/wɜːrld/', '世界', '🗺️', 'I want to see the world.', '我想看看世界。'),
  w('fire', '/ˈfaɪər/', '火', '🔥', 'Never play with fire.', '千万不要玩火。'),
  w('ice', '/aɪs/', '冰', '🧊', 'The ice is cold and slippery.', '冰又冷又滑。'),
  w('air', '/er/', '空气', '💨', 'The morning air smells fresh.', '早晨的空气很清新。'),
]
