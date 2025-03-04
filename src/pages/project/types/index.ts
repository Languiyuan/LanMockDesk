export interface ProjectInfo {
  projectName: string
  projectSign: string
  baseUrl: string
  createTime: string
  updateTime: string
  status: number
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