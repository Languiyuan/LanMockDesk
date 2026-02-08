<template>
  <div class="fixed inset-0 bg-white dark:bg-[#1a1a1a] z-50 flex flex-col">
    <div class="flex items-center justify-between px-4 h-14 border-b border-[#eee] dark:border-[#333]">
      <div class="text-lg font-medium">{{ editTitle }}</div>
      <div class="flex items-center gap-2">
        <n-button @click="$emit('close')">关闭</n-button>
        <n-button type="primary" :loading="saving" @click="save">保存</n-button>
      </div>
    </div>
    <div class="flex-1 flex overflow-hidden">
      <div class="w-[50%] border-r border-[#eee] dark:border-[#333] overflow-auto p-4 flex flex-col">
        <n-tabs type="line" animated>
          <n-tab-pane name="request" tab="请求参数">
             <n-scrollbar style="max-height: calc(100vh - 150px)">
                <div v-if="flattenedRequest.length">
                  <n-data-table
                    :columns="paramColumns"
                    :data="flattenedRequest"
                    :row-key="(row) => row.key"
                    :scroll-x="860"
                    :bordered="false"
                    size="small"
                  />
                </div>
                <div v-else class="text-gray-400 text-center py-4">暂无参数</div>
             </n-scrollbar>
          </n-tab-pane>
          <n-tab-pane name="response" tab="返回参数">
             <n-scrollbar style="max-height: calc(100vh - 150px)">
                <div v-if="flattenedResponse.length">
                  <n-data-table
                    :columns="paramColumns"
                    :data="flattenedResponse"
                    :row-key="(row) => row.key"
                    :scroll-x="860"
                    :bordered="false"
                    size="small"
                  />
                </div>
                <div v-else class="text-gray-400 text-center py-4">暂无参数</div>
             </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </div>
      <div class="w-[20%] border-r border-[#eee] dark:border-[#333] overflow-auto p-4">
        <n-form :model="form" label-placement="left" label-width="auto">
          <n-form-item label="Method">
            <n-select v-model:value="form.method" :options="methodOptions" />
          </n-form-item>
          <n-form-item label="URL">
            <n-input v-model:value="form.url" placeholder="/path" />
          </n-form-item>
          <n-form-item label="目录">
            <n-select v-model:value="form.catalogId" :options="dirOptions" clearable placeholder="无目录" />
          </n-form-item>
          <n-form-item label="开启">
            <n-switch v-model:value="form.isOpen" />
          </n-form-item>
          <n-form-item label="延时(ms)">
            <n-input-number v-model:value="form.responseDelay" :min="0" :max="5000" />
          </n-form-item>
        </n-form>
      </div>
      <div class="flex-1 overflow-hidden p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-gray-500">Mock 模板</div>
          <div class="flex items-center gap-2">
            <n-button @click="formatContent">格式化</n-button>
          </div>
        </div>
        <VAceEditor v-model:value="content" lang="json" :theme="aceTheme" style="height: calc(100% - 28px)" :options="aceOptions" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NButton, NForm, NFormItem, NInput, NSelect, NSwitch, NInputNumber, NDataTable, useMessage, NTabs, NTabPane, NScrollbar, NTooltip, NIcon } from 'naive-ui'
import { VAceEditor } from 'vue3-ace-editor'
import { ChevronForward, ChevronDown } from '@vicons/ionicons5'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-chrome'
import 'ace-builds/src-noconflict/theme-twilight'
import beautify from 'js-beautify'
import type { ProjectInfo, ApiInfo } from '../types'
import { useAppConfig } from '../../../stores/modules/appConfig'

const props = defineProps<{
  projectInfo: ProjectInfo | null
  folders: Array<{id:number,name:string}>
  editData: ApiInfo | null
}>()
const emit = defineEmits<{
  (e:'close'): void
  (e:'save', value: any): void
}>()
const message = useMessage()
const appConfigStore = useAppConfig()
const aceTheme = computed(() => appConfigStore.theme === 'darkTheme' ? 'twilight' : 'chrome')

