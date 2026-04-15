<template>
  <div class="px-4 py-4">
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
          @click="copyToClipboard(getFullUrl(projectInfo?.projectSign, projectInfo?.baseUrl))" 
          :title="'点击复制'"
        >
          {{ getFullUrl(projectInfo?.projectSign, projectInfo?.baseUrl) }}
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
const SERVER_ORIGIN = 'http://localhost:4399';

const getFullUrl = (projectSign?: string, baseUrl?: string) => {
  if (!projectSign || !baseUrl) return '-';
  const signPrefix = projectSign.startsWith('/') ? projectSign : `/${projectSign}`;
  const basePart = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return `${SERVER_ORIGIN}${signPrefix}${basePart}`;
};

const copyToClipboard = (text: string | undefined) => {
  if (!text || text === '-') return;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      message.success("复制成功");
    })
    .catch(() => {
      message.error("复制失败");
    });
};
</script>
