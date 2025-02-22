<template>
  <div class="ml-4 pr-3 pb-2">
    <n-card 
      class="w-full hover:shadow-lg hover:transform hover:scale-105 transition-transform duration-300"
      :style="{ backgroundColor: isCur ? 'rgba(2, 173, 162, 0.6)' : '' }"
    >
      <template #cover>
        <div class="px-2 py-2 cursor-pointer">
          <div class="flex items-center">
            <div :class="['w-3 h-3 rounded-full mr-2', dotColor]"></div>
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
              <n-button text style="font-size: 24px; margin-left: 4px; margin-right: 4px;" @click.stop="() => {}">
                <n-icon>
                  <EllipsisHorizontal />
                </n-icon>
              </n-button>
            </n-dropdown>

            <n-switch v-model:value="active" :disabled="info.status === 3"  @click.stop="() => {}"/>
          </div>

          <div class="flex justify-between mt-4">
            <n-ellipsis class="text-gray-400 text-sm" :style="{ maxWidth: `calc(100% - ${width >= 300 ? 120 : 20}px)` }">
              {{ info.baseUrl }}
            </n-ellipsis>
            <div v-if="width >= 300" class="text-gray-400 text-sm" :title="info.createTime">{{ formatDate(info.createTime) }}</div>
          </div>
        </div>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import type {Component} from 'vue'
import { EllipsisHorizontal, Pencil, TrashOutline  } from '@vicons/ionicons5'
import { NCard, NDropdown, NButton, NIcon, NSwitch, NEllipsis } from 'naive-ui'
import dayjs from 'dayjs'
import { ProjectInfo } from '../types'
function renderIcon(icon: Component) {
  return () => {
    return h(NIcon, null, {
      default: () => h(icon)
    })
  }
}

const props = defineProps<{
  info: ProjectInfo
  isCur: boolean
  width: number
}>()

const dotColor = computed(() => {
  switch (props.info.status) {
    case 1:
      return 'bg-green-500'
    case 2:
      return 'bg-blue-500'
    case 3:
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
})

const options = ref([
  { label: '编辑', key: 'edit', icon: renderIcon(Pencil) },
  { label: '删除', key: 'delete', icon:renderIcon(TrashOutline) },
])

const handleSelect = (key: string) => {
  console.log(key)
}

const formatDate = (date: string) => {
  const now = dayjs()
  const targetDate = dayjs(date)
  if (targetDate.year() === now.year()) {
    return targetDate.format('MM-DD HH:mm:ss')
  }
  return targetDate.format('YYYY-MM-DD')
}

const active = ref(false)
</script>

<style lang="scss" scoped></style>