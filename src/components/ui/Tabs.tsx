import { useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react'

export type TabItem = {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export type TabsProps = {
  tabs: readonly TabItem[]
  ariaLabel: string
  defaultTabId?: string
  className?: string
}

export function Tabs({ tabs, ariaLabel, defaultTabId, className = '' }: TabsProps) {
  const baseId = useId()
  const [activeId, setActiveId] = useState(defaultTabId)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeTab =
    tabs.find((tab) => tab.id === activeId && !tab.disabled) ?? tabs.find((tab) => !tab.disabled)
  if (!activeTab) return null

  const tabId = (index: number) => `${baseId}-tab-${index}`
  const panelId = (index: number) => `${baseId}-panel-${index}`
  const activeIndex = tabs.indexOf(activeTab)

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = event.currentTarget.closest('[dir]')?.getAttribute('dir') ?? 'ltr'
    const enabledIndexes = tabs.flatMap((tab, index) => (tab.disabled ? [] : [index]))
    const current = enabledIndexes.indexOf(activeIndex)
    if (current < 0) return

    let next = current
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = enabledIndexes.length - 1
    else if (event.key === 'ArrowRight') next = direction === 'rtl' ? current - 1 : current + 1
    else if (event.key === 'ArrowLeft') next = direction === 'rtl' ? current + 1 : current - 1
    else return

    event.preventDefault()
    const wrapped = (next + enabledIndexes.length) % enabledIndexes.length
    const nextIndex = enabledIndexes[wrapped]
    setActiveId(tabs[nextIndex]?.id ?? '')
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className={`ui-tabs ${className}`}>
      <div className="flex flex-wrap gap-2 p-1" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={tabId(index)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(index)}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className="ui-control ui-tab bg-transparent px-4 font-semibold text-text underline-offset-8 aria-selected:underline disabled:cursor-not-allowed disabled:border-dashed disabled:border-border-input"
              onClick={() => setActiveId(tab.id)}
              onFocus={() => setActiveId(tab.id)}
              onKeyDown={moveFocus}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTab.id
        return (
          <div
            key={tab.id}
            id={panelId(index)}
            role="tabpanel"
            aria-labelledby={tabId(index)}
            hidden={!selected}
            tabIndex={0}
            className="p-3"
          >
            {tab.content}
          </div>
        )
      })}
    </div>
  )
}
