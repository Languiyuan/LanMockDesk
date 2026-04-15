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
    async addProject(project: any) {
      if (project.dbPath) {
        try {
          // Call IPC to create project in DB
          const dbProject = await window.ipcRenderer.invoke('createProject', { 
            dbPath: project.dbPath, 
            project: project 
          });
          // Merge DB result (e.g. id) with local project info
          const newProject = { ...project, ...dbProject };
          this.projectList.push(newProject);
        } catch (error) {
          console.error('Failed to create project in DB:', error);
          // Still add to list? Maybe not.
          // For now, let's assume if DB fails, we shouldn't add it.
          // But since the UI calls this, we should probably throw or return status.
        }
      } else {
        this.projectList.push(project);
      }
    },
    async updateProject(project: any) {
       if (project.dbPath) {
         try {
           await window.ipcRenderer.invoke('updateProject', { dbPath: project.dbPath, project });
         } catch (e) {
            console.error(e)
         }
       }
       const index = this.projectList.findIndex((p: ProjectInfo) => p.projectSign === project.projectSign);
       if (index !== -1) {
         this.projectList[index] = project;
       }
    },
    async deleteProject(project: any) {
        // We don't delete the DB file, just remove from list.
        // Or optionally delete from DB project table.
        if (project.dbPath && project.id) {
             try {
                await window.ipcRenderer.invoke('deleteProject', { dbPath: project.dbPath, id: project.id });
             } catch (e) {
                 console.error(e)
             }
        }
        this.projectList = this.projectList.filter((p: ProjectInfo) => p.projectSign !== project.projectSign);
    },
    linkProject(project: ProjectInfo) {
      const index = this.projectList.findIndex((p: ProjectInfo) => {
        if (project.dbPath && project.id && p.dbPath && p.id) {
          return p.dbPath === project.dbPath && p.id === project.id
        }
        return p.projectSign === project.projectSign
      })
      if (index !== -1) {
        this.projectList[index] = { ...this.projectList[index], ...project }
        return
      }
      this.projectList.push(project)
    },
    setProjectList(projectList: ProjectInfo[]) {
      this.projectList = projectList;
    }
  },
  persist: piniaPersistConfig('appConfig')
})
