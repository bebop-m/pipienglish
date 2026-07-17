// 词包「出门去」:地点、交通与方向

import { definePack, type Word } from './types'

const w = definePack('出门去', 1)

export const CITY_WORDS: Word[] = [
  // —— 地点 ——
  w('city', '/ˈsɪti/', '城市', '🏙️', 'The city is busy at night.', '城市的夜晚很热闹。'),
  w('street', '/striːt/', '街道', '🛣️', 'Our street has many shops.', '我们街上有很多商店。'),
  w('road', '/roʊd/', '路', '🛤️', 'The road goes to the farm.', '这条路通向农场。'),
  w('park', '/pɑːrk/', '公园', '🌳', 'We fly kites in the park.', '我们在公园放风筝。'),
  w('shop', '/ʃɑːp/', '商店', '🏪', 'The shop sells sweet drinks.', '商店卖甜甜的饮料。'),
  w('supermarket', '/ˈsuːpərmɑːrkɪt/', '超市', '🛒', 'We buy fruit at the supermarket.', '我们在超市买水果。'),
  w('restaurant', '/ˈrestrɑːnt/', '餐厅', '🍽️', 'This restaurant makes great noodles.', '这家餐厅的面条很棒。'),
  w('hospital', '/ˈhɑːspɪtl/', '医院', '🏥', 'The doctor works at the hospital.', '医生在医院工作。'),
  w('cinema', '/ˈsɪnəmə/', '电影院', '🎬', 'We watch cartoons at the cinema.', '我们在电影院看动画片。'),
  w('museum', '/mjuˈziːəm/', '博物馆', '🏛️', 'The museum has dinosaur bones.', '博物馆里有恐龙骨头。'),
  w('station', '/ˈsteɪʃn/', '车站', '🚉', 'The train leaves the station.', '火车驶出车站。'),
  w('airport', '/ˈerpɔːrt/', '机场', '🛫', 'Planes take off at the airport.', '飞机在机场起飞。'),
  // —— 交通 ——
  w('bus', '/bʌs/', '公交车', '🚌', 'The bus stops here.', '公交车停在这里。'),
  w('car', '/kɑːr/', '小汽车', '🚗', 'The red car goes beep beep.', '红色小汽车嘀嘀叫。'),
  w('bike', '/baɪk/', '自行车', '🚲', 'I ride my bike to the park.', '我骑自行车去公园。'),
  w('train', '/treɪn/', '火车', '🚂', 'The train goes through the mountain.', '火车穿过大山。'),
  w('plane', '/pleɪn/', '飞机', '✈️', 'The plane flies above the clouds.', '飞机飞在云上面。'),
  w('boat', '/boʊt/', '小船', '🛶', 'We row a boat on the lake.', '我们在湖上划船。'),
  w('ship', '/ʃɪp/', '轮船', '🚢', 'The ship sails across the sea.', '轮船驶过大海。'),
  w('subway', '/ˈsʌbweɪ/', '地铁', '🚇', 'The subway runs underground.', '地铁在地下跑。'),
  w('taxi', '/ˈtæksi/', '出租车', '🚕', 'We take a taxi in the rain.', '下雨天我们打出租车。'),
  // —— 出行 ——
  w('map', '/mæp/', '地图', '🗺️', 'The map shows the way home.', '地图指出回家的路。'),
  w('ticket', '/ˈtɪkɪt/', '票', '🎫', 'Two tickets for the cartoon, please.', '请给我两张动画片的票。'),
  w('trip', '/trɪp/', '旅行', '🧳', 'Our family trip starts tomorrow!', '我们的全家旅行明天出发!'),
  w('left', '/left/', '左;左边', '⬅️', 'Turn left at the corner.', '在拐角向左转。'),
  w('right', '/raɪt/', '右;对的', '➡️', 'The shop is on the right.', '商店在右边。'),
  w('near', '/nɪr/', '近的;附近', '📍', 'The park is near our home.', '公园离我们家很近。'),
  w('far', '/fɑːr/', '远的', '🔭', 'The sea is far from here.', '大海离这里很远。'),
]
