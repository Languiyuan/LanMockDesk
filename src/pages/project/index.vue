<template>
  <div class="min-w-[900px] min-h-[400px] h-screen flex">
    <div class="flex items-center">
      <ProjectList @select-project="handleSelectProject" :isCollapsed="isCollapsed"></ProjectList>
      <n-tooltip placement="right" trigger="hover">
        <template #trigger>
          <n-button text class="h-24 mt-4 border-l border-[#eee] dark:border-[#333] hover:bg-[#f5f5f5] dark:hover:bg-[#333]" @click="toggleCollapse" :focusable="false">
            <n-icon size="24">
              <component :is="isCollapsed ? ChevronForward : ChevronBack" />
            </n-icon>
          </n-button>
        </template>
        {{ isCollapsed ? '展开' : '收起' }}
      </n-tooltip>
    </div>
    <div class="h-full flex-1 flex flex-col overflow-hidden">
      <div class="flex-shrink-0">
        <ProjectDescriptions :project-info="currentProject"></ProjectDescriptions>
      </div>
      <ApiList></ApiList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NIcon, NTooltip } from 'naive-ui'
import { ChevronBack, ChevronForward } from '@vicons/ionicons5'
import { useLinkDB } from '../../hooks/useLinkDB'
import ProjectList from './components/ProjectList.vue'
import ProjectDescriptions from './components/ProjectDescriptions.vue'
import ApiList from './components/ApiList.vue'
import type { ProjectInfo } from './types'

const { selectedFolderPath, selectedDatabaseFilePath, selectFolder, selectDatabaseFile } = useLinkDB()

const currentProject = ref<ProjectInfo | null>(null)
const isCollapsed = ref(false)

const handleSelectProject = (project: ProjectInfo) => {
  currentProject.value = project
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style lang="scss" scoped></style>