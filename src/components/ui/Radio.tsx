import { Choice, type ChoiceProps } from './Choice'

export function Radio(props: ChoiceProps & { name: string; value: string }) {
  return <Choice {...props} type="radio" />
}
