<template>
  <div
    class="h-full flex flex-col relative overflow-hidden transition-all duration-300"
    :class="{ 'max-w-[400px]': !isCollapsed, 'max-w-[0px]': isCollapsed }"
    :style="{ width: isCollapsed ? '0px' : width + 'px' }"
  >
    <div class="h-16 flex items-center px-4">
      <n-button class="mr-2" text style="font-size: 24px" :focusable="false">
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
      class="absolute right-0 top-0 bottom-0 w-[4px] cursor-ew-resize bg-[#ccc] hover:bg-[#888]"
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
          @click="handleSelProject(item)"
        ></ProjectCard>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Add, FlashOutline } from "@vicons/ionicons5";
import { NButton, NInput, NIcon, NScrollbar } from "naive-ui";
import ProjectCard from "./ProjectCard.vue";
import { ProjectInfo } from "../types";

const props = defineProps<{
  isCollapsed: boolean
}>();

const projectList = ref<ProjectInfo[]>([
  {
    projectName: "示例项目",
    projectSign: "example",
    baseUrl: "http://12.com",
    createTime: "2023-01-01 12:00:00",
    updateTime: "2023-01-01",
    dbPath: "34234",
    status: 1,
  },
  {
    projectName: "示例项目2",
    projectSign: "example2",
    baseUrl: "http://121.com",
    createTime: "2023-01-01 12:00:00",
    updateTime: "2023-01-01",
    status: 2,
  },
]);

const curSelProject = ref<ProjectInfo | null>(null);
const emit = defineEmits<{
  (e: "select-project", project: ProjectInfo): void;
}>();
const handleSelProject = (projectInfo: ProjectInfo) => {
  curSelProject.value = projectInfo;
  emit("select-project", projectInfo);
};

const width = ref(400);
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