const saving = ref(false)
const content = ref<string>('{}')
const form = ref<any>({
  id: undefined,
  method: 'GET',
  url: '',
  catalogId: null as number | null,
  isOpen: true,
  responseDelay: 0
})
const aceOptions = { useWorker: false }
const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'PATCH', value: 'PATCH' }
]
const dirOptions = computed(() => props.folders.map(f => ({ label: f.name, value: f.id })))
const editTitle = computed(() => form.value.id ? '编辑接口' : '新建接口')

interface ParamRow {
  key: string
  name: string
  in?: string
  type?: string
  required?: boolean
  description?: string
  example?: any
  children?: ParamRow[]
}

const ensureKeys = (list: any[], prefix: string): ParamRow[] => {
  return (list || []).map((item, index) => {
    const key = item?.key ? `${item.key}` : `${prefix}.${index}`
    const children = Array.isArray(item?.children) ? ensureKeys(item.children, key) : undefined
    return { ...item, key, children }
  })
}

const normalizeParamJson = (raw: any): { request: ParamRow[]; response: ParamRow[] } => {
  if (!raw || Array.isArray(raw)) return { request: [], response: [] }
  const request = ensureKeys(Array.isArray(raw.request) ? raw.request : [], 'request')
  const response = ensureKeys(Array.isArray(raw.response) ? raw.response : [], 'response')
  return { request, response }
}

const paramData = ref<{ request: ParamRow[]; response: ParamRow[] }>({ request: [], response: [] })
const isGroupRow = (row: any) => typeof row?.key === 'string' && row.key.startsWith('group.')
const stringifyExamplePretty = (value: any) => {
  if (value === null || typeof value === 'undefined') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return `${value}`
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return `${value}`
  }
}
const stringifyExampleInline = (value: any) => {
  if (value === null || typeof value === 'undefined') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return `${value}`
  try {
    return JSON.stringify(value)
  } catch {
    return `${value}`
  }
}

// --- Indent Rainbow & Tree Logic ---
const indentColors = [
  "rgba(255,255,64,0.07)",
  "rgba(127,255,127,0.07)",
  "rgba(255,127,255,0.07)",
  "rgba(79,236,236,0.07)"
]
const expandedKeys = ref<Set<string>>(new Set())
const toggleExpand = (key: string) => {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
}

// Recursively collect all keys that have children for default expansion
const collectKeysWithChildren = (nodes: ParamRow[], keys: Set<string> = new Set()) => {
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      keys.add(node.key)
      collectKeysWithChildren(node.children, keys)
    }
  })
  return keys
}

const flattenTree = (nodes: ParamRow[], depth = 0, result: any[] = []) => {
  nodes.forEach(node => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedKeys.value.has(node.key)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, ...rest } = node
    result.push({ ...rest, depth, hasChildren, isExpanded })
    if (hasChildren && isExpanded) {
      flattenTree(node.children!, depth + 1, result)
    }
  })
  return result
}
const flattenedRequest = computed(() => flattenTree(paramData.value.request))
const flattenedResponse = computed(() => flattenTree(paramData.value.response))

