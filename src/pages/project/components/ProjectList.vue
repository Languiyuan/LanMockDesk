<template>
  <div
    class="h-full flex flex-col relative overflow-hidden transition-all duration-300"
    :class="{ 'max-w-[400px]': !isCollapsed, 'max-w-[0px]': isCollapsed }"
    :style="{ width: isCollapsed ? '0px' : width + 'px' }"
  >
    <div class="h-16 flex items-center px-4">
      <n-button class="mr-2" text style="font-size: 24px" :focusable="false" @click="showSelectModal = true">
        <n-icon>
          <Add />
        </n-icon>
      </n-button>

      <n-input class="text-left" type="text" placeholder="name or url">
        <template #suffix>
          <n-icon :component="FlashOutline" />
        </template>
      </n-input>
    </div>
    <div
      class="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize bg-[#ccc] hover:bg-[#888] dark:bg-[#444] dark:hover:bg-[#666]"
      @mousedown="startResize"
    ></div>

    <div class="flex-1 overflow-y-auto pr-1 pb-4">
      <n-scrollbar style="height: 100%">
        <ProjectCard
          v-for="item in projectList"
          :key="item.projectSign"
          :info="item"
          :width="width"
          :isCur="!!(curSelProject && curSelProject.projectSign === item.projectSign)"
          :enabled="getProjectEnabled(item)"
          @click="handleSelProject(item)"
          @edit="handleEditProject"
          @delete="handleDeleteProject"
          @toggle-enabled="handleToggleEnabled"
        ></ProjectCard>
      </n-scrollbar>
    </div>
    <SelectProjectModal v-model:show="showSelectModal" @select="handleSelectOption" />
    <CreateProjectModal v-model:show="showCreateModal" :project="editProjectInfo" @confirm="handleAddProject" />
    <LinkProjectModal v-model:show="showLinkModal" @confirm="handleLinkProject" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Add, FlashOutline } from "@vicons/ionicons5";
import { NButton, NInput, NIcon, NScrollbar, useDialog, useMessage } from "naive-ui";
import ProjectCard from "./ProjectCard.vue";
import SelectProjectModal from "./SelectProjectModal.vue";
import CreateProjectModal from "./CreateProjectModal.vue";
import LinkProjectModal from "./LinkProjectModal.vue";
import { ProjectInfo } from "../types";
import { useAppConfig } from "../../../stores/modules/appConfig";
import { storeToRefs } from "pinia";

const props = defineProps<{
  isCollapsed: boolean
}>();

const appConfigStore = useAppConfig();
const { projectList } = storeToRefs(appConfigStore);
const dialog = useDialog();
const message = useMessage();

const curSelProject = ref<ProjectInfo | null>(null);
const emit = defineEmits<{
  (e: "select-project", project: ProjectInfo): void;
}>();
const handleSelProject = (projectInfo: ProjectInfo) => {
  curSelProject.value = projectInfo;
  emit("select-project", projectInfo);
};

const width = ref(400);
const showSelectModal = ref(false);
const showCreateModal = ref(false);
const showLinkModal = ref(false);
const editProjectInfo = ref<ProjectInfo | undefined>(undefined);

const handleAddProject = (project: ProjectInfo) => {
  if (editProjectInfo.value) {
    appConfigStore.updateProject(project);
    editProjectInfo.value = undefined;
  } else {
    appConfigStore.addProject(project);
  }
};

const handleSelectOption = (option: 'create' | 'link') => {
  if (option === 'create') {
    editProjectInfo.value = undefined;
    showCreateModal.value = true;
  }
  if (option === 'link') {
    showLinkModal.value = true;
  }
};

const handleEditProject = (project: ProjectInfo) => {
  editProjectInfo.value = project;
  showCreateModal.value = true;
};

const handleDeleteProject = (project: ProjectInfo) => {
  dialog.warning({
    title: '警告',
    content: '确定删除该项目吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      clearProjectEnabled(project)
      appConfigStore.deleteProject(project);
      if (curSelProject.value?.projectSign === project.projectSign) {
        curSelProject.value = null;
      }
    }
  });
};

const handleLinkProject = (project: ProjectInfo) => {
  appConfigStore.linkProject(project);
  handleSelProject(project);
};

const enabledMap = ref<Record<string, boolean>>({})

const getProjectKey = (project: ProjectInfo) => {
  if (!project.dbPath || !project.id) return ''
  return `${project.dbPath}::${project.id}`
}

const getProjectEnabled = (project: ProjectInfo) => {
  const key = getProjectKey(project)
  if (!key) return false
  return !!enabledMap.value[key]
}

const setProjectEnabled = async (project: ProjectInfo, enabled: boolean) => {
  if (!project.dbPath || !project.id) return
  await window.ipcRenderer.invoke('setProjectEnabled', {
    dbPath: project.dbPath,
    projectId: project.id,
    enabled
  })
}

const clearProjectEnabled = async (project: ProjectInfo) => {
  const key = getProjectKey(project)
  if (key) {
    delete enabledMap.value[key]
  }
  try {
    await setProjectEnabled(project, false)
  } catch {}
}

const handleToggleEnabled = async (project: ProjectInfo, enabled: boolean) => {
  const key = getProjectKey(project)
  if (!key) return
  const prev = !!enabledMap.value[key]
  enabledMap.value[key] = enabled
  try {
    await setProjectEnabled(project, enabled)
  } catch (e) {
    enabledMap.value[key] = prev
    message.error('切换失败')
  }
}
let startX = 0;
let startWidth = 0;

const startResize = (e: MouseEvent) => {
  // 添加禁用文本选择的样式
  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";

  startX = e.clientX;
  startWidth = width.value;
  window.addEventListener("mousemove", resize);
  window.addEventListener("mouseup", stopResize);
};

const resize = (e: MouseEvent) => {
  const newWidth = startWidth + (e.clientX - startX);
  if (newWidth > 200 && newWidth < 400) {
    width.value = newWidth;
  }
};

const stopResize = () => {
  // 移除禁用文本选择的样式
  document.body.style.userSelect = "";
  document.body.style.webkitUserSelect = "";

  window.removeEventListener("mousemove", resize);
  window.removeEventListener("mouseup", stopResize);
};
</script>
