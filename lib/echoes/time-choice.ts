import type { EchoTimeChoice } from './types.ts'

export const ECHO_TIME_CHOICES: EchoTimeChoice[] = [
  'today',
  'this_week',
  'last_week',
  'this_month',
  'this_year',
]

export function echoTimeChoiceLabel(choice: EchoTimeChoice): string {
  switch (choice) {
    case 'today':
      return 'Today'
    case 'this_week':
      return 'This week'
    case 'last_week':
      return 'Last week'
    case 'this_month':
      return 'This month'
    case 'this_year':
      return 'This year'
    default:
      return 'This week'
  }
}
