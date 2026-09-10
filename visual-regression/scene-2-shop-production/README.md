# 场景 2 装饰商店生产验收

- `scene-2-decoration-shop-1194x834.png`：GitHub Pages 子路径成品包中的苹果园装饰商店；9 件商品、具体名称、价格、类别与透明缩略图同屏。
- `scene-2-all-decorations-placed-1194x834.png`：同一成品包购买全部商品后，将 4 small、3 medium、2 landmark 摆入苹果园，并显示免费旅行路牌。
- 自动化脚本：`scripts/qa-scene2-shop.mjs`。
- 事务断言：初始 200 蛋，购买 9 件共扣 90 蛋，剩余 110；目录 9 件、已摆放 9 件；所有道具图解码为 `1254×1254`，无 HTTP、console 或 page errors。
