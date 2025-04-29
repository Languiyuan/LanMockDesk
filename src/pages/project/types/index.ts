/** 项目连接状态枚举 */
export enum ProjectConnectionStatus {
  /** 已连接 */
  Connected = 1,
  /** 可连接 */
  Connectable = 2,
  /** 不可连接 */
  Disconnected = 3
}

export interface ProjectInfo {
  projectName: string
  projectSign: string
  baseUrl: string
  createTime: string
  updateTime: string
  /** 项目连接状态: 1-已连接 | 2-可连接 | 3-不可连接 */
  status: ProjectConnectionStatus
  dbPath?: string
}

export interface ApiInfo {
  id: number
  projectId: number
  catalogId: number
  name: string
  url: string
  content: string
  type: string
  responseDelay: number
  description: string
  isOpen: boolean
  isDeleted: boolean
  create_time: string
  update_time: string
  paramCheckStatus: string
  paramJson: string
}