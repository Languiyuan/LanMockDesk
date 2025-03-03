import { defineStore } from 'pinia'
import { AppConfig } from '../interface'
import piniaPersistConfig from '../piniaPersist'
import { ProjectInfo } from '../../pages/project/types/index';

export const useAppConfig = defineStore('appConfig', {
  state: (): AppConfig => ({
    theme: 'lightTheme',
    projectList: []
  }),
  getters: {},
  actions: {
    changeTheme(newTheme: string) {
      this.theme = newTheme;
    },
    addProject(project: any) {
      this.projectList.push(project);
    },
    setProjectList(projectList: ProjectInfo[]) {
      this.projectList = projectList;
    }
  },
  persist: piniaPersistConfig('appConfig')
})
