<template>
  <n-modal v-model:show="props.show" preset="card" :mask-closable="false" style="max-width: 500px;" @close="handleClose">
    <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="auto" require-mark-placement="right-hanging" size="medium">
      <n-form-item label="项目名称" path="projectName">
        <n-input v-model:value="formValue.projectName" placeholder="请输入项目名称" />
      </n-form-item>
      <n-form-item label="根地址" path="baseUrl">
        <n-input v-model:value="formValue.baseUrl" placeholder="请输入baseUrl" />
      </n-form-item>

      
      <n-form-item label="数据库地址" path="dbPath">
        <n-input-group>
          <n-input readonly v-model:value="formValue.dbPath" placeholder="请选择数据库地址" />
          <n-button @click="handleSelectFolder">
            <template #icon>
              <n-icon><folder-outline /></n-icon>
            </template>
          </n-button>
        </n-input-group>
      </n-form-item>
    </n-form>
    <template #action>
      <n-space justify="end" style="width: 100%">
        <n-button type="primary" :loading="loading" @click="handleConfirm">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NSpace, NIcon, NInputGroup, FormInst, FormRules, FormItemRule } from 'naive-ui'
import { FolderOutline } from '@vicons/ionicons5'
import type { ProjectInfo } from '../types'
import { useLinkDB } from '../../../hooks/useLinkDB'

const props = defineProps<{
  show: boolean
  project?: ProjectInfo
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: ProjectInfo): void
}>()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formValue = reactive({
  projectName: '',
  baseUrl: '',
  dbPath: ''
})

watch(() => props.show, (val) => {
  if (val) {
    if (props.project) {
      formValue.projectName = props.project.projectName
      formValue.baseUrl = props.project.baseUrl
      formValue.dbPath = props.project.dbPath || ''
    } else {
      formValue.projectName = ''
      formValue.baseUrl = ''
      formValue.dbPath = ''
    }
  }
})

const rules: FormRules = {
  projectName: [
    { required: true, message: '请输入项目名称', trigger: ['blur', 'input'] },
    { max: 200, message: '项目名称不能超过200个字符', trigger: ['blur', 'input'] }
  ],
  baseUrl: [
    { required: true, message: '请输入项目根地址', trigger: ['blur', 'input'] },
    { max: 200, message: '根地址不能超过200个字符', trigger: ['blur', 'input'] },
    { pattern: /^\/[^\/]*$/, message: '根地址必须以/开头且只能包含一个/', trigger: ['blur', 'input'] }
  ],
  dbPath: [
    { required: true, message: '请选择数据库地址', trigger: ['blur', 'input'] },
    {
      validator: (rule: FormItemRule, value: string) => {
        if (!value) return true;
        return true;
      },
      trigger: ['blur', 'input']
    }
  ]
}

const handleClose = () => {
  emit('update:show', false)
}

const { selectedFolderPath, selectedDatabaseFilePath, selectFolder, generateRandomString } = useLinkDB()

const handleSelectFolder = async () => {
  await selectFolder()
  if (selectedDatabaseFilePath.value) {
    formValue.dbPath = selectedDatabaseFilePath.value
  }
}

const handleConfirm = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      loading.value = true
      let projectInfo: ProjectInfo;
      
      if (props.project) {
         projectInfo = {
          ...props.project,
          ...formValue,
          updateTime: new Date().toISOString()
        }
      } else {
        projectInfo = {
          ...formValue,
          projectSign: generateRandomString(20),
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          status: 1
        }
      }
      
      emit('confirm', projectInfo)
      loading.value = false
      handleClose()
    }
  })
}
</script>