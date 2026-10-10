import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import ar from '../i18n/ar.json'

export function DialogExample() {
  const [open, setOpen] = useState(false)
  const copy = ar.kit.dialog
  return (
    <>
      <Button onClick={() => setOpen(true)}>{copy.open}</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.title}
        description={copy.description}
      >
        <Input label={copy.field} />
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {ar.ui.closeDialog}
        </Button>
      </Dialog>
    </>
  )
}
