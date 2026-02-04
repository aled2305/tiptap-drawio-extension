# Tiptap Draw.io Extension (Diagram Block)

This extension adds a `diagramBlock` node to Tiptap and pairs with a Vue adapter that opens the Draw.io embed for editing.

## What you get

- **`diagramBlock` node** with `id`, `xml`, and `svg` attributes
- **Commands** to insert/update/remove diagrams and handle exit behavior
- **Vue adapter** that embeds Draw.io and emits `save` / `exit` events
- **Default behavior**: if a new diagram is blank and the user exits, the block is removed

## Files in this repo

- Core extension: `src/extensions/diagramBlock.ts`
- Vue adapter: `src/components/DrawioModal.vue`

## Install (local)

This repo is not published as a package yet. To use it locally in this project:

1. Import the extension and component
2. Register the node in your editor
3. Wire the modal `save`/`exit` events to the editor commands

## Usage (Vue 3)

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { DiagramBlock } from './extensions/diagramBlock'
import DrawioModal from './components/DrawioModal.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagramBlock: {
      insertDiagramBlock: (options?: { pos?: number; id?: string; xml?: string; svg?: string }) => ReturnType
      updateDiagramBlockById: (options: { id: string; xml: string; svg: string }) => ReturnType
      removeDiagramBlockById: (options: { id: string }) => ReturnType
      handleDiagramExit: (options: { id: string; xml?: string; svg?: string }) => ReturnType
    }
  }
}

const isDiagramModalOpen = ref(false)
const diagramXmlDraft = ref('')
const diagramSvgDraft = ref('')
const diagramEditId = ref<string | null>(null)

const DRAWIO_URL = 'https://embed.diagrams.net/?embed=1&proto=json&spin=1'

const editor = useEditor({
  extensions: [StarterKit, DiagramBlock],
  editorProps: {
    attributes: { class: 'tiptap' },
  },
})

function insertDiagram() {
  if (!editor.value) return
  const endPos = editor.value.state.doc.content.size
  editor.value.commands.insertDiagramBlock({ pos: endPos, xml: '', svg: '' })
  const storageAny = editor.value.storage as Record<string, any>
  diagramEditId.value = storageAny.diagramBlock?.lastInsertedId ?? null
  diagramXmlDraft.value = ''
  diagramSvgDraft.value = ''
  isDiagramModalOpen.value = true
}

function handleDiagramSave(payload: { xml: string; svg: string }) {
  if (!editor.value || !diagramEditId.value) return
  diagramXmlDraft.value = payload.xml
  diagramSvgDraft.value = payload.svg
  editor.value.commands.updateDiagramBlockById({
    id: diagramEditId.value,
    xml: payload.xml,
    svg: payload.svg,
  })
}

function handleDiagramExit(payload: { xml: string; svg: string }) {
  if (!editor.value || !diagramEditId.value) return
  editor.value.commands.handleDiagramExit({
    id: diagramEditId.value,
    xml: payload.xml,
    svg: payload.svg,
  })
}

watch(isDiagramModalOpen, open => {
  if (open) return
  diagramEditId.value = null
  diagramXmlDraft.value = ''
  diagramSvgDraft.value = ''
})
</script>

<template>
  <button @click="insertDiagram">Add Diagram</button>
  <EditorContent v-if="editor" :editor="editor" />
  <DrawioModal
    v-model:open="isDiagramModalOpen"
    :xml="diagramXmlDraft"
    :svg="diagramSvgDraft"
    :drawio-url="DRAWIO_URL"
    @save="handleDiagramSave"
    @exit="handleDiagramExit"
  />
</template>
```

## Draw.io modal behavior

The adapter listens for Draw.io postMessage events:

- `save` -> requests SVG export, emits `save` with `{ xml, svg }`
- `exit` -> emits `exit` with either saved data or empty data if no explicit save

Because the extension handles `handleDiagramExit`, a brand-new blank block is removed when the user exits without saving.

## Commands summary

- `insertDiagramBlock({ pos?, id?, xml?, svg? })`
- `updateDiagramBlockById({ id, xml, svg })`
- `removeDiagramBlockById({ id })`
- `handleDiagramExit({ id, xml?, svg? })`

## License

MIT © Aled Evans