const paramColumns = [
  { 
    title: '名称', 
    key: 'name', 
    width: 200, 
    className: 'name-column',
    render: (row: any) => {
      // Indentation Blocks
      const indents = []
      for (let i = 0; i < row.depth; i++) {
        indents.push(h('div', {
          class: 'border-l border-gray-200 dark:border-[#333] flex-shrink-0',
          style: {
            width: '16px',
            height: '100%',
            backgroundColor: indentColors[i % 4]
          }
        }))
      }

      // Expander
      const expander = h('div', {
        class: 'flex items-center justify-center cursor-pointer flex-shrink-0',
        style: { width: '20px' },
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          if (row.hasChildren) toggleExpand(row.key)
        }
      }, row.hasChildren ? h(NIcon, null, { default: () => row.isExpanded ? h(ChevronDown) : h(ChevronForward) }) : undefined)

      // Name
      const name = h('div', { class: 'px-1 truncate' }, row.name)

      return h('div', { class: 'flex items-center h-full absolute inset-0' }, [
        ...indents,
        expander,
        name
      ])
    }
  },
  { title: '位置', key: 'in', width: 90, render: (row: any) => isGroupRow(row) ? '' : (row.in || '') },
  { title: '类型', key: 'type', width: 120, render: (row: any) => isGroupRow(row) ? '' : (row.type || '') },
  { title: '必填', key: 'required', width: 60, render: (row: any) => isGroupRow(row) ? '' : (row.required ? '是' : '否') },
  { title: '描述', key: 'description', width: 200, ellipsis: { tooltip: true }, render: (row: any) => isGroupRow(row) ? '' : (row.description || '') },
  { 
    title: '示例', 
    key: 'example', 
    width: 220,
    render: (row: any) => {
      if (isGroupRow(row)) return ''
      const inline = stringifyExampleInline(row.example)
      if (!inline) return ''
      const pretty = stringifyExamplePretty(row.example)
      return h(
        NTooltip,
        { placement: 'top-start', trigger: 'hover', maxWidth: 520 },
        {
          trigger: () =>
            h(
              'div',
              { class: 'font-mono text-xs leading-5 truncate' },
              inline
            ),
          default: () =>
            h(
              'pre',
              { class: 'font-mono text-xs leading-5 whitespace-pre max-w-[520px] m-0' },
              pretty
            )
        }
      )
    }
  }
]

watch(() => props.editData, (val) => {
  if (val) {
    form.value = {
      id: (val as any).id,
      method: (val as any).method || 'GET',
      url: (val as any).url || '',
      catalogId: (val as any).catalogId || null,
      isOpen: !!(val as any).isOpen,
      responseDelay: (val as any).responseDelay || 0
    }
    content.value = (val as any).content || '{}'
    try {
      const p = (val as any).paramJson ? JSON.parse((val as any).paramJson) : { request: [], response: [] }
      paramData.value = normalizeParamJson(p)
      // Auto-expand all nodes with children by default
      expandedKeys.value.clear()
      collectKeysWithChildren(paramData.value.request, expandedKeys.value)
      collectKeysWithChildren(paramData.value.response, expandedKeys.value)
    } catch {
      paramData.value = { request: [], response: [] }
      expandedKeys.value.clear()
    }
  } else {
    form.value = { id: undefined, method: 'GET', url: '', catalogId: null, isOpen: true, responseDelay: 0 }
    content.value = '{}'
    paramData.value = { request: [], response: [] }
    expandedKeys.value.clear()
  }
}, { immediate: true })

const formatContent = () => {
  try {
    const obj = JSON.parse(content.value)
    content.value = beautify.js(JSON.stringify(obj), { indent_size: 2 })
  } catch {
    message.warning('内容不是有效的 JSON，已按文本保持')
  }
}
const save = async () => {
  if (!props.projectInfo?.dbPath || !props.projectInfo?.id) {
    message.warning('请先选择已链接的项目')
    return
  }
  if (!form.value.url) {
    message.warning('请填写 URL')
    return
  }
  saving.value = true
  try {
    const payload: any = {
      id: form.value.id,
      name: form.value.url,
      url: form.value.url,
      method: form.value.method,
      content: content.value,
      responseDelay: form.value.responseDelay,
      isOpen: form.value.isOpen,
      catalogId: form.value.catalogId,
      paramCheckStatus: 'close',
      paramJson: JSON.stringify(paramData.value)
    }
    emit('save', payload)
  } finally {
    saving.value = false
  }
}
</script>
<style scoped>
:deep(.name-column) {
  padding: 0 !important;
  position: relative;
}
</style>
