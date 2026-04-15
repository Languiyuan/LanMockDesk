import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildMockContentFromOperation } from '../electron/main/swaggerMock.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const swaggerPathArg = process.argv[2]
const swaggerPath = swaggerPathArg
  ? path.resolve(process.cwd(), swaggerPathArg)
  : path.resolve(__dirname, '../../testOpenapi.json')

const spec = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'))

const operation = spec?.paths?.['/alarm/getCommonAlarmList']?.post
if (!operation) {
  throw new Error('Missing operation: POST /alarm/getCommonAlarmList')
}

const content = buildMockContentFromOperation(spec, operation)
console.log(content)

const parsed = JSON.parse(content)
if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  throw new Error(`Unexpected mock content root type: ${typeof parsed}`)
}

const requiredKeys = ['code', 'msg', 'type', 'data']
for (const key of requiredKeys) {
  if (!(key in parsed)) throw new Error(`Missing key in mock content: ${key}`)
}

const codeType = typeof (parsed as any).code
if (codeType !== 'string' && codeType !== 'number') {
  throw new Error(`Unexpected code type: ${codeType}`)
}

console.log('SMOKE_OK')
