This repository is based on `electron-vite-vue`, with the addition of `better-sqlite3` and express practices, used for the technical verification of `LanmockDesk`.

这个仓库基于electron-vite-vue，增加了better-sqlite3和express实践，用于LanmockDesk技术验证。

https://vite.electron.js.cn/

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