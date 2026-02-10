<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 搜索表单 -->
    <div class="px-4 flex-shrink-0">
      <n-form inline :model="searchForm" class="flex items-center w-full">
          <n-form-item label="接口名称" path="name">
            <n-input v-model:value="searchForm.name" placeholder="请输入接口名称" class="text-left" />
          </n-form-item>
          <n-form-item label="接口URL" path="url">
            <n-input v-model:value="searchForm.url" placeholder="请输入接口URL" class="text-left" />
          </n-form-item>
          <n-form-item label="目录">
            <div class="flex items-center gap-2">
              <n-select
                v-model:value="searchForm.catalogIds"
                multiple
                :options="folderOptions"
                placeholder="选择目录"
                :disabled="!canOperate"
                style="min-width: 220px"
              />
              <n-button size="small" :disabled="!canOperate" @click="showFoldersManager = true">管理</n-button>
            </div>
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="handleSearch" :loading="loading" :disabled="!canOperate">搜索</n-button>
          </n-form-item>
      </n-form>
      
      <!-- 操作按钮行 -->
      <div class="flex justify-end gap-2 mb-2">
         <n-button type="info" @click="openCreateEditor" :disabled="!canOperate">新建接口</n-button>
         <n-button @click="handleImportSwagger" :loading="importLoading" :disabled="!canOperate">导入 Swagger</n-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
      <n-data-table
        :columns="columns"
        :data="tableData"
        :pagination="pagination"
        :bordered="false"
        :scroll-x="1200"
        class="flex-1"
        striped
        flex-height
        :loading="loading"
      />
    </div>
    <FullScreenApiEditor
      v-if="showEditor"
      :project-info="props.projectInfo"
      :folders="folders"
      :edit-data="currentEditApi"
      @close="showEditor=false"
      @save="handleSaveApi"
    />
    <FoldersManager
      v-model:show="showFoldersManager"
      :project-info="props.projectInfo"
      :folders="folders"
      @update="handleFoldersUpdate"
    />
    <SwaggerImportModal
      v-model:show="showImportModal"
      :apis="parsedApis"
      :loading="importModalLoading"
      @confirm="handleConfirmImport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, reactive, onMounted, watch } from 'vue'
import { NForm, NFormItem, NInput, NButton, NDataTable, NSpace, NPopconfirm, useMessage, NSelect } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { ApiInfo, ProjectInfo } from '../types'
import FullScreenApiEditor from './FullScreenApiEditor.vue'

const props = defineProps<{
  projectInfo: ProjectInfo | null
}>()

const message = useMessage()
// 加载状态
const loading = ref(false)
const importLoading = ref(false)

const canOperate = computed(() => !!props.projectInfo?.dbPath && !!props.projectInfo?.id)

import FoldersManager from './FoldersManager.vue'

const showFoldersManager = ref(false)

const handleFoldersUpdate = () => {
  fetchFolders()
  fetchData()
}
const showEditor = ref(false)
const currentEditApi = ref<ApiInfo | null>(null)

const openCreateEditor = () => {
    if (!canOperate.value) {
      message.warning('请先在左侧选择已链接的项目')
      return
    }
    currentEditApi.value = null
    showEditor.value = true
}

// 编辑处理函数
const handleEdit = (row: ApiInfo) => {
  currentEditApi.value = row
  showEditor.value = true
}

const handleSaveApi = async (apiData: any) => {
    if (!canOperate.value) {
      message.warning('请先在左侧选择已链接的项目')
      return
    }
    const projectInfo = props.projectInfo as ProjectInfo
    loading.value = true
    try {
        if (apiData.id) {
            // Update
             await window.ipcRenderer.invoke('updateApi', {
                dbPath: projectInfo.dbPath,
                api: { ...apiData, projectId: projectInfo.id }
            })
            message.success('更新成功')
        } else {
            // Create
            await window.ipcRenderer.invoke('createApi', {
                dbPath: projectInfo.dbPath,
                api: { ...apiData, projectId: projectInfo.id }
            })
            message.success('创建成功')
        }
        await fetchData()
    } catch (e) {
        console.error(e)
        message.error('保存失败')
    } finally {
        loading.value = false
    }
}

import SwaggerImportModal from './SwaggerImportModal.vue'

const showImportModal = ref(false)
const parsedApis = ref<any[]>([])
const importModalLoading = ref(false)

const handleImportSwagger = async () => {
    if (!canOperate.value) {
      message.warning('请先在左侧选择已链接的项目')
      return
    }
    const projectInfo = props.projectInfo as ProjectInfo
    importLoading.value = true
    try {
        const res = await window.ipcRenderer.invoke('pickAndParseSwagger', {
            dbPath: projectInfo.dbPath,
            projectId: projectInfo.id
        })
        if (res.success) {
            parsedApis.value = res.apis.map((a: any, index: number) => ({ ...a, _key: `api-${index}` }))
            showImportModal.value = true
        } else if (res.message !== 'Canceled') {
            message.error(`解析失败: ${res.message}`)
        }
    } catch (e) {
        console.error(e)
        message.error('导入出错')
    } finally {
        importLoading.value = false
    }
}

