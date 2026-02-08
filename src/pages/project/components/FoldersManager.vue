<template>
  <n-modal
    v-model:show="props.show"
    preset="card"
    title="目录管理"
    style="width: 600px"
    @close="handleClose"
  >
    <div class="flex gap-2 mb-4">
      <n-input v-model:value="newFolderName" placeholder="输入目录名称" @keyup.enter="handleAdd" />
      <n-button type="primary" :disabled="!newFolderName" :loading="loading" @click="handleAdd">添加</n-button>
    </div>
    
    <n-list bordered hoverable>
      <n-list-item v-for="folder in folders" :key="folder.id">
        <div class="flex items-center justify-between">
          <div v-if="editingId === folder.id" class="flex-1 mr-4">
             <n-input 
               v-model:value="editingName" 
               ref="editInput"
               placeholder="输入目录名称" 
               @blur="handleSaveEdit(folder)" 
               @keyup.enter="handleSaveEdit(folder)"
             />
          </div>
          <div v-else class="flex-1 font-medium">{{ folder.name }}</div>
          
          <div class="flex gap-2">
            <n-button v-if="editingId !== folder.id" size="small" @click="startEdit(folder)">重命名</n-button>
            <n-popconfirm @positive-click="handleDelete(folder)">
              <template #trigger>
                <n-button size="small" type="error">删除</n-button>
              </template>
              确认删除该目录？(该目录下的接口将变为无目录)
            </n-popconfirm>
          </div>
        </div>
      </n-list-item>
      <div v-if="folders.length === 0" class="text-center text-gray-400 py-4">暂无目录</div>
    </n-list>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { NModal, NInput, NButton, NList, NListItem, NPopconfirm, useMessage } from 'naive-ui'
import type { ProjectInfo } from '../types'

const props = defineProps<{
  show: boolean
  projectInfo: ProjectInfo | null
  folders: Array<{id:number, name:string}>
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'update'): void
}>()

const message = useMessage()
const loading = ref(false)
const newFolderName = ref('')
const editingId = ref<number | null>(null)
const editingName = ref('')
const editInput = ref<any>(null)

const handleClose = () => {
  emit('update:show', false)
  editingId.value = null
}

const handleAdd = async () => {
  if (!newFolderName.value || !props.projectInfo) return
  loading.value = true
  try {
    await window.ipcRenderer.invoke('createFolder', {
      dbPath: props.projectInfo.dbPath,
      name: newFolderName.value
    })
    message.success('添加成功')
    newFolderName.value = ''
    emit('update')
  } catch (e) {
    message.error('添加失败')
  } finally {
    loading.value = false
  }
}

const startEdit = (folder: {id:number, name:string}) => {
  editingId.value = folder.id
  editingName.value = folder.name
  nextTick(() => {
     editInput.value?.[0]?.focus()
  })
}

const handleSaveEdit = async (folder: {id:number, name:string}) => {
  if (editingId.value !== folder.id) return
  if (!editingName.value || editingName.value === folder.name) {
    editingId.value = null
    return
  }
  if (!props.projectInfo) return
  
  try {
    await window.ipcRenderer.invoke('updateFolder', {
      dbPath: props.projectInfo.dbPath,
      id: folder.id,
      name: editingName.value
    })
    message.success('修改成功')
    editingId.value = null
    emit('update')
  } catch {
    message.error('修改失败')
  }
}

const handleDelete = async (folder: {id:number}) => {
  if (!props.projectInfo) return
  try {
    await window.ipcRenderer.invoke('deleteFolder', {
      dbPath: props.projectInfo.dbPath,
      id: folder.id
    })
    message.success('删除成功')
    emit('update')
  } catch {
    message.error('删除失败')
  }
}
</script>