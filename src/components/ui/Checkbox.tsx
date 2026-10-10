import { Choice, type ChoiceProps } from './Choice'

export function Checkbox(props: ChoiceProps) {
  return <Choice {...props} type="checkbox" />
}
