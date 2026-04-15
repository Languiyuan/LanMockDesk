type AnyObject = Record<string, any>

export type ParamLocation = 'path' | 'query' | 'header' | 'cookie' | 'body' | 'formData' | 'response'

export interface ParamRow {
  key: string
  name: string
  in?: ParamLocation | string
  type?: string
  required?: boolean
  description?: string
  example?: any
  children?: ParamRow[]
}

const MAX_SCHEMA_DEPTH = 16
const MAX_PARAM_TREE_DEPTH = 10

function isObject(value: unknown): value is AnyObject {
  return !!value && typeof value === 'object'
}

function normalizePointerSegment(seg: string) {
  return seg.replace(/~1/g, '/').replace(/~0/g, '~')
}

function getByJsonPointer(root: any, pointer: string): any {
  if (!pointer.startsWith('#/')) return undefined
  const parts = pointer
    .slice(2)
    .split('/')
    .filter(Boolean)
    .map(normalizePointerSegment)
  let cur: any = root
  for (const p of parts) {
    if (!isObject(cur) && !Array.isArray(cur)) return undefined
    cur = (cur as any)[p]
    if (typeof cur === 'undefined') return undefined
  }
  return cur
}

function normalizeSlashPath(input: string) {
  const v = `${input || ''}`.trim()
  if (!v) return ''
  if (v === '/') return '/'
  return v.startsWith('/') ? v : `/${v}`
}

function joinPath(a: string, b: string) {
  const left = normalizeSlashPath(a)
  const right = normalizeSlashPath(b)
  if (!left || left === '/') return right || '/'
  if (!right || right === '/') return left || '/'
  return `${left.replace(/\/+$/, '')}/${right.replace(/^\/+/, '')}`
}

function deepMerge(target: any, source: any): any {
  if (!isObject(source)) return target
  const out: AnyObject = isObject(target) ? { ...target } : {}
  for (const [k, v] of Object.entries(source)) {
    if (k === 'properties' && isObject(v) && isObject(out.properties)) {
      out.properties = { ...out.properties, ...v }
      continue
    }
    if (k === 'required' && Array.isArray(v) && Array.isArray(out.required)) {
      out.required = Array.from(new Set([...out.required, ...v]))
      continue
    }
    if (isObject(v) && isObject((out as any)[k])) {
      ;(out as any)[k] = deepMerge((out as any)[k], v)
      continue
    }
    ;(out as any)[k] = v
  }
  return out
}

function resolveRef(spec: AnyObject, ref: string): any {
  if (!ref || typeof ref !== 'string') return undefined
  if (!ref.startsWith('#/')) return undefined
  return getByJsonPointer(spec, ref)
}

function dereferenceSchema(spec: AnyObject, schema: any, ctx: { depth: number; seen: Set<string> }): any {
  if (!schema || !isObject(schema)) return schema
  if (ctx.depth > 40) return schema

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref
    if (ctx.seen.has(ref)) return schema
    ctx.seen.add(ref)
    const resolved = resolveRef(spec, ref)
    if (!resolved) return schema
    const { $ref, ...rest } = schema as AnyObject
    const merged = deepMerge(resolved, rest)
    return dereferenceSchema(spec, merged, { depth: ctx.depth + 1, seen: ctx.seen })
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length) {
    let merged: AnyObject = {}
    for (const item of schema.allOf) {
      merged = deepMerge(merged, dereferenceSchema(spec, item, { depth: ctx.depth + 1, seen: ctx.seen }))
    }
    const { allOf, ...rest } = schema as AnyObject
    merged = deepMerge(merged, rest)
    return dereferenceSchema(spec, merged, { depth: ctx.depth + 1, seen: ctx.seen })
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    const [first] = schema.oneOf
    const { oneOf, ...rest } = schema as AnyObject
    const merged = deepMerge(dereferenceSchema(spec, first, { depth: ctx.depth + 1, seen: ctx.seen }), rest)
    return dereferenceSchema(spec, merged, { depth: ctx.depth + 1, seen: ctx.seen })
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    const [first] = schema.anyOf
    const { anyOf, ...rest } = schema as AnyObject
    const merged = deepMerge(dereferenceSchema(spec, first, { depth: ctx.depth + 1, seen: ctx.seen }), rest)
    return dereferenceSchema(spec, merged, { depth: ctx.depth + 1, seen: ctx.seen })
  }

  const out: AnyObject = { ...schema }
  if (out.items) out.items = dereferenceSchema(spec, out.items, { depth: ctx.depth + 1, seen: ctx.seen })
  if (out.properties && isObject(out.properties)) {
    const props: AnyObject = {}
    for (const [k, v] of Object.entries(out.properties)) {
      props[k] = dereferenceSchema(spec, v, { depth: ctx.depth + 1, seen: ctx.seen })
    }
    out.properties = props
  }
  if (isObject(out.additionalProperties)) {
    out.additionalProperties = dereferenceSchema(spec, out.additionalProperties, { depth: ctx.depth + 1, seen: ctx.seen })
  }
  return out
}

