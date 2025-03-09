<template>
  <n-modal
    v-model:show="props.show"
    preset="card"
    :mask-closable="true"
    :on-mask-click="handleClose"
    style="max-width: 500px; background: transparent !important; box-shadow: none !important"
    :closable="false"
    :title-bar="false"
    :close-on-esc="true"
  >
    <div class="flex justify-center gap-6">
      <n-button
        class="w-44 h-36 flex flex-col items-center justify-center gap-3 rounded-xl shadow-md hover:shadow-lg hover:transform hover:scale-105 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700"
        @click="handleSelectOption('create')"
      >
        <n-icon size="36" class="text-primary">
          <FolderOutline />
        </n-icon>
        <span class="text-lg font-medium">新建项目</span>
      </n-button>
      <n-button
        class="w-44 h-36 flex flex-col items-center justify-center gap-3 rounded-xl shadow-md hover:shadow-lg hover:transform hover:scale-105 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700"
        @click="handleSelectOption('link')"
      >
        <n-icon size="36" class="text-primary">
          <LinkOutline />
        </n-icon>
        <span class="text-lg font-medium">链接项目</span>
      </n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { NModal, NButton, NIcon } from "naive-ui";
import { FolderOutline, LinkOutline } from "@vicons/ionicons5";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "select", option: "create" | "link"): void;
}>();

const handleSelectOption = (option: "create" | "link") => {
  emit("select", option);
  emit("update:show", false);
};

const handleClose = () => {
  emit("update:show", false);
};
</script>
