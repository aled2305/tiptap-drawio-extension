<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    xml: string
    svg: string
    drawioUrl?: string
    allowedOrigins?: string[]
  }>(),
  {
    drawioUrl: 'https://embed.diagrams.net/?embed=1&proto=json&spin=1',
    allowedOrigins: () => ['https://embed.diagrams.net'],
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', payload: { xml: string; svg: string }): void
  (event: 'exit', payload: { xml: string; svg: string }): void
}>()

const frame = ref<HTMLIFrameElement | null>(null)
const status = ref<string | null>(null)
const xmlDraft = ref('')
const svgDraft = ref('')
const hasExplicitSave = ref(false)

function close() {
  emit('update:open', false)
}

function postToDrawio(message: unknown) {
  const target = frame.value
  if (!target || !target.contentWindow) return
  target.contentWindow.postMessage(JSON.stringify(message), '*')
}

function normalizeSvgDataUrl(payload: string) {
  if (payload.startsWith('data:image/svg+xml')) {
    return payload
  }
  if (payload.startsWith('<svg') || (payload.startsWith('<?xml') && payload.includes('<svg'))) {
    const svgBase64 = btoa(unescape(encodeURIComponent(payload)))
    return `data:image/svg+xml;base64,${svgBase64}`
  }
  return null
}

function handleDrawioMessage(event: MessageEvent) {
  if (!props.allowedOrigins.includes(event.origin)) return
  if (!props.open) return
  let data: Record<string, any> | null = null
  if (typeof event.data === 'string') {
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
  } else if (typeof event.data === 'object' && event.data) {
    data = event.data as Record<string, any>
  }
  if (!data) return

  if (data.event === 'init') {
    status.value = 'Editor ready'
    const xml =
      xmlDraft.value && xmlDraft.value.trim().length > 0
        ? xmlDraft.value
        : '<mxfile host="embed.diagrams.net"><diagram name="Page-1" id="diagram-1"></diagram></mxfile>'
    postToDrawio({
      action: 'load',
      xml,
      autosave: 1,
    })
    return
  }

  if (data.event === 'autosave' && typeof data.xml === 'string') {
    xmlDraft.value = data.xml
    return
  }

  if (data.event === 'save') {
    if (typeof data.xml === 'string') {
      xmlDraft.value = data.xml
    }
    status.value = 'Exporting SVG…'
    postToDrawio({
      action: 'export',
      format: 'xmlsvg',
    })
    return
  }

  if (data.event === 'export') {
    let payload: unknown = data.data
    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, any>)) {
      payload = (payload as Record<string, any>).data
    }
    if (typeof payload !== 'string' || payload.length === 0) {
      status.value = 'Export failed'
      return
    }
    const svgDataUrl = normalizeSvgDataUrl(payload)
    if (!svgDataUrl) {
      status.value = 'Export returned invalid SVG'
      return
    }
    svgDraft.value = svgDataUrl
    hasExplicitSave.value = true
    emit('save', { xml: xmlDraft.value, svg: svgDraft.value })
    close()
    return
  }

  if (data.event === 'exit') {
    if (hasExplicitSave.value) {
      emit('exit', { xml: xmlDraft.value, svg: svgDraft.value })
    } else {
      emit('exit', { xml: '', svg: '' })
    }
    close()
    return
  }

  if (data.event === 'error') {
    status.value = data.error || 'Draw.io error'
  }
}

watch(
  () => props.open,
  open => {
    if (!open) {
      status.value = null
      return
    }
    status.value = 'Loading diagram editor…'
    xmlDraft.value = props.xml || ''
    svgDraft.value = props.svg || ''
    hasExplicitSave.value = false
  },
)

onMounted(() => {
  window.addEventListener('message', handleDrawioMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleDrawioMessage)
})
</script>

<template>
  <div v-if="open" class="diagram-modal" role="dialog" aria-modal="true">
    <iframe
      ref="frame"
      class="diagram-frame"
      :src="drawioUrl"
      title="Draw.io editor"
    />
  </div>
</template>

<style scoped>
.diagram-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #0f172a;
  animation: diagram-fade 180ms ease-out;
}

.diagram-frame {
  width: 100%;
  height: 100vh;
  border: 0;
  display: block;
}

@keyframes diagram-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
