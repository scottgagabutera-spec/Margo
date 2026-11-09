import { redirect } from 'next/navigation'

export default function HelpAccountRedirectPage() {
  redirect('/help/get-started/sign-in')
}
