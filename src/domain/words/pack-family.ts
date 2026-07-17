// 词包「家人和朋友」

import { definePack, type Word } from './types'

const w = definePack('家人和朋友', 1)

export const FAMILY_WORDS: Word[] = [
  w('family', '/ˈfæməli/', '家;家人', '👨‍👩‍👧', 'I love my family.', '我爱我的家人。'),
  w('dad', '/dæd/', '爸爸', '👨', 'Dad tells the best stories.', '爸爸讲的故事最好听。'),
  w('mom', '/mɑːm/', '妈妈', '👩', 'Mom, look what I made!', '妈妈,看我做了什么!'),
  w('father', '/ˈfɑːðər/', '父亲', '👨‍🦱', 'My father is very tall.', '我的父亲很高。'),
  w('mother', '/ˈmʌðər/', '母亲', '👩‍🦱', 'My mother sings very well.', '我的母亲唱歌很好听。'),
  w('parent', '/ˈperənt/', '父母', '👫', 'My parents love me so much.', '爸爸妈妈非常爱我。'),
  w('grandpa', '/ˈɡrænpɑː/', '爷爷;外公', '👴', 'Grandpa grows tomatoes.', '爷爷种西红柿。'),
  w('grandma', '/ˈɡrænmɑː/', '奶奶;外婆', '👵', 'Grandma bakes yummy pies.', '奶奶烤好吃的派。'),
  w('brother', '/ˈbrʌðər/', '哥哥;弟弟', '👦', 'My brother plays football.', '我哥哥踢足球。'),
  w('sister', '/ˈsɪstər/', '姐姐;妹妹', '👧', 'My sister draws with me.', '姐姐和我一起画画。'),
  w('baby', '/ˈbeɪbi/', '宝宝', '👶', 'The baby is sleeping, shh!', '宝宝在睡觉,嘘!'),
  w('kid', '/kɪd/', '小孩', '🧒', 'The kids play in the yard.', '孩子们在院子里玩。'),
  w('boy', '/bɔɪ/', '男孩', '👦', 'That boy is my classmate.', '那个男孩是我同学。'),
  w('girl', '/ɡɜːrl/', '女孩', '👧', 'The girl has a kite.', '那个女孩有一只风筝。'),
  w('man', '/mæn/', '男人', '👨', 'That man is our teacher.', '那个男人是我们的老师。'),
  w('woman', '/ˈwʊmən/', '女人', '👩', 'The woman waters the flowers.', '那位女士在浇花。'),
  w('uncle', '/ˈʌŋkl/', '叔叔;舅舅', '🧔', 'My uncle drives a big truck.', '叔叔开大卡车。'),
  w('aunt', '/ænt/', '阿姨;姑姑', '👩‍🦰', 'Aunt Lily visits on Sundays.', '莉莉阿姨星期天来做客。'),
  w('cousin', '/ˈkʌzn/', '表哥;表妹', '🧑', 'My cousin and I tell jokes.', '我和表哥讲笑话。'),
  w('friend', '/frend/', '朋友', '🤝', 'You are my best friend.', '你是我最好的朋友。'),
  w('name', '/neɪm/', '名字', '📛', 'What is your name?', '你叫什么名字?'),
  w('love', '/lʌv/', '爱', '❤️', 'I love you, Mom!', '妈妈,我爱你!'),
  w('hug', '/hʌɡ/', '拥抱', '🤗', 'Give me a big hug!', '给我一个大大的拥抱!'),
  w('people', '/ˈpiːpl/', '人们', '👥', 'Many people like dumplings.', '很多人喜欢饺子。'),
]