const handleConfirmImport = async (selectedApis: any[]) => {
    const projectInfo = props.projectInfo as ProjectInfo
    importModalLoading.value = true
    try {
        const res = await window.ipcRenderer.invoke('batchImportApis', {
            dbPath: projectInfo.dbPath,
            apis: JSON.parse(JSON.stringify(selectedApis))
        })
        if (res.success) {
             message.success(`成功导入 ${res.inserted} 个，更新 ${res.updated} 个`)
             showImportModal.value = false
             fetchFolders() // Refresh folders as import might add them
             fetchData()
        } else {
            message.error(`导入失败: ${res.message}`)
        }
    } catch (e) {
        console.error(e)
        message.error('导入出错')
    } finally {
        importModalLoading.value = false
    }
}

// 搜索表单数据
const searchForm = reactive({
  name: '',
  url: '',
  catalogIds: [] as Array<number | 'none'>
})

// 表格数据
const tableData = ref<ApiInfo[]>([])
const folders = ref<Array<{id:number,name:string}>>([])
const folderOptions = computed(() => {
  const opts = folders.value.map(f => ({ label: f.name, value: f.id }))
  return [{ label: '无目录', value: 'none' as const }, ...opts]
})

// 分页配置
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40],
  prefix({ itemCount }: any) {
    return `共 ${itemCount} 条`
  },
  onChange: (page: number) => {
    pagination.page = page
    // fetchData() // Frontend pagination for now as IPC returns all
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    // fetchData()
  }
})

// 表格列配置
const columns: DataTableColumns<ApiInfo> = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    render: (row, index) => index + 1
  },
  {
    title: '名称',
    key: 'name',
    width: 150
  },
  {
    title: '所属目录',
    key: 'catalogId',
    width: 120
    ,
    render: (row) => {
      const f = folders.value.find(f => f.id === (row as any).catalogId)
      return f ? f.name : '无目录'
    }
  },
  {
    title: '请求类型',
    key: 'method',
    width: 100
  },
  {
    title: '请求状态',
    key: 'isOpen',
    width: 100,
    render: (row) => row.isOpen ? '启用' : '禁用'
  },
  {
    title: '接口地址',
    key: 'url',
    width: 200
  },
  {
    title: '接口描述',
    key: 'description',
    width: 200
  },
  {
    title: '创建时间',
    key: 'create_time',
    width: 160
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleEdit(row)
            },
            { default: () => '编辑' }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleDelete(row)
            },
            {
              default: () => '确认删除？',
              trigger: () =>
                h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error'
                  },
                  { default: () => '删除' }
                )
            }
          )
        ]
      })
    }
  }
]

// 获取表格数据
const fetchData = async () => {
  if (!canOperate.value) return
  const projectInfo = props.projectInfo as ProjectInfo
  loading.value = true
  try {
    const res = await window.ipcRenderer.invoke('getApiList', {
      dbPath: projectInfo.dbPath,
      projectId: projectInfo.id
    })
    tableData.value = res
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('获取接口列表失败')
  } finally {
    loading.value = false
  }
}

const fetchFolders = async () => {
  if (!canOperate.value) return
  const projectInfo = props.projectInfo as ProjectInfo
  try {
    const res = await window.ipcRenderer.invoke('getFolders', projectInfo.dbPath)
    folders.value = res || []
  } catch {}
}

watch(() => props.projectInfo, (newVal) => {
  if (newVal) {
    fetchData()
    fetchFolders()
  } else {
    tableData.value = []
    folders.value = []
  }
}, { immediate: true })

// 搜索处理函数
const handleSearch = async () => {
  // Client side filter
  if (!canOperate.value) {
    message.warning('请先在左侧选择已链接的项目')
    return
  }
  const projectInfo = props.projectInfo as ProjectInfo
  loading.value = true
  try {
     const res = await window.ipcRenderer.invoke('getApiList', {
      dbPath: projectInfo.dbPath,
      projectId: projectInfo.id
    })
    tableData.value = res.filter((item: ApiInfo) => {
        const matchName = !searchForm.name || item.name.includes(searchForm.name)
        const matchUrl = !searchForm.url || item.url.includes(searchForm.url)
        const selected = searchForm.catalogIds
        const matchFolder = !selected.length || selected.includes('none') && !item.catalogId || selected.includes(item.catalogId as any)
        return matchName && matchUrl && matchFolder
    })
    pagination.page = 1
  } finally {
      loading.value = false
  }
}

// 删除处理函数
const handleDelete = async (row: ApiInfo) => {
  if (!canOperate.value) {
    message.warning('请先在左侧选择已链接的项目')
    return
  }
  const projectInfo = props.projectInfo as ProjectInfo
  loading.value = true
  try {
    await window.ipcRenderer.invoke('deleteApi', {
        dbPath: projectInfo.dbPath,
        id: row.id
    })
    message.success('删除成功')
    await fetchData()
  } catch(e) {
      message.error('删除失败')
  } finally {
    loading.value = false
  }
}
</script>
