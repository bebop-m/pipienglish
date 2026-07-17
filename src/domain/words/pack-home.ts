// 词包「我的家」:房间、家具与日用品

import { definePack, type Word } from './types'

const w = definePack('我的家', 1)

export const HOME_WORDS: Word[] = [
  w('home', '/hoʊm/', '家', '🏠', 'Welcome to my home!', '欢迎来我家!'),
  w('house', '/haʊs/', '房子', '🏡', 'The house has a red roof.', '房子有红色的屋顶。'),
  w('room', '/ruːm/', '房间', '🏠', 'My room is clean and bright.', '我的房间干净又明亮。'),
  w('bedroom', '/ˈbedruːm/', '卧室', '🛏️', 'I read in my bedroom.', '我在卧室看书。'),
  w('bathroom', '/ˈbæθruːm/', '浴室;卫生间', '🛁', 'The bathroom mirror is foggy.', '浴室的镜子起雾了。'),
  w('living room', '/ˈlɪvɪŋ ruːm/', '客厅', '🛋️', 'We watch TV in the living room.', '我们在客厅看电视。'),
  w('door', '/dɔːr/', '门', '🚪', 'Please close the door.', '请关门。'),
  w('window', '/ˈwɪndoʊ/', '窗户', '🪟', 'Open the window for fresh air.', '开窗透透气。'),
  w('wall', '/wɔːl/', '墙', '🧱', 'My drawings are on the wall.', '墙上贴着我的画。'),
  w('floor', '/flɔːr/', '地板;楼层', '🪵', 'The toys are on the floor.', '玩具在地板上。'),
  w('roof', '/ruːf/', '屋顶', '🏠', 'A bird stands on the roof.', '一只鸟站在屋顶上。'),
  w('garden', '/ˈɡɑːrdn/', '花园', '🌷', 'Roses grow in the garden.', '花园里长着玫瑰。'),
  w('bed', '/bed/', '床', '🛏️', 'Time for bed, sleepy head.', '该上床啦,小瞌睡虫。'),
  w('desk', '/desk/', '书桌', '📚', 'My desk is by the window.', '我的书桌在窗边。'),
  w('table', '/ˈteɪbl/', '桌子', '🍽️', 'Dinner is on the table.', '晚饭在桌上。'),
  w('chair', '/tʃer/', '椅子', '🪑', 'This chair is very soft.', '这把椅子很软。'),
  w('sofa', '/ˈsoʊfə/', '沙发', '🛋️', 'The cat naps on the sofa.', '猫在沙发上打盹。'),
  w('lamp', '/læmp/', '台灯', '🪔', 'Turn on the lamp to read.', '开台灯看书。'),
  w('light', '/laɪt/', '灯;光', '💡', 'Turn off the light, good night.', '关灯,晚安。'),
  w('TV', '/ˌtiːˈviː/', '电视', '📺', 'No TV before homework.', '写完作业才能看电视。'),
  w('phone', '/foʊn/', '电话;手机', '📱', 'The phone is ringing!', '电话响了!'),
  w('computer', '/kəmˈpjuːtər/', '电脑', '💻', 'Dad works on his computer.', '爸爸用电脑工作。'),
  w('fridge', '/frɪdʒ/', '冰箱', '🧊', 'The juice is in the fridge.', '果汁在冰箱里。'),
  w('box', '/bɑːks/', '盒子', '📦', 'What is inside the box?', '盒子里是什么?'),
  w('key', '/kiː/', '钥匙', '🔑', 'I cannot find the key.', '钥匙找不到了。'),
  w('mirror', '/ˈmɪrər/', '镜子', '🪞', 'The cat looks in the mirror.', '猫照镜子。'),
  w('towel', '/ˈtaʊəl/', '毛巾', '🧺', 'Dry your hands with the towel.', '用毛巾擦手。'),
  w('soap', '/soʊp/', '肥皂', '🧼', 'Wash with soap and water.', '用肥皂和水洗一洗。'),
  w('toothbrush', '/ˈtuːθbrʌʃ/', '牙刷', '🪥', 'My toothbrush is yellow.', '我的牙刷是黄色的。'),
  w('photo', '/ˈfoʊtoʊ/', '照片', '🖼️', 'This photo shows our family trip.', '这张照片是我们全家旅行拍的。'),
]
