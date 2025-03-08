<template>
  <div class="flex-1 flex flex-col">
    <!-- 搜索表单 -->
    <div class="px-4">
      <n-form inline :model="searchForm" class="flex items-center justify-between w-full">
        <div class="flex items-center gap-4">
          <n-form-item label="接口名称" path="name">
            <n-input v-model:value="searchForm.name" placeholder="请输入接口名称" class="text-left" />
          </n-form-item>
          <n-form-item label="接口URL" path="url">
            <n-input v-model:value="searchForm.url" placeholder="请输入接口URL" class="text-left" />
          </n-form-item>
        </div>
        <n-form-item>
          <n-button type="primary" @click="handleSearch" :loading="loading">搜索</n-button>
        </n-form-item>
      </n-form>
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 p-4 overflow-auto">
      <n-data-table
        :columns="columns"
        :data="tableData"
        :pagination="pagination"
        :bordered="false"
        :scroll-x="1200"
        style="height: 100%"
        striped
        flex-height
        :loading="loading"
        remote
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted } from 'vue'
import { NForm, NFormItem, NInput, NButton, NDataTable, NSpace, NPopconfirm } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { ApiInfo } from '../types'

// 加载状态
const loading = ref(false)

// 搜索表单数据
const searchForm = reactive({
  name: '',
  url: ''
})

// 表格数据
const tableData = ref<ApiInfo[]>([])

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
    fetchData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    fetchData()
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
  },
  {
    title: '请求类型',
    key: 'type',
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
  loading.value = true
  try {
    // 模拟异步请求
    await new Promise(resolve => setTimeout(resolve, 1000))
    // TODO: 实现实际的数据获取逻辑
    tableData.value = []
    // 更新总数
    pagination.itemCount = 100 // 这里应该是实际的数据总数
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索处理函数
const handleSearch = async () => {
  pagination.page = 1
  await fetchData()
}

// 编辑处理函数
const handleEdit = (row: ApiInfo) => {
  // TODO: 实现编辑逻辑
  console.log('edit:', row)
}

// 删除处理函数
const handleDelete = async (row: ApiInfo) => {
  loading.value = true
  try {
    // TODO: 实现删除逻辑
    console.log('delete:', row)
    await fetchData()
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchData()
})
</script>