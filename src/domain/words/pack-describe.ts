// 词包「什么样子」:高频形容词与数量词

import { definePack, type Word } from './types'

const w = definePack('什么样子', 1)

export const DESCRIBE_WORDS: Word[] = [
  // —— 大小长短 ——
  w('big', '/bɪɡ/', '大的', '🐘', 'The whale is really big.', '鲸鱼真的很大。'),
  w('small', '/smɔːl/', '小的', '🐜', 'A chick is small and fluffy.', '小鸡小小的,毛茸茸的。'),
  w('long', '/lɔːŋ/', '长的', '🐍', 'The train is very long.', '火车很长很长。'),
  w('short', '/ʃɔːrt/', '短的;矮的', '📏', 'The pencil is short now.', '铅笔现在变短了。'),
  w('tall', '/tɔːl/', '高的(个子)', '🦒', 'The giraffe is so tall.', '长颈鹿好高呀。'),
  w('high', '/haɪ/', '高的', '🎈', 'The kite flies high.', '风筝飞得很高。'),
  w('low', '/loʊ/', '低的', '⬇️', 'The bird flies low over the lake.', '鸟低低地飞过湖面。'),
  w('fat', '/fæt/', '胖的', '🐷', 'The cat got a little fat.', '猫咪长胖了一点。'),
  w('thin', '/θɪn/', '瘦的;薄的', '🥢', 'The book is thin and light.', '这本书又薄又轻。'),
  w('heavy', '/ˈhevi/', '重的', '🏋️', 'The watermelon is so heavy!', '西瓜好重呀!'),
  // —— 新旧好坏 ——
  w('old', '/oʊld/', '老的;旧的', '👴', 'The old tree is still strong.', '老树依然强壮。'),
  w('new', '/nuː/', '新的', '✨', 'I have a new word friend!', '我认识了一个新单词朋友!'),
  w('young', '/jʌŋ/', '年幼的;年轻的', '🌱', 'The young bird learns to fly.', '年幼的小鸟在学飞。'),
  w('good', '/ɡʊd/', '好的', '👍', 'Good job, little farmer!', '干得好,小农场主!'),
  w('bad', '/bæd/', '坏的', '👎', 'The bad weather stopped our picnic.', '坏天气打断了野餐。'),
  w('nice', '/naɪs/', '友好的;好的', '😊', 'Our teacher is very nice.', '我们老师人很好。'),
  w('great', '/ɡreɪt/', '棒极了', '🌟', 'You did a great job!', '你做得棒极了!'),
  // —— 心情 ——
  w('happy', '/ˈhæpi/', '开心的', '😄', 'The chick is happy to see you.', '小鸡见到你很开心。'),
  w('sad', '/sæd/', '难过的', '😢', 'The song is a little sad.', '这首歌有点难过。'),
  w('angry', '/ˈæŋɡri/', '生气的', '😠', 'The goose looks angry today.', '大鹅今天看起来气呼呼的。'),
  w('afraid', '/əˈfreɪd/', '害怕的', '😨', 'Do not be afraid, I am here.', '别怕,有我在。'),
  w('tired', '/ˈtaɪərd/', '累的', '🥱', 'I am tired after running.', '跑完步我累了。'),
  w('sleepy', '/ˈsliːpi/', '困的', '😴', 'The sleepy cat yawns.', '困困的猫打了个哈欠。'),
  w('busy', '/ˈbɪzi/', '忙的', '🐝', 'Bees are always busy.', '蜜蜂总是很忙。'),
  // —— 快慢强弱 ——
  w('fast', '/fæst/', '快的', '🚀', 'Cheetahs are super fast.', '猎豹超级快。'),
  w('slow', '/sloʊ/', '慢的', '🐢', 'Slow and steady wins the race.', '慢慢来,稳稳赢。'),
  w('strong', '/strɔːŋ/', '强壮的', '💪', 'Eat well to grow strong.', '好好吃饭,长得强壮。'),
  w('soft', '/sɔːft/', '软的', '☁️', 'The chick is soft like cotton.', '小鸡像棉花一样软。'),
  w('hard', '/hɑːrd/', '硬的;难的', '🪨', 'The walnut shell is hard.', '核桃壳很硬。'),
  w('easy', '/ˈiːzi/', '容易的', '👌', 'This question is easy!', '这道题很简单!'),
  // —— 干湿净闹 ——
  w('wet', '/wet/', '湿的', '💦', 'My shoes are wet from rain.', '我的鞋被雨淋湿了。'),
  w('dry', '/draɪ/', '干的', '🌵', 'Keep the chick warm and dry.', '让小鸡保持温暖干燥。'),
  w('dirty', '/ˈdɜːrti/', '脏的', '🧦', 'Dirty hands? Go wash them!', '手脏了?快去洗!'),
  w('quiet', '/ˈkwaɪət/', '安静的', '🤫', 'Be quiet, the baby sleeps.', '安静,宝宝在睡觉。'),
  w('loud', '/laʊd/', '大声的', '📢', 'The rooster crow is loud.', '公鸡打鸣声音很大。'),
  // —— 对错同异 ——
  w('wrong', '/rɔːŋ/', '错的', '❌', 'It is okay to be wrong.', '答错了也没关系。'),
  w('same', '/seɪm/', '相同的', '👯', 'We wear the same hat!', '我们戴一样的帽子!'),
  w('different', '/ˈdɪfrənt/', '不同的', '🌈', 'Every chick is different.', '每只小鸡都不一样。'),
  // —— 数量 ——
  w('many', '/ˈmeni/', '许多', '🔢', 'How many eggs are there?', '有多少颗蛋?'),
  w('some', '/sʌm/', '一些', '🤏', 'Give the hen some water.', '给母鸡喝点水。'),
  w('all', '/ɔːl/', '全部', '💯', 'We ate all the dumplings!', '我们把饺子全吃光啦!'),
  // —— 夸夸 ——
  w('cute', '/kjuːt/', '可爱的', '🥰', 'The chicks are so cute!', '小鸡们太可爱了!'),
  w('beautiful', '/ˈbjuːtɪfl/', '美丽的', '🌺', 'What a beautiful morning!', '多美的早晨!'),
  w('smart', '/smɑːrt/', '聪明的', '🧠', 'You are one smart kid!', '你真是个聪明的孩子!'),
  w('brave', '/breɪv/', '勇敢的', '🦁', 'The brave chick crossed the bridge.', '勇敢的小鸡过了桥。'),
  w('magic', '/ˈmædʒɪk/', '魔法的;魔法', '🪄', 'The seed grew like magic!', '种子像魔法一样长大了!'),
]