function inferSchema(input: any): any {
  if (!input || !isObject(input)) return input
  let schema: any = input
  if ((schema as AnyObject).schema) schema = (schema as AnyObject).schema
  if ((schema as AnyObject).properties && !(schema as AnyObject).type) schema.type = 'object'
  return schema
}

function getSchemaRef(schema: any): string | undefined {
  if (!schema || !isObject(schema)) return undefined
  const ref = (schema as AnyObject).$ref
  return typeof ref === 'string' ? ref : undefined
}

function inferType(schema: any): string {
  if (!schema || !isObject(schema)) return ''
  if (typeof schema.type === 'string' && schema.type) return schema.type
  if (schema.properties) return 'object'
  if (schema.items) return 'array'
  return ''
}

function extractExample(schema: any): any {
  if (!schema || !isObject(schema)) return undefined
  if (typeof schema.example !== 'undefined') return schema.example
  if (typeof schema.default !== 'undefined') return schema.default
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
  return undefined
}

function typeToString(schema: any, spec: AnyObject, refStack?: Set<string>, depth: number = 0): string {
  if (depth > MAX_SCHEMA_DEPTH) return inferType(schema)
  const schema0 = inferSchema(schema)
  const ref = getSchemaRef(schema0)
  if (ref && refStack && refStack.has(ref)) return 'object'
  const resolved = dereferenceSchema(spec, schema0, { depth: 0, seen: refStack ? new Set(refStack) : new Set() })
  const type = inferType(resolved)
  const format = resolved?.format ? `${resolved.format}` : ''
  if (type === 'array') {
    const itemType = typeToString(resolved?.items, spec, refStack, depth + 1)
    return itemType ? `array<${itemType}>` : 'array'
  }
  if (!type) return ''
  return format ? `${type}(${format})` : type
}

function schemaToRows(
  spec: AnyObject,
  schemaInput: any,
  ctx: { keyPrefix: string; required?: Set<string> },
  trace: { depth: number; refStack: Set<string> }
): ParamRow[] {
  if (trace.depth > MAX_PARAM_TREE_DEPTH) return []
  const schema0 = inferSchema(schemaInput)
  const ref = getSchemaRef(schema0)
  if (ref && trace.refStack.has(ref)) return []
  const schema = dereferenceSchema(spec, schema0, { depth: 0, seen: new Set(trace.refStack) })
  if (ref) trace.refStack.add(ref)
  if (!schema || !isObject(schema)) {
    if (ref) trace.refStack.delete(ref)
    return []
  }

  const type = inferType(schema)
  if (type === 'object') {
    const requiredSet = new Set<string>(Array.isArray(schema.required) ? schema.required : [])
    const props = isObject(schema.properties) ? schema.properties : {}
    const rows: ParamRow[] = []
    for (const [name, propSchema] of Object.entries(props)) {
      const resolvedProp = dereferenceSchema(spec, inferSchema(propSchema), { depth: 0, seen: new Set(trace.refStack) })
      const propType = typeToString(resolvedProp, spec, trace.refStack, trace.depth)
      const rowKey = `${ctx.keyPrefix}.${name}`
      const row: ParamRow = {
        key: rowKey,
        name,
        type: propType,
        required: requiredSet.has(name),
        description: resolvedProp?.description || '',
        example: extractExample(resolvedProp)
      }
      const childType = inferType(resolvedProp)
      if (childType === 'object') {
        const children = schemaToRows(spec, resolvedProp, { keyPrefix: rowKey, required: requiredSet }, { depth: trace.depth + 1, refStack: trace.refStack })
        if (children.length) row.children = children
      } else if (childType === 'array') {
        const items = resolvedProp?.items
        const itemsKey = `${rowKey}[]`
        const itemsRows = schemaToRows(spec, items, { keyPrefix: itemsKey }, { depth: trace.depth + 1, refStack: trace.refStack })
        if (itemsRows.length) {
          row.children = [
            {
              key: itemsKey,
              name: 'items',
              type: typeToString(items, spec, trace.refStack, trace.depth + 1),
              required: false,
              description: resolvedProp?.items?.description || '',
              example: extractExample(resolvedProp?.items),
              children: itemsRows
            }
          ]
        }
      }
      rows.push(row)
    }
    if (ref) trace.refStack.delete(ref)
    return rows
  }

  if (type === 'array') {
    const items = schema.items
    const itemsKey = `${ctx.keyPrefix}[]`
    const itemsRows = schemaToRows(spec, items, { keyPrefix: itemsKey }, { depth: trace.depth + 1, refStack: trace.refStack })
    if (!itemsRows.length) return []
    if (ref) trace.refStack.delete(ref)
    return [
      {
        key: itemsKey,
        name: 'items',
        type: typeToString(items, spec, trace.refStack, trace.depth + 1),
        required: false,
        description: schema?.items?.description || '',
        example: extractExample(schema?.items),
        children: itemsRows
      }
    ]
  }

  if (ref) trace.refStack.delete(ref)
  return []
}

