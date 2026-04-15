<template>
  <n-modal
    v-model:show="props.show"
    preset="card"
    title="导入确认"
    style="width: 900px; max-height: 80vh;"
    @close="handleClose"
  >
    <div class="flex flex-col gap-4">
      <div class="flex justify-between items-center">
        <div>
          <span class="text-gray-500">解析到 {{ apis.length }} 个接口，其中 {{ duplicatesCount }} 个重复</span>
        </div>
        <div class="flex gap-2">
           <n-button size="small" @click="handleSelectAll(true)">全选</n-button>
           <n-button size="small" @click="handleSelectAll(false)">取消全选</n-button>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="apis"
        :row-key="(row) => row._key"
        :max-height="500"
        @update:checked-row-keys="handleCheck"
        :checked-row-keys="checkedRowKeys"
      />
    </div>

    <template #action>
      <n-space justify="end">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" :disabled="checkedRowKeys.length === 0" :loading="loading" @click="handleConfirm">
          导入选中 ({{ checkedRowKeys.length }})
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NModal, NDataTable, NButton, NSpace, NTag, useMessage } from 'naive-ui'
import type { ApiInfo } from '../types'

// Extend ApiInfo with transient properties for the UI
interface ImportApi extends ApiInfo {
  _key: string
  isDuplicate: boolean
  existingId?: number
}

const props = defineProps<{
  show: boolean
  apis: ImportApi[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'confirm', selectedApis: ImportApi[]): void
}>()

const checkedRowKeys = ref<string[]>([])

const duplicatesCount = computed(() => props.apis.filter(a => a.isDuplicate).length)

// Initialize selection: default select all? Or maybe select non-duplicates?
// Let's select all by default, but duplicates will be highlighted.
watch(() => props.show, (val) => {
  if (val) {
    checkedRowKeys.value = props.apis.map(a => a._key)
  }
})

const columns: any[] = [
  { type: 'selection' },
  { title: '接口名称', key: 'name', width: 200, ellipsis: { tooltip: true } },
  { title: 'Method', key: 'method', width: 80 },
  { title: 'URL', key: 'url', ellipsis: { tooltip: true } },
  { 
    title: '状态', 
    key: 'status', 
    width: 100,
    render(row: ImportApi) {
      if (row.isDuplicate) {
        return h(NTag, { type: 'warning', size: 'small' }, { default: () => '重复(覆盖)' })
      }
      return h(NTag, { type: 'success', size: 'small' }, { default: () => '新增' })
    }
  }
]

import { h } from 'vue'
import type { RowKey } from 'naive-ui/es/data-table/src/interface'

const handleCheck = (keys: RowKey[]) => {
  checkedRowKeys.value = keys as string[]
}

const handleSelectAll = (select: boolean) => {
  if (select) {
    checkedRowKeys.value = props.apis.map(a => a._key)
  } else {
    checkedRowKeys.value = []
  }
}

const handleClose = () => {
  emit('update:show', false)
}

const handleConfirm = () => {
  const selected = props.apis.filter(a => checkedRowKeys.value.includes(a._key))
  emit('confirm', selected)
}
</script>