import { BookOpen, Filter, TrendingUp, Calendar, Star } from "lucide-react";
import Link from "next/link";

export default function BooksPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Browse Our Collection</h1>
        <p className="text-gray-600">
          Explore thousands of books, e-books, audio books, and periodicals in our collection.
        </p>
      </div>

      {/* Quick Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "New Arrivals", count: "248", icon: <BookOpen />, color: "bg-blue-100 text-blue-600" },
          { label: "Fiction", count: "45,231", icon: <BookOpen />, color: "bg-purple-100 text-purple-600" },
          { label: "Non-Fiction", count: "38,921", icon: <BookOpen />, color: "bg-green-100 text-green-600" },
          { label: "Best Sellers", count: "1,234", icon: <TrendingUp />, color: "bg-orange-100 text-orange-600" },
        ].map((category, index) => (
          <Link
            key={index}
            href={`/books/category/${category.label.toLowerCase().replace(' ', '-')}`}
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-3 rounded-lg ${category.color} mb-4`}>
              {category.icon}
            </div>
            <h3 className="font-semibold text-lg mb-1">{category.label}</h3>
            <p className="text-gray-600">{category.count} items</p>
          </Link>
        ))}
      </div>

      {/* Featured Collections */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Collections</h2>
          <Link href="/collections" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View all collections →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Classic Literature",
              description: "Timeless works from Shakespeare, Austen, Dickens, and more.",
              count: "2,348",
              color: "bg-yellow-50 border-yellow-100",
            },
            {
              title: "Science Fiction & Fantasy",
              description: "Explore worlds beyond imagination with our sci-fi collection.",
              count: "5,671",
              color: "bg-indigo-50 border-indigo-100",
            },
            {
              title: "Academic Research",
              description: "Peer-reviewed journals, academic papers, and research materials.",
              count: "12,459",
              color: "bg-emerald-50 border-emerald-100",
            },
          ].map((collection, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl border ${collection.color}`}
            >
              <h3 className="font-bold text-xl mb-2">{collection.title}</h3>
              <p className="text-gray-600 mb-4">{collection.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">{collection.count} items</span>
                <Link
                  href={`/books/collection/${collection.title.toLowerCase().replace(' ', '-')}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Browse →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Added */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recently Added</h2>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <Calendar className="h-4 w-4" />
              Sort
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { title: "The Midnight Library", author: "Matt Haig", format: "Book", added: "2 days ago", status: "Available" },
                { title: "Project Hail Mary", author: "Andy Weir", format: "E-Book", added: "3 days ago", status: "Available" },
                { title: "Klara and the Sun", author: "Kazuo Ishiguro", format: "Book", added: "5 days ago", status: "Checked Out" },
                { title: "The Four Winds", author: "Kristin Hannah", format: "Audio Book", added: "1 week ago", status: "Available" },
                { title: "The Code Breaker", author: "Walter Isaacson", format: "Book", added: "1 week ago", status: "Available" },
              ].map((book, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{book.title}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{book.author}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {book.format}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{book.added}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      book.status === "Available"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {book.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-blue-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-center mb-8">Collection Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Total Items", value: "245,892", trend: "+2.4%" },
            { label: "E-Books", value: "45,231", trend: "+15.2%" },
            { label: "Audio Books", value: "12,589", trend: "+8.7%" },
            { label: "Periodicals", value: "8,432", trend: "+1.2%" },
          ].map((stat, index) => (
            <div key={index} className="text-center space-y-2">
              <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-gray-700">{stat.label}</div>
              <div className="text-sm text-green-600">{stat.trend} this year</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}