function primitiveSample(schema: AnyObject): any {
  const type = schema.type
  const format = schema.format

  if (typeof schema.example !== 'undefined') return schema.example
  if (typeof schema.default !== 'undefined') return schema.default
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]

  const key = format ? `${type}_${format}` : `${type}`
  const mapping: Record<string, any> = {
    string: '@string',
    string_email: '@email',
    'string_date-time': '@datetime',
    number: '@integer(60, 100)',
    number_float: '@float(60, 100, 3, 5)',
    integer: '@integer(60, 100)',
    boolean: '@boolean'
  }
  return mapping[key] ?? mapping[type] ?? '@string'
}

function sampleFromSchema(spec: AnyObject, schemaInput: any, ctx: { depth: number; refStack: Set<string> }): any {
  if (!schemaInput) return undefined
  if (ctx.depth > MAX_SCHEMA_DEPTH) return undefined
  const schema0 = inferSchema(schemaInput)
  const ref = getSchemaRef(schema0)
  if (ref && ctx.refStack.has(ref)) return undefined
  const schema = dereferenceSchema(spec, schema0, { depth: 0, seen: new Set(ctx.refStack) })
  if (ref) ctx.refStack.add(ref)
  if (!schema || !isObject(schema)) {
    if (ref) ctx.refStack.delete(ref)
    return undefined
  }
  if (
    typeof (schema as AnyObject).$ref === 'string' &&
    !schema.type &&
    !schema.properties &&
    !schema.items &&
    !schema.allOf &&
    !schema.oneOf &&
    !schema.anyOf
  ) {
    if (ref) ctx.refStack.delete(ref)
    return {}
  }

  if (typeof schema.example !== 'undefined') return schema.example
  if (typeof schema.default !== 'undefined') return schema.default
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]

  let type = schema.type
  if (!type) {
    if (schema.properties) type = 'object'
    else if (schema.items) type = 'array'
  }

  if (type === 'object') {
    const obj: AnyObject = {}
    const props = isObject(schema.properties) ? schema.properties : {}
    for (const [name, subSchema] of Object.entries(props)) {
      obj[name] = sampleFromSchema(spec, subSchema, { depth: ctx.depth + 1, refStack: ctx.refStack })
    }
    if (schema.additionalProperties === true) {
      obj.additionalProp1 = {}
    } else if (isObject(schema.additionalProperties)) {
      const val = sampleFromSchema(spec, schema.additionalProperties, { depth: ctx.depth + 1, refStack: ctx.refStack })
      for (let i = 1; i < 4; i++) obj[`additionalProp${i}`] = val
    }
    if (ref) ctx.refStack.delete(ref)
    return obj
  }

  if (type === 'array') {
    if (schema.items) return [sampleFromSchema(spec, schema.items, { depth: ctx.depth + 1, refStack: ctx.refStack })]
    if (ref) ctx.refStack.delete(ref)
    return []
  }

  if (type === 'file') {
    if (ref) ctx.refStack.delete(ref)
    return undefined
  }

  if (ref) ctx.refStack.delete(ref)
  return primitiveSample(schema)
}

