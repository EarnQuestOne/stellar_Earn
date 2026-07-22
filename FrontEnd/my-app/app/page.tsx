import { redirect } from 'next/navigation';

// This page redirects to the default locale, middleware will handle locale detection
export default function RootPage() {
  redirect('/en');
}
