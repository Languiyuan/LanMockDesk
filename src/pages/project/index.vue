<template>
  <div class="w-screen h-screen flex">
    <ProjectList @select-project="handleSelectProject"></ProjectList>
    <div class="h-full flex-1 flex flex-col">
      <div class="flex-shrink-0">
        <ProjectDescriptions :project-info="currentProject"></ProjectDescriptions>
      </div>
      <ApiList></ApiList>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { useLinkDB } from '../../hooks/useLinkDB'
import ProjectList from './components/ProjectList.vue'
import ProjectDescriptions from './components/ProjectDescriptions.vue'
import ApiList from './components/ApiList.vue'
import type { ProjectInfo } from './types'

const { selectedFolderPath, selectedDatabaseFilePath, selectFolder, selectDatabaseFile } = useLinkDB()

const currentProject = ref<ProjectInfo | null>(null)

const handleSelectProject = (project: ProjectInfo) => {
  currentProject.value = project
}
</script>

<style lang="scss" scoped></style>