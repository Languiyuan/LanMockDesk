<template>
  <div
    class="flex flex-col relative overflow-hidden max-w-[400px] min-w-[200px] h-full"
    :style="{ width: width + 'px' }"
  >
    <div class="h-16 flex items-center px-4">
      <n-button class="mr-2" text style="font-size: 24px" :focusable="false">
        <n-icon>
          <Add />
        </n-icon>
      </n-button>

      <n-input placeholder="name or url">
        <template #suffix>
          <n-icon :component="FlashOutline" />
        </template>
      </n-input>
    </div>
    <div
      class="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize bg-[#ccc] hover:bg-[#888]"
      @mousedown="startResize"
    ></div>

    <div class="flex-1 overflow-y-auto pl-4 pr-1 pb-4">
      <n-scrollbar style="height: 100%">
        <ProjectCard
          v-for="item in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
          :key="item"
          :info="{
            projectName: '示例项目示例项目示例项目示例项目示例项目示例项目',
            projectSign: 'example',
            baseUrl: 'http://example.com',
            createTime: '2023-01-01',
            updateTime: '2023-01-01',
            status: 1
          }"
          :width="width"
        ></ProjectCard>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Add, FlashOutline } from '@vicons/ionicons5'
import { NButton, NInput, NIcon, NScrollbar, NCard } from 'naive-ui'
import ProjectCard from './ProjectCard.vue'

const width = ref(400)
let startX = 0
let startWidth = 0

const startResize = (e) => {
  // 添加禁用文本选择的样式
  document.body.style.userSelect = 'none'
  document.body.style.webkitUserSelect = 'none'
  document.body.style.mozUserSelect = 'none'
  document.body.style.msUserSelect = 'none'

  startX = e.clientX
  startWidth = width.value
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize)
}

const resize = (e) => {
  const newWidth = startWidth + (e.clientX - startX)
  if (newWidth > 200 && newWidth < 400) {
    width.value = newWidth
  }
}

const stopResize = () => {
  // 移除禁用文本选择的样式
  document.body.style.userSelect = ''
  document.body.style.webkitUserSelect = ''
  document.body.style.mozUserSelect = ''
  document.body.style.msUserSelect = ''

  window.removeEventListener('mousemove', resize)
  window.removeEventListener('mouseup', stopResize)
}
</script>
