// Served only by the Playwright network fixture, never imported into the storefront.
let sequence = 0
const widgets = new Map()
window.turnstile = {
  render(container, options) {
    const id = `widget-${++sequence}`
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'cf-turnstile-response'
    container.append(input)
    const timer = setTimeout(() => {
      const token = `e2e-turnstile-${id}`
      options.callback(token)
      input.value = token
    }, 100)
    widgets.set(id, { input, timer })
    return id
  },
  remove(id) {
    const widget = widgets.get(id)
    if (!widget) return
    clearTimeout(widget.timer)
    widget.input.remove()
    widgets.delete(id)
  },
  reset(id) {
    this.remove(id)
  },
}
