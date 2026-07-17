// 词包「动物朋友」:农场、宠物、野生动物与昆虫(课标小学词汇 + 生活高频)

import { definePack, type Word } from './types'

const w = definePack('动物朋友', 1)

export const ANIMAL_WORDS: Word[] = [
  w('animal', '/ˈænɪml/', '动物', '🐾', 'What animal do you like?', '你喜欢什么动物?'),
  // —— 农场与家里 ——
  w('cat', '/kæt/', '猫', '🐱', 'The cat sleeps all day.', '猫睡了一整天。'),
  w('dog', '/dɔːɡ/', '狗', '🐶', 'The dog wags its tail.', '小狗摇尾巴。'),
  w('bird', '/bɜːrd/', '鸟', '🐦', 'A bird sings in the tree.', '一只鸟在树上唱歌。'),
  w('hen', '/hen/', '母鸡', '🐔', 'Our hen lays an egg every day.', '我们的母鸡每天下一个蛋。'),
  w('chick', '/tʃɪk/', '小鸡', '🐤', 'The chick says peep peep.', '小鸡叽叽叫。'),
  w('duck', '/dʌk/', '鸭子', '🦆', 'The duck swims in the pond.', '鸭子在池塘里游。'),
  w('pig', '/pɪɡ/', '猪', '🐷', 'The pig loves rolling in mud.', '猪爱在泥里打滚。'),
  w('cow', '/kaʊ/', '奶牛', '🐮', 'The cow gives us milk.', '奶牛给我们牛奶。'),
  w('horse', '/hɔːrs/', '马', '🐴', 'The horse runs very fast.', '马跑得非常快。'),
  w('sheep', '/ʃiːp/', '绵羊', '🐑', 'The sheep has a wool coat.', '绵羊穿着羊毛外套。'),
  w('goat', '/ɡoʊt/', '山羊', '🐐', 'The goat climbs the rocks.', '山羊爬上石头。'),
  w('rabbit', '/ˈræbɪt/', '兔子', '🐰', 'The rabbit has long ears.', '兔子有长耳朵。'),
  w('mouse', '/maʊs/', '老鼠', '🐭', 'A little mouse ran by!', '一只小老鼠跑过去了!'),
  w('pet', '/pet/', '宠物', '🐹', 'Do you have a pet?', '你养宠物吗?'),
  w('farm', '/fɑːrm/', '农场', '🚜', 'The hens live on the farm.', '母鸡们住在农场里。'),
  w('nest', '/nest/', '鸟窝', '🪺', 'Three eggs are in the nest.', '窝里有三个蛋。'),
  // —— 野生动物 ——
  w('monkey', '/ˈmʌŋki/', '猴子', '🐵', 'The monkey swings on the tree.', '猴子在树上荡来荡去。'),
  w('tiger', '/ˈtaɪɡər/', '老虎', '🐯', 'The tiger has orange stripes.', '老虎有橙色条纹。'),
  w('lion', '/ˈlaɪən/', '狮子', '🦁', 'The lion has a big roar.', '狮子吼声很大。'),
  w('elephant', '/ˈelɪfənt/', '大象', '🐘', 'The elephant has a long nose.', '大象有长鼻子。'),
  w('panda', '/ˈpændə/', '熊猫', '🐼', 'The panda eats bamboo.', '熊猫吃竹子。'),
  w('bear', '/ber/', '熊', '🐻', 'The bear sleeps all winter.', '熊睡了一整个冬天。'),
  w('wolf', '/wʊlf/', '狼', '🐺', 'The wolf howls at the moon.', '狼对着月亮嚎叫。'),
  w('fox', '/fɑːks/', '狐狸', '🦊', 'The fox has a fluffy tail.', '狐狸有毛茸茸的尾巴。'),
  w('deer', '/dɪr/', '鹿', '🦌', 'A deer jumps over the stream.', '一只鹿跳过小溪。'),
  w('snake', '/sneɪk/', '蛇', '🐍', 'The snake has no legs.', '蛇没有腿。'),
  w('frog', '/frɔːɡ/', '青蛙', '🐸', 'The frog jumps into the pond.', '青蛙跳进池塘。'),
  w('turtle', '/ˈtɜːrtl/', '乌龟', '🐢', 'The turtle walks so slowly.', '乌龟走得好慢。'),
  w('penguin', '/ˈpeŋɡwɪn/', '企鹅', '🐧', 'Penguins walk funny on the ice.', '企鹅在冰上走路很滑稽。'),
  w('kangaroo', '/ˌkæŋɡəˈruː/', '袋鼠', '🦘', 'The kangaroo jumps very high.', '袋鼠跳得非常高。'),
  w('giraffe', '/dʒəˈræf/', '长颈鹿', '🦒', 'The giraffe has a long neck.', '长颈鹿脖子很长。'),
  w('zebra', '/ˈziːbrə/', '斑马', '🦓', 'The zebra wears black and white.', '斑马穿着黑白条纹。'),
  w('camel', '/ˈkæml/', '骆驼', '🐫', 'The camel walks in the desert.', '骆驼在沙漠里行走。'),
  w('squirrel', '/ˈskwɜːrəl/', '松鼠', '🐿️', 'The squirrel hides nuts for winter.', '松鼠藏坚果过冬。'),
  w('owl', '/aʊl/', '猫头鹰', '🦉', 'The owl wakes up at night.', '猫头鹰晚上才醒。'),
  w('dinosaur', '/ˈdaɪnəsɔːr/', '恐龙', '🦖', 'Dinosaurs lived long, long ago.', '恐龙生活在很久很久以前。'),
  w('dragon', '/ˈdræɡən/', '龙', '🐲', 'The dragon flies over the castle.', '龙飞过城堡。'),
  w('zoo', '/zuː/', '动物园', '🦁', 'We saw pandas at the zoo.', '我们在动物园看到了熊猫。'),
  // —— 水里 ——
  w('whale', '/weɪl/', '鲸鱼', '🐳', 'The whale is the biggest animal.', '鲸鱼是最大的动物。'),
  w('dolphin', '/ˈdɑːlfɪn/', '海豚', '🐬', 'Dolphins love to jump and play.', '海豚爱跳跃玩耍。'),
  w('shark', '/ʃɑːrk/', '鲨鱼', '🦈', 'The shark has sharp teeth.', '鲨鱼有锋利的牙齿。'),
  w('octopus', '/ˈɑːktəpəs/', '章鱼', '🐙', 'The octopus has eight arms.', '章鱼有八条腿。'),
  w('crab', '/kræb/', '螃蟹', '🦀', 'The crab walks sideways.', '螃蟹横着走。'),
  // —— 小昆虫 ——
  w('bee', '/biː/', '蜜蜂', '🐝', 'The bee makes sweet honey.', '蜜蜂酿甜甜的蜂蜜。'),
  w('butterfly', '/ˈbʌtərflaɪ/', '蝴蝶', '🦋', 'A butterfly lands on the flower.', '一只蝴蝶落在花上。'),
  w('ant', '/ænt/', '蚂蚁', '🐜', 'The ant is small but strong.', '蚂蚁小小的却很有力气。'),
  w('spider', '/ˈspaɪdər/', '蜘蛛', '🕷️', 'The spider makes a web.', '蜘蛛织网。'),
  w('snail', '/sneɪl/', '蜗牛', '🐌', 'The snail carries its house.', '蜗牛背着自己的家。'),
  // —— 动物身上 ——
  w('tail', '/teɪl/', '尾巴', '🐒', 'The puppy chases its tail.', '小狗追自己的尾巴。'),
  w('wing', '/wɪŋ/', '翅膀', '🪽', 'The bird opens its wings.', '鸟儿张开翅膀。'),
]
