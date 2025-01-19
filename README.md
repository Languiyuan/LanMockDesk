LanmockDesk 是LanMock桌面端，脱离服务器，降低使用成本，一定程度扩大应用范围。

框架搭建依赖 https://vite.electron.js.cn/

需要注意：
https://github.com/WiseLibs/better-sqlite3/issues/549#issuecomment-774506826
```json
  "scripts": {
    "rebuild": "electron-rebuild -f -w better-sqlite3",
    "postinstall": "electron-builder install-app-deps"
  },
```
```sh
npm i  
npm run dev
```
windows打包需要管理员权限