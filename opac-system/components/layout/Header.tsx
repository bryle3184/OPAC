import { Book, User, Bell } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center mx-4 space-x-2">
            <Book className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OPAC</h1>
            </div>
          </div>

          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link href="/search" className="text-gray-700 hover:text-blue-600 transition-colors">
              Search Catalog
            </Link>
            <Link href="/browse" className="text-gray-700 hover:text-blue-600 transition-colors">
              Browse
            </Link>
            <Link href="/account" className="text-gray-700 hover:text-blue-600 transition-colors">
              My Account
            </Link>
            <Link href="/admin" className="text-gray-700 hover:text-blue-600 transition-colors">
              Admin
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="/account" className="p-2 hover:bg-gray-100 rounded-full">
              <User className="h-5 w-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}