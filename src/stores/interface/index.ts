interface ProjectInfo {
  sign: string; // 项目凭证
  create_time: Date; // 创建时间
  update_time: Date; // 更新时间
  base_url: string; // 项目基础链接
  name: string; // 项目名称
  description: string; // 描述
  path: string; // 数据库地址
}

export interface AppConfig {
  theme: 'darkTheme' | 'lightTheme',
  projectList: ProjectInfo[],
}