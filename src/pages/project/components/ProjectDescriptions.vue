<template>
  <div class="px-4 py-4 bg-pink">
    <n-descriptions label-placement="left" bordered label-class="w-32" content-style="text-align: left;">
      <n-descriptions-item>
        <template #label>
          <div class="flex items-center">
            <n-icon class="mr-1">
              <ServerOutline />
            </n-icon>
            数据库路径
          </div>
        </template>
        <div 
          class="cursor-pointer hover:text-primary" 
          @click="copyToClipboard(projectInfo?.dbPath)" 
          :title="'点击复制'"
        >
          {{ projectInfo?.dbPath || "-" }}
        </div>
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
        <div 
          class="cursor-pointer hover:text-primary" 
          @click="copyToClipboard(projectInfo?.baseUrl)" 
          :title="'点击复制'"
        >
          {{ projectInfo?.baseUrl || "-" }}
        </div>
      </n-descriptions-item>
    </n-descriptions>
  </div>
</template>

<script setup lang="ts">
import { NDescriptions, NDescriptionsItem, NIcon, useMessage } from "naive-ui";
import { ServerOutline, LinkOutline } from "@vicons/ionicons5";
import type { ProjectInfo } from "../types";

defineProps<{
  projectInfo: ProjectInfo | null;
}>();

const message = useMessage();

const copyToClipboard = (text: string | undefined) => {
  if (!text) return;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      message.success("复制成功");
    })
    .catch(() => {
      message.error("复制失败");
    });
};
</script>
