import type { PersistenceOptions } from 'pinia-plugin-persistedstate';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

/**
 * @description pinia 持久化参数配置
 * @param {String} key 存储到持久化的 name
 * @return persist
 */
const piniaPersistConfig = (key: string) => {
  const persist: PersistenceOptions = {
    key,
    // storage: localStorage
    storage: {
      getItem(key: string) {
        console.log(`Attempting to get item for key "${key}"`);
        const value = localStorage.getItem(key);
        console.log(`Got item for key "${key}":`, value);
        return value ? JSON.parse(value) : null;
      },
      setItem(key: string, value: any) {
        console.log(`Attempting to set item for key "${key}" with value:`, value);
        try {  
          localStorage.setItem(key, value);
          console.log(`Successfully set item for key "${key}"`);
          // 传一个事件给主进程 通知它更新 const filePath = path.join(app.getPath('userData'), `${key}.json`); 这个路径下的文件，把localStorage中的这个key的值写入这个文件
          if(key === 'appConfig') {
            const data = localStorage.getItem('appConfig');
            window.ipcRenderer.send('updateConfigFile', data)
          }
          
        } catch (error) {
          console.error(`Failed to set item for key "${key}":`, error);
        }
      },
    },
    // storage: {
    //   getItem(key: string) {
    //     try {
    //       const filePath = path.join(app.getPath('userData'), `${key}.json`);
    //       const data = fs.readFileSync(filePath, 'utf-8');
    //       return JSON.parse(data);
    //     } catch (error) {
    //       if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    //         console.warn(`File not found for key "${key}":`, error);
    //         return null;
    //       }
    //       console.warn(`Failed to read file for key "${key}":`, error);
    //       return null; // 如果文件不存在，则返回 null
    //     }
    //   },
    //   setItem(key: string, value: any) {
    //     const filePath = path.join(app.getPath('userData'), `${key}.json`);
    //     try {
    //       // 确保目录存在（防止父目录不存在导致写入失败）
    //       fs.mkdirSync(path.dirname(filePath), { recursive: true });
    //       // 写入文件
    //       fs.writeFileSync(filePath, JSON.stringify(value), 'utf-8');
    //     } catch (error) {
    //       console.error(`Failed to write file for key "${key}":`, error);
    //     }
    //   },
    // },
  };
  return persist;
};

export default piniaPersistConfig;