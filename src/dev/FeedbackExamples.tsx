import { useId, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { Toast } from '../components/ui/Toast'

import { useLanguage } from '../i18n/LanguageProvider'

export function FeedbackExamples() {
  const { t: ar } = useLanguage()
  const [visible, setVisible] = useState(true)
  const headingId = useId()
  const copy = ar.kit.feedback
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h3 id={headingId} className="text-h3">
        {copy.title}
      </h3>
      <Button onClick={() => setVisible((value) => !value)}>{copy.toggleNotification}</Button>
      {visible ? (
        <Toast
          title={copy.toastTitle}
          message={copy.toastMessage}
          severity="success"
          onDismiss={() => setVisible(false)}
        />
      ) : null}
      <Toast
        title={ar.kit.invalid}
        severity="danger"
        message={
          <>
            <p>{ar.kit.invalidMessage}</p>
            <p className="text-small">
              {ar.kit.errorCode} <bdi dir="ltr">ADM-007</bdi>
            </p>
          </>
        }
      />
      <Tabs
        ariaLabel={copy.tabsLabel}
        tabs={[
          { id: 'first', label: copy.firstTab, content: <p>{copy.firstPanel}</p> },
          { id: 'second', label: copy.secondTab, content: <p>{copy.secondPanel}</p> },
          { id: 'third', label: copy.thirdTab, content: <p>{copy.thirdPanel}</p> },
        ]}
      />
    </section>
  )
}