function getOAS3ResponseSchema(spec: AnyObject, response: AnyObject): any {
  const content = response.content
  if (!content || !isObject(content)) return undefined
  const json = (content as AnyObject)['application/json']
  if (json && isObject(json) && (json as AnyObject).schema) return (json as AnyObject).schema
  const first = Object.values(content)[0]
  if (first && isObject(first) && (first as AnyObject).schema) return (first as AnyObject).schema
  return undefined
}

function getOAS3RequestBodySchema(spec: AnyObject, requestBody: AnyObject): any {
  const content = requestBody.content
  if (!content || !isObject(content)) return undefined
  const json = (content as AnyObject)['application/json']
  if (json && isObject(json) && (json as AnyObject).schema) return (json as AnyObject).schema
  const first = Object.values(content)[0]
  if (first && isObject(first) && (first as AnyObject).schema) return (first as AnyObject).schema
  return undefined
}

function getOAS3ResponseExplicitExample(response: AnyObject): any {
  const content = response.content
  if (!content || !isObject(content)) return undefined
  const json = (content as AnyObject)['application/json']
  if (json && isObject(json)) {
    if (typeof (json as AnyObject).example !== 'undefined') return (json as AnyObject).example
    const examples = (json as AnyObject).examples
    if (isObject(examples)) {
      const first = Object.values(examples)[0] as any
      if (first && typeof first.value !== 'undefined') return first.value
    }
  }
  const first = Object.values(content)[0] as any
  if (first && isObject(first)) {
    if (typeof first.example !== 'undefined') return first.example
    if (isObject(first.examples)) {
      const ex = Object.values(first.examples)[0] as any
      if (ex && typeof ex.value !== 'undefined') return ex.value
    }
  }
  return undefined
}

function getSwagger2ResponseExplicitExample(response: AnyObject): any {
  if (typeof response.example !== 'undefined') return response.example
  const examples = response.examples
  if (isObject(examples)) {
    const json = examples['application/json']
    if (typeof json !== 'undefined') return json
    const first = Object.values(examples)[0]
    return first
  }
  return undefined
}

function selectSuccessResponse(responses: AnyObject) {
  if (!responses) return undefined
  return (
    responses['200'] ||
    responses['201'] ||
    responses['default'] ||
    Object.entries(responses).find(([k]) => /^\d+$/.test(k) && k.startsWith('2'))?.[1] ||
    Object.values(responses)[0]
  )
}

export function buildResponseParamTree(spec: AnyObject, operation: AnyObject): ParamRow[] {
  const responses = operation.responses
  if (!responses || !isObject(responses)) return []
  const success = selectSuccessResponse(responses as AnyObject) as AnyObject | undefined
  if (!success) return []
  const isOAS3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3')
  const schema = isOAS3 ? getOAS3ResponseSchema(spec, success) : inferSchema(success)
  const resolved = dereferenceSchema(spec, inferSchema(schema), { depth: 0, seen: new Set() })
  const type = typeToString(resolved, spec, new Set(), 0)
  const rootKey = 'response.root'
  const root: ParamRow = {
    key: rootKey,
    name: 'root',
    in: 'response',
    type: type || inferType(resolved),
    required: true,
    description: success.description || resolved?.description || '',
    example: extractExample(resolved)
  }
  const children = schemaToRows(spec, resolved, { keyPrefix: rootKey }, { depth: 0, refStack: new Set() })
  if (children.length) root.children = children
  return [root]
}

