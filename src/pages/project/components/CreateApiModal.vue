<template>
  <n-modal v-model:show="props.show" preset="card" :mask-closable="false" style="max-width: 600px;" @close="handleClose" :title="isEdit ? '编辑接口' : '新建接口'">
    <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="auto" require-mark-placement="right-hanging" size="medium">
      <n-form-item label="接口名称" path="name">
        <n-input v-model:value="formValue.name" placeholder="请输入接口名称" />
      </n-form-item>
      <n-form-item label="接口URL" path="url">
        <n-input v-model:value="formValue.url" placeholder="请输入接口URL (例如 /users)" />
      </n-form-item>
      <n-form-item label="请求方法" path="method">
        <n-select v-model:value="formValue.method" :options="methodOptions" />
      </n-form-item>
      <n-form-item label="响应延迟(ms)" path="responseDelay">
        <n-input-number v-model:value="formValue.responseDelay" :min="0" />
      </n-form-item>
      <n-form-item label="是否启用" path="isOpen">
        <n-switch v-model:value="formValue.isOpen" />
      </n-form-item>
      <n-form-item label="Mock响应(JSON)" path="content">
        <n-input
          v-model:value="formValue.content"
          type="textarea"
          placeholder="请输入JSON格式的Mock数据"
          :autosize="{ minRows: 5, maxRows: 10 }"
        />
      </n-form-item>
    </n-form>
    <template #action>
      <n-space justify="end" style="width: 100%">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleConfirm">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NSpace, NSelect, NInputNumber, NSwitch, FormInst, FormRules } from 'naive-ui'
import type { ApiInfo } from '../types'

const props = defineProps<{
  show: boolean
  editData?: ApiInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: any): void
}>()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const isEdit = computed(() => !!props.editData)

const formValue = reactive({
  id: 0,
  name: '',
  url: '',
  method: 'GET',
  responseDelay: 0,
  isOpen: true,
  content: '{}'
})

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' }
]

const rules: FormRules = {
  name: [{ required: true, message: '请输入接口名称', trigger: ['blur', 'input'] }],
  url: [{ required: true, message: '请输入接口URL', trigger: ['blur', 'input'] }],
  method: [{ required: true, message: '请选择请求方法', trigger: ['blur', 'change'] }],
  content: [
      { 
          validator: (rule, value) => {
              try {
                  JSON.parse(value)
                  return true
              } catch (e) {
                  return new Error('请输入有效的JSON')
              }
          },
          trigger: ['blur', 'input']
      }
  ]
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.editData) {
      Object.assign(formValue, props.editData)
    } else {
      formValue.id = 0
      formValue.name = ''
      formValue.url = ''
      formValue.method = 'GET'
      formValue.responseDelay = 0
      formValue.isOpen = true
      formValue.content = '{}'
    }
  }
})

const handleClose = () => {
  emit('update:show', false)
}

const handleConfirm = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      loading.value = true
      emit('confirm', { ...formValue })
      loading.value = false
      handleClose()
    }
  })
}
</script>
