<template>
  <div class="px-4 py-4 bg-pink">
    <n-descriptions label-placement="left" bordered label-class="w-32">
      <n-descriptions-item>
        <template #label>
          <div class="flex items-center">
            <n-icon class="mr-1">
              <ServerOutline />
            </n-icon>
            数据库路径
          </div>
        </template>
        {{ projectInfo?.dbPath || "-" }}
      </n-descriptions-item>
      <n-descriptions-item>
        <template #label>
          <div class="flex items-center">
            <n-icon class="mr-1">
              <LinkOutline />
            </n-icon>
            项目根地址
          </div>
        </template>
        {{ projectInfo?.baseUrl || "-" }}
      </n-descriptions-item>
    </n-descriptions>
  </div>
</template>

<script setup lang="ts">
import { NDescriptions, NDescriptionsItem, NIcon } from "naive-ui";
import { ServerOutline, LinkOutline } from "@vicons/ionicons5";
import type { ProjectInfo } from "../types";

defineProps<{
  projectInfo: ProjectInfo | null;
}>();
</script>
