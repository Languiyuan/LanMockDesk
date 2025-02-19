<template>
  <div class="pr-3 pb-2">
    <n-card class="w-full">
      <template #cover>
        <div class="px-2 py-2">
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <n-ellipsis
              class="flex-1 text-left"
              :style="{ maxWidth: 'calc(100% - 80px)' }"
            >
              {{ info.projectName }}
            </n-ellipsis>
            <n-dropdown
              trigger="hover"
              :options="options"
              @select="handleSelect"
            >
              <n-button text style="font-size: 24px; margin-left: 4px; margin-right: 4px;">
                <n-icon>
                  <EllipsisHorizontal />
                </n-icon>
              </n-button>
            </n-dropdown>

            <n-switch v-model:value="active" />
          </div>

          <div class="flex justify-between mt-4">
            <n-ellipsis class="text-gray-400 text-sm" :style="{ maxWidth: `calc(100% - ${width >= 300 ? 120 : 20}px)` }">
              {{ info.baseUrl }}
            </n-ellipsis>
            <div v-if="width >= 300" class="text-gray-400 text-sm">{{ info.createTime }}</div>
          </div>
        </div>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EllipsisHorizontal } from '@vicons/ionicons5'
import { NCard, NDropdown, NButton, NIcon, NSwitch, NEllipsis } from 'naive-ui'

interface Info {
  projectName: string
  projectSign: string
  baseUrl: string
  createTime: string
  updateTime: string
  status: number
}

const props = defineProps<{
  info: Info
  width: number
}>()

const options = ref([
  { label: '编辑', key: 'edit' },
  { label: '删除', key: 'delete' },
])

const handleSelect = (key: string) => {
  console.log(key)
}

const active = ref(false)
</script>

<style lang="scss" scoped></style>