import { ProjectInfo } from '../../pages/project/types/index';

export interface AppConfig {
  theme: 'darkTheme' | 'lightTheme',
  projectList: ProjectInfo[],
}