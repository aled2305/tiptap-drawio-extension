import { Node, mergeAttributes } from '@tiptap/core'
import type { CommandProps } from '@tiptap/core'

export interface DiagramBlockAttrs {
  id: string | null
  xml: string
  svg: string
}

interface DiagramBlockStorage {
  lastInsertedId: string | null
}

function createDiagramId() {
  return `diagram_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const DiagramBlock = Node.create({
  name: 'diagramBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addStorage(): DiagramBlockStorage {
    return {
      lastInsertedId: null,
    }
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id || null,
        }),
      },
      xml: {
        default: '',
        parseHTML: element => element.getAttribute('data-xml') || '',
        renderHTML: attributes => ({
          'data-xml': attributes.xml || '',
        }),
      },
      svg: {
        default: '',
        parseHTML: element => element.getAttribute('data-svg') || '',
        renderHTML: attributes => ({
          'data-svg': attributes.svg || '',
        }),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="diagram-block"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'diagram-block' })]
  },
  renderMarkdown(node) {
    return node.attrs?.xml || ''
  },
  addCommands() {
    return {
      insertDiagramBlock:
        (options: { pos?: number; id?: string; xml?: string; svg?: string } = {}) =>
        (props: CommandProps) => {
          const id = options.id ?? createDiagramId()
          const xml = options.xml ?? ''
          const svg = options.svg ?? ''
          const payload = {
            type: this.name,
            attrs: { id, xml, svg },
          }
          const success =
            typeof options.pos === 'number'
              ? props.commands.insertContentAt(options.pos, payload)
              : props.commands.insertContent(payload)
          this.storage.lastInsertedId = success ? id : null
          return success
        },
      updateDiagramBlock:
        (options: { pos?: number; xml: string; svg: string; id?: string }) =>
        (props: CommandProps) => {
          const pos = options.pos ?? props.editor.state.selection.$from.pos
          const node = props.editor.state.doc.nodeAt(pos)
          if (!node || node.type.name !== this.name) {
            return false
          }
          props.tr.setNodeMarkup(pos, this.type, {
            ...node.attrs,
            xml: options.xml,
            svg: options.svg,
            id: options.id ?? node.attrs?.id ?? null,
          })
          return true
        },
      updateDiagramBlockById:
        (options: { id: string; xml: string; svg: string }) =>
        (props: CommandProps) => {
          let targetPos: number | null = null
          props.editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === this.name && node.attrs?.id === options.id) {
              targetPos = pos
              return false
            }
            return true
          })
          if (targetPos == null) return false
          const node = props.editor.state.doc.nodeAt(targetPos)
          if (!node) return false
          props.tr.setNodeMarkup(targetPos, this.type, {
            ...node.attrs,
            xml: options.xml,
            svg: options.svg,
            id: options.id,
          })
          return true
        },
      removeDiagramBlockById:
        (options: { id: string }) =>
        (props: CommandProps) => {
          let targetPos: number | null = null
          let targetNodeSize = 0
          props.editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === this.name && node.attrs?.id === options.id) {
              targetPos = pos
              targetNodeSize = node.nodeSize
              return false
            }
            return true
          })
          if (targetPos == null) return false
          const from = targetPos as number
          const to = from + Number(targetNodeSize)
          props.tr.delete(from, to)
          return true
        },
      handleDiagramExit:
        (options: { id: string; xml?: string; svg?: string }) =>
        (props: CommandProps) => {
          let targetPos: number | null = null
          let targetNode: any = null
          props.editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === this.name && node.attrs?.id === options.id) {
              targetPos = pos
              targetNode = node
              return false
            }
            return true
          })
          if (targetPos == null || !targetNode) return false

          const nextXml = options.xml ?? ''
          const nextSvg = options.svg ?? ''
          const hasPayload = Boolean(nextXml || nextSvg)
          const hasExisting = Boolean(targetNode.attrs?.xml || targetNode.attrs?.svg)

          if (!hasPayload && !hasExisting) {
            const from = targetPos as number
            const to = from + Number(targetNode.nodeSize)
            props.tr.delete(from, to)
            return true
          }

          if (hasPayload) {
            props.tr.setNodeMarkup(targetPos, this.type, {
              ...targetNode.attrs,
              xml: nextXml || targetNode.attrs?.xml || '',
              svg: nextSvg || targetNode.attrs?.svg || '',
              id: options.id,
            })
          }

          return true
        },
    } as any
  },
  addNodeView() {
    const nodeName = this.name
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.dataset.type = 'diagram-block'
      if (node.attrs.id) {
        wrapper.dataset.id = node.attrs.id
      }
      wrapper.dataset.xml = node.attrs.xml || ''
      wrapper.dataset.svg = node.attrs.svg || ''
      wrapper.className = 'diagram-block'
      if (node.attrs.svg) {
        const img = document.createElement('img')
        img.src = node.attrs.svg
        img.alt = 'Diagram'
        img.className = 'diagram-preview'
        wrapper.appendChild(img)
      } else {
        const placeholder = document.createElement('div')
        placeholder.className = 'diagram-placeholder'
        placeholder.textContent = 'Double-click to edit diagram'
        wrapper.appendChild(placeholder)
      }
      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== nodeName) {
            return false
          }
          wrapper.dataset.xml = updatedNode.attrs.xml || ''
          wrapper.dataset.svg = updatedNode.attrs.svg || ''
          wrapper.innerHTML = ''
          if (updatedNode.attrs.svg) {
            const img = document.createElement('img')
            img.src = updatedNode.attrs.svg
            img.alt = 'Diagram'
            img.className = 'diagram-preview'
            wrapper.appendChild(img)
          } else {
            const placeholder = document.createElement('div')
            placeholder.className = 'diagram-placeholder'
            placeholder.textContent = 'Double-click to edit diagram'
            wrapper.appendChild(placeholder)
          }
          return true
        },
      }
    }
  },
})
