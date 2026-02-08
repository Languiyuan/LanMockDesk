type ProjectKeyInput = {
  dbPath: string
  projectId: number
}

const enabledProjectKeys = new Set<string>()

export function getProjectKey(input: ProjectKeyInput) {
  return `${input.dbPath}::${input.projectId}`
}

export function isProjectEnabled(input: ProjectKeyInput) {
  return enabledProjectKeys.has(getProjectKey(input))
}

export function setProjectEnabled(input: ProjectKeyInput, enabled: boolean) {
  const key = getProjectKey(input)
  if (enabled) {
    enabledProjectKeys.add(key)
    return
  }
  enabledProjectKeys.delete(key)
}

