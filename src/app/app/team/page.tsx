import { redirect } from 'next/navigation';

export default function LegacyTeamRedirectPage() {
  redirect('/app/settings');
}
