import { Metadata } from 'next';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = {
  title: 'Admin - OPAC',
  description: 'Admin dashboard for the Open Public Access Catalog system',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nested layout: app/layout.tsx already renders <html>, <body> and the page
  // <main>. Re-declaring them here nests <html> inside <main>, which is invalid
  // HTML and breaks hydration. This layout only owns the admin chrome.
  return (
    <div className="space-y-8">
      <nav className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-blue-600">OPAC Admin</span>
        </div>
        <div className="flex items-center space-x-4">
          <a href="/account" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            My Account
          </a>
          <SignOutButton />
        </div>
      </nav>

      {children}
    </div>
  );
}