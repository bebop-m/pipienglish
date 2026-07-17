// 词包「学校生活」:学校、文具与科目

import { definePack, type Word } from './types'

const w = definePack('学校生活', 1)

export const SCHOOL_WORDS: Word[] = [
  w('school', '/skuːl/', '学校', '🏫', 'Our school has a big playground.', '我们学校有个大操场。'),
  w('class', '/klæs/', '班级;课', '📚', 'Our class has forty kids.', '我们班有四十个孩子。'),
  w('classroom', '/ˈklæsruːm/', '教室', '🏫', 'The classroom is quiet now.', '教室现在很安静。'),
  w('teacher', '/ˈtiːtʃər/', '老师', '🧑‍🏫', 'Our teacher tells fun stories.', '我们老师讲有趣的故事。'),
  w('student', '/ˈstuːdnt/', '学生', '🧑‍🎓', 'I am a good student.', '我是个好学生。'),
  w('classmate', '/ˈklæsmeɪt/', '同学', '🧒', 'My classmate shares her eraser.', '同学把橡皮分给我用。'),
  w('book', '/bʊk/', '书', '📖', 'This book is about dinosaurs.', '这本书讲恐龙。'),
  w('notebook', '/ˈnoʊtbʊk/', '笔记本', '📓', 'Write it in your notebook.', '把它写在笔记本上。'),
  w('pen', '/pen/', '钢笔;笔', '🖊️', 'My pen is out of ink.', '我的笔没墨水了。'),
  w('pencil', '/ˈpensl/', '铅笔', '✏️', 'Draw with a pencil first.', '先用铅笔画。'),
  w('eraser', '/ɪˈreɪsər/', '橡皮', '🧽', 'The eraser fixes my mistakes.', '橡皮帮我改错。'),
  w('ruler', '/ˈruːlər/', '尺子', '📏', 'Draw lines with a ruler.', '用尺子画线。'),
  w('bag', '/bæɡ/', '书包;包', '🎒', 'My bag is heavy today.', '今天我的书包好重。'),
  w('paper', '/ˈpeɪpər/', '纸', '📄', 'Fold the paper into a plane.', '把纸折成飞机。'),
  w('picture', '/ˈpɪktʃər/', '图画;图片', '🖼️', 'I drew a picture of our farm.', '我画了一张我们农场的画。'),
  w('word', '/wɜːrd/', '单词', '🔤', 'I learn four words a day.', '我每天学四个单词。'),
  w('letter', '/ˈletər/', '字母;信', '✉️', 'The word apple has five letters.', '苹果这个词有五个字母。'),
  w('story', '/ˈstɔːri/', '故事', '📕', 'One more story, please!', '再讲一个故事嘛!'),
  w('homework', '/ˈhoʊmwɜːrk/', '作业', '📝', 'I finished my homework early.', '我早早写完了作业。'),
  w('lesson', '/ˈlesn/', '课', '📖', 'The music lesson is fun.', '音乐课真有趣。'),
  w('question', '/ˈkwestʃən/', '问题', '❓', 'May I ask a question?', '我能问个问题吗?'),
  w('answer', '/ˈænsər/', '回答;答案', '💬', 'I know the answer!', '我知道答案!'),
  w('English', '/ˈɪŋɡlɪʃ/', '英语', '🔤', 'I learn English with my chicks.', '我和小鸡们一起学英语。'),
  w('Chinese', '/ˌtʃaɪˈniːz/', '语文;中文', '📜', 'We write Chinese characters today.', '今天我们写汉字。'),
  w('math', '/mæθ/', '数学', '➕', 'Math class is at nine.', '数学课九点开始。'),
  w('music', '/ˈmjuːzɪk/', '音乐', '🎵', 'We sing in music class.', '我们在音乐课上唱歌。'),
  w('art', '/ɑːrt/', '美术', '🎨', 'We paint in art class.', '我们在美术课上画画。'),
  w('science', '/ˈsaɪəns/', '科学', '🔬', 'Science class has cool experiments.', '科学课有酷酷的实验。'),
  w('library', '/ˈlaɪbreri/', '图书馆', '📚', 'The library is very quiet.', '图书馆里非常安静。'),
  w('playground', '/ˈpleɪɡraʊnd/', '操场', '🛝', 'We run on the playground.', '我们在操场上跑。'),
  w('blackboard', '/ˈblækbɔːrd/', '黑板', '🧑‍🏫', 'The teacher writes on the blackboard.', '老师在黑板上写字。'),
  w('test', '/test/', '考试;测验', '💯', 'I did well on the test.', '我考试考得不错。'),
]
