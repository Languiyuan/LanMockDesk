<template>
  <n-modal v-model:show="props.show" preset="card" :mask-closable="false" style="max-width: 700px" @close="handleClose">
    <n-form label-placement="left" label-width="auto" size="medium">
      <n-form-item label="数据库文件">
        <n-input-group>
          <n-input readonly :value="dbPath || ''" placeholder="请选择 .db 文件" />
          <n-button :loading="selecting" @click="handleSelectDb">选择</n-button>
        </n-input-group>
      </n-form-item>
      <n-form-item label="项目">
        <n-select
          v-model:value="selectedProjectId"
          :options="projectOptions"
          placeholder="请选择要链接的项目"
          :disabled="projectOptions.length === 0"
          :loading="loading"
          filterable
        />
      </n-form-item>
    </n-form>
    <template #action>
      <n-space justify="end" style="width: 100%">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" :disabled="!canConfirm" :loading="loading" @click="handleConfirm">链接</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NModal, NForm, NFormItem, NInputGroup, NInput, NButton, NSelect, NSpace, useMessage } from 'naive-ui'
import { useLinkDB } from '../../../hooks/useLinkDB'
import type { ProjectInfo } from '../types'
import { ProjectConnectionStatus } from '../types'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: ProjectInfo): void
}>()

type DbProjectRow = {
  id: number
  sign: string
  name: string
  base_url: string
  create_time?: string
  update_time?: string
}

const message = useMessage()
const { selectedDatabaseFilePath, selectDatabaseFile } = useLinkDB()

const selecting = ref(false)
const loading = ref(false)

const dbPath = computed(() => selectedDatabaseFilePath.value)
const projects = ref<DbProjectRow[]>([])
const selectedProjectId = ref<number | null>(null)

const projectOptions = computed(() =>
  projects.value.map((p) => ({
    label: `${p.name || '-'} (${p.base_url || '-'})`,
    value: p.id
  }))
)

const canConfirm = computed(() => !!dbPath.value && !!selectedProjectId.value)

const handleSelectDb = async () => {
  selecting.value = true
  try {
    await selectDatabaseFile()
    if (!selectedDatabaseFilePath.value) return
    selectedProjectId.value = null
    await loadProjects(selectedDatabaseFilePath.value)
  } finally {
    selecting.value = false
  }
}

const loadProjects = async (dbPath: string) => {
  loading.value = true
  try {
    const res = await window.ipcRenderer.invoke('getProjectList', dbPath)
    const rows = Array.isArray(res) ? (res as DbProjectRow[]) : []
    projects.value = rows
    if (rows.length === 0) {
      message.warning('该数据库中未找到项目，请先创建项目')
    }
  } catch (e) {
    console.error(e)
    projects.value = []
    message.error('读取项目列表失败')
  } finally {
    loading.value = false
  }
}

const handleConfirm = () => {
  if (!dbPath.value || !selectedProjectId.value) return
  const row = projects.value.find((p) => p.id === selectedProjectId.value)
  if (!row) return
  const now = new Date().toISOString()
  const project: ProjectInfo = {
    id: row.id,
    projectName: row.name,
    projectSign: row.sign,
    baseUrl: row.base_url,
    createTime: row.create_time || now,
    updateTime: row.update_time || now,
    status: ProjectConnectionStatus.Connectable,
    dbPath: dbPath.value
  }
  emit('confirm', project)
  handleClose()
}

const handleClose = () => {
  emit('update:show', false)
}
</script>

