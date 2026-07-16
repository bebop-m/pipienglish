// 词库:首发词包「好吃的!」(皮皮钦定)
// 选词原则:优先选会在她生活中出现的词(超市、餐厅、动画、零食柜)

export interface Word {
  id: string
  word: string
  meaning: string
  emoji: string
  sentence: string
  sentenceCn: string
  pack: string
  level: 1 | 2 | 3
}

const P = '好吃的!'

function w(word: string, meaning: string, emoji: string, sentence: string, sentenceCn: string): Word {
  return { id: word, word, meaning, emoji, sentence, sentenceCn, pack: P, level: 1 }
}

export const WORDS: Word[] = [
  // —— 水果 ——
  w('apple', '苹果', '🍎', 'I eat an apple every day.', '我每天吃一个苹果。'),
  w('banana', '香蕉', '🍌', 'The monkey loves bananas.', '猴子最爱香蕉。'),
  w('orange', '橙子', '🍊', 'This orange is very sweet.', '这个橙子很甜。'),
  w('grape', '葡萄', '🍇', 'Grapes are small and round.', '葡萄小小的、圆圆的。'),
  w('watermelon', '西瓜', '🍉', 'We eat watermelon in summer.', '我们夏天吃西瓜。'),
  w('strawberry', '草莓', '🍓', 'Strawberry cake is my favorite.', '草莓蛋糕是我的最爱。'),
  w('peach', '桃子', '🍑', 'The peach is soft and juicy.', '桃子又软又多汁。'),
  w('pear', '梨', '🍐', 'Would you like a pear?', '你想要一个梨吗?'),
  w('lemon', '柠檬', '🍋', 'The lemon is very sour!', '柠檬好酸呀!'),
  w('mango', '芒果', '🥭', 'Mango juice is yellow.', '芒果汁是黄色的。'),
  w('pineapple', '菠萝', '🍍', 'A pineapple wears a spiky hat.', '菠萝戴着一顶刺刺的帽子。'),
  w('cherry', '樱桃', '🍒', 'Two cherries are on the cake.', '蛋糕上有两颗樱桃。'),
  w('kiwi', '猕猴桃', '🥝', 'The kiwi is green inside.', '猕猴桃里面是绿色的。'),
  w('coconut', '椰子', '🥥', 'Coconut water is yummy.', '椰子水很好喝。'),
  w('blueberry', '蓝莓', '🫐', 'Blueberries make my tongue blue.', '蓝莓把我的舌头染蓝了。'),
  w('melon', '甜瓜', '🍈', 'This melon smells so good.', '这个甜瓜闻起来真香。'),
  w('avocado', '牛油果', '🥑', 'The avocado is green and soft.', '牛油果绿绿的、软软的。'),

  // —— 蔬菜 ——
  w('tomato', '西红柿', '🍅', 'Tomato and egg is a great dish.', '西红柿炒鸡蛋是道好菜。'),
  w('potato', '土豆', '🥔', 'French fries are made of potatoes.', '薯条是土豆做的。'),
  w('carrot', '胡萝卜', '🥕', 'Rabbits love carrots.', '兔子最爱胡萝卜。'),
  w('cucumber', '黄瓜', '🥒', 'The cucumber is cool and crunchy.', '黄瓜凉凉的、脆脆的。'),
  w('corn', '玉米', '🌽', 'Sweet corn is my favorite vegetable.', '甜玉米是我最喜欢的蔬菜。'),
  w('pumpkin', '南瓜', '🎃', 'We made pumpkin soup.', '我们做了南瓜汤。'),
  w('mushroom', '蘑菇', '🍄', 'Mushrooms grow after the rain.', '雨后长出了蘑菇。'),
  w('onion', '洋葱', '🧅', 'Onions make me cry.', '洋葱让我流眼泪。'),
  w('pepper', '辣椒', '🌶️', 'This red pepper is hot!', '这个红辣椒好辣!'),
  w('cabbage', '卷心菜', '🥬', 'The cabbage is big and round.', '卷心菜又大又圆。'),
  w('broccoli', '西兰花', '🥦', 'Broccoli looks like a little tree.', '西兰花像一棵小树。'),
  w('garlic', '大蒜', '🧄', 'Garlic keeps the vampires away.', '大蒜能吓跑吸血鬼。'),
  w('eggplant', '茄子', '🍆', 'The eggplant is purple.', '茄子是紫色的。'),
  w('bean', '豆子', '🫘', 'Jack has some magic beans.', '杰克有几颗魔法豆。'),

  // —— 饮料 ——
  w('water', '水', '💧', 'Drink more water every day.', '每天要多喝水。'),
  w('milk', '牛奶', '🥛', 'I drink milk before bed.', '我睡前喝牛奶。'),
  w('juice', '果汁', '🧃', 'Apple juice, please!', '请给我苹果汁!'),
  w('tea', '茶', '🍵', 'Grandpa drinks tea every morning.', '爷爷每天早上喝茶。'),
  w('coffee', '咖啡', '☕', 'Mom needs her coffee.', '妈妈需要她的咖啡。'),
  w('cola', '可乐', '🥤', 'Cola has too much sugar.', '可乐糖太多啦。'),
  w('milkshake', '奶昔', '🍧', 'A strawberry milkshake, please.', '请来一杯草莓奶昔。'),

  // —— 食物 ——
  w('rice', '米饭', '🍚', 'We eat rice for dinner.', '我们晚饭吃米饭。'),
  w('noodles', '面条', '🍜', 'I can eat noodles with chopsticks.', '我会用筷子吃面条。'),
  w('bread', '面包', '🍞', 'The bread is warm and soft.', '面包又热又软。'),
  w('egg', '鸡蛋', '🥚', 'The hen laid an egg!', '母鸡下了一个蛋!'),
  w('cake', '蛋糕', '🍰', 'Happy birthday! Here is your cake.', '生日快乐!这是你的蛋糕。'),
  w('cookie', '曲奇饼干', '🍪', 'Who ate my cookie?', '谁吃了我的曲奇?'),
  w('candy', '糖果', '🍬', 'Too much candy is bad for teeth.', '糖吃多了对牙齿不好。'),
  w('chocolate', '巧克力', '🍫', 'Chocolate makes me happy.', '巧克力让我开心。'),
  w('ice cream', '冰淇淋', '🍦', 'Ice cream in winter? Yes!', '冬天吃冰淇淋?好呀!'),
  w('pizza', '披萨', '🍕', 'Let us share this pizza.', '我们一起分这个披萨吧。'),
  w('hamburger', '汉堡包', '🍔', 'A big hamburger with cheese.', '一个加芝士的大汉堡。'),
  w('sandwich', '三明治', '🥪', 'I made a sandwich for the picnic.', '我为野餐做了一个三明治。'),
  w('hot dog', '热狗', '🌭', 'A hot dog is not a real dog.', '热狗可不是真的狗。'),
  w('dumpling', '饺子', '🥟', 'We make dumplings together.', '我们一起包饺子。'),
  w('fish', '鱼', '🐟', 'The cat wants my fish.', '猫咪想吃我的鱼。'),
  w('chicken', '鸡肉', '🍗', 'Fried chicken is crispy.', '炸鸡脆脆的。'),
  w('beef', '牛肉', '🥩', 'Beef noodles are delicious.', '牛肉面真好吃。'),
  w('cheese', '芝士', '🧀', 'The mouse loves cheese.', '小老鼠最爱芝士。'),
  w('butter', '黄油', '🧈', 'Put some butter on the bread.', '在面包上抹点黄油。'),
  w('honey', '蜂蜜', '🍯', 'Bears love honey.', '熊最爱蜂蜜。'),
  w('popcorn', '爆米花', '🍿', 'Popcorn and a movie!', '爆米花配电影!'),
  w('fries', '薯条', '🍟', 'These fries are too salty.', '这些薯条太咸了。'),
  w('pancake', '松饼', '🥞', 'Pancakes with honey, yum!', '松饼配蜂蜜,好吃!'),
  w('pie', '派', '🥧', 'Grandma baked an apple pie.', '奶奶烤了一个苹果派。'),
  w('doughnut', '甜甜圈', '🍩', 'The doughnut has a hole.', '甜甜圈有一个洞。'),
  w('sushi', '寿司', '🍣', 'Sushi comes from Japan.', '寿司来自日本。'),
  w('ramen', '拉面', '🍥', 'Ramen is Japanese noodles.', '拉面是日本的面条。'),
  w('soup', '汤', '🍲', 'Drink your soup while it is hot.', '趁热喝汤。'),
  w('salad', '沙拉', '🥗', 'A fruit salad is healthy.', '水果沙拉很健康。'),
  w('sausage', '香肠', '🌭', 'The dog stole a sausage.', '小狗偷了一根香肠。'),

  // —— 味道和吃喝 ——
  w('sweet', '甜的', '🍭', 'The candy is so sweet.', '这颗糖真甜。'),
  w('sour', '酸的', '😖', 'Lemons are sour.', '柠檬是酸的。'),
  w('salty', '咸的', '🧂', 'Sea water is salty.', '海水是咸的。'),
  w('spicy', '辣的', '🔥', 'This hot pot is too spicy!', '这个火锅太辣了!'),
  w('hot', '热的;辣的', '♨️', 'Careful, the soup is hot!', '小心,汤是热的!'),
  w('cold', '冷的;凉的', '🧊', 'I want a cold drink.', '我想要一杯冷饮。'),
  w('delicious', '美味的', '😋', 'Dinner was delicious, Mom!', '妈妈,晚饭太好吃了!'),
  w('hungry', '饿的', '🍽️', 'I am so hungry!', '我好饿呀!'),
  w('thirsty', '渴的', '💦', 'Running makes me thirsty.', '跑步让我口渴。'),
  w('eat', '吃', '👄', 'Let us eat together.', '我们一起吃吧。'),
  w('drink', '喝', '🫗', 'Drink your milk, please.', '请把牛奶喝了。'),
  w('cook', '做饭', '👩‍🍳', 'Dad can cook noodles.', '爸爸会煮面条。'),
  w('breakfast', '早餐', '🌅', 'Eggs for breakfast again?', '早餐又吃鸡蛋?'),
  w('lunch', '午餐', '🍱', 'What is for lunch today?', '今天午餐吃什么?'),
  w('dinner', '晚餐', '🌙', 'Dinner is ready!', '晚餐好啦!'),
  w('snack', '零食', '🍘', 'One snack after homework.', '写完作业吃一个零食。'),
  w('fruit', '水果', '🍎', 'Fruit is good for you.', '水果对你有好处。'),
  w('vegetable', '蔬菜', '🥦', 'Eat your vegetables first.', '先把蔬菜吃了。'),
  w('yummy', '好吃的(口语)', '🤤', 'Yummy! I want more!', '真好吃!我还要!'),
  w('kitchen', '厨房', '🏠', 'Something smells good in the kitchen.', '厨房里有什么东西好香。'),
]

export const WORD_MAP = new Map(WORDS.map(word => [word.id, word]))