export function buildRequestParamTree(spec: AnyObject, operation: AnyObject): ParamRow[] {
  const rows: ParamRow[] = []
  const isOAS3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3')

  const params = Array.isArray(operation.parameters) ? operation.parameters : []
  const groups: Record<string, ParamRow[]> = { path: [], query: [], header: [], cookie: [], body: [], formData: [] }

  for (const p of params) {
    if (!p || !isObject(p)) continue
    const location = p.in || ''
    const required = !!p.required
    const description = p.description || ''

    if (!isOAS3 && location === 'body') {
      const schema = p.schema
      const resolved = dereferenceSchema(spec, inferSchema(schema), { depth: 0, seen: new Set() })
      const key = `body.${p.name || 'body'}`
      const bodyRow: ParamRow = {
        key,
        name: p.name || 'body',
        in: 'body',
        type: typeToString(resolved, spec, new Set(), 0) || inferType(resolved) || 'object',
        required,
        description,
        example: extractExample(resolved)
      }
      const children = schemaToRows(spec, resolved, { keyPrefix: key }, { depth: 0, refStack: new Set() })
      if (children.length) bodyRow.children = children
      groups.body.push(bodyRow)
      continue
    }

    const schema = isOAS3 ? (p.schema || undefined) : p
    const resolved = dereferenceSchema(spec, inferSchema(schema), { depth: 0, seen: new Set() })
    const key = `${location || 'param'}.${p.name}`
    const row: ParamRow = {
      key,
      name: p.name,
      in: location,
      type: typeToString(resolved, spec, new Set(), 0) || inferType(resolved),
      required,
      description,
      example: extractExample(resolved)
    }
    const childType = inferType(resolved)
    if (childType === 'object' || childType === 'array') {
      const children = schemaToRows(spec, resolved, { keyPrefix: key }, { depth: 0, refStack: new Set() })
      if (children.length) row.children = children
    }

    if (location && groups[location]) groups[location].push(row)
    else groups.query.push(row)
  }

  if (isOAS3 && operation.requestBody && isObject(operation.requestBody)) {
    const schema = getOAS3RequestBodySchema(spec, operation.requestBody)
    const resolved = dereferenceSchema(spec, inferSchema(schema), { depth: 0, seen: new Set() })
    const key = 'body.body'
    const bodyRow: ParamRow = {
      key,
      name: 'body',
      in: 'body',
      type: typeToString(resolved, spec, new Set(), 0) || inferType(resolved) || 'object',
      required: !!operation.requestBody.required,
      description: operation.requestBody.description || '',
      example: extractExample(resolved)
    }
    const children = schemaToRows(spec, resolved, { keyPrefix: key }, { depth: 0, refStack: new Set() })
    if (children.length) bodyRow.children = children
    groups.body.push(bodyRow)
  }

  const order: Array<[string, string]> = [
    ['path', 'Path Parameters'],
    ['query', 'Query Parameters'],
    ['header', 'Header Parameters'],
    ['cookie', 'Cookie Parameters'],
    ['body', 'Request Body'],
    ['formData', 'Form Data']
  ]

  for (const [k, title] of order) {
    const list = (groups as any)[k] as ParamRow[] | undefined
    if (list && list.length) {
      rows.push({
        key: `group.${k}`,
        name: title,
        in: k,
        type: '',
        required: false,
        description: '',
        children: list
      })
    }
  }

  return rows
}

export function buildMockContentFromOperation(spec: AnyObject, operation: AnyObject): string {
  const responses = operation.responses
  if (!responses || !isObject(responses)) return '{}'
  const success = selectSuccessResponse(responses as AnyObject) as AnyObject | undefined
  if (!success) return '{}'

  const isOAS3 = typeof spec.openapi === 'string' && spec.openapi.startsWith('3')
  const explicit = isOAS3 ? getOAS3ResponseExplicitExample(success) : getSwagger2ResponseExplicitExample(success)
  if (typeof explicit !== 'undefined') {
    if (typeof explicit === 'string') return explicit
    try {
      return JSON.stringify(explicit, null, 2)
    } catch {
      return `${explicit}`
    }
  }

  const schema = isOAS3 ? getOAS3ResponseSchema(spec, success) : inferSchema(success)
  const sample = sampleFromSchema(spec, schema, { depth: 0, refStack: new Set() })
  try {
    return JSON.stringify(sample ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

export function buildFullPathForSpec(spec: AnyObject, pathKey: string): string {
  const swagger2BasePath = typeof spec.basePath === 'string' ? spec.basePath : ''
  if (swagger2BasePath) return joinPath(swagger2BasePath, pathKey)

  if (Array.isArray(spec.servers) && spec.servers.length) {
    const url = spec.servers[0]?.url
    if (typeof url === 'string' && url) {
      try {
        const u = new URL(url)
        return joinPath(u.pathname, pathKey)
      } catch {
        const idx = url.indexOf('://')
        const pathPart = idx >= 0 ? url.slice(url.indexOf('/', idx + 3)) : url
        if (pathPart) return joinPath(pathPart, pathKey)
      }
    }
  }
  return normalizeSlashPath(pathKey) || '/'
}
