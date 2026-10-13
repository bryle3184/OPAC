"use client";

import { BookOpen, Library, Users, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-6 w-6" />
              <h3 className="text-xl font-bold">OPAC</h3>
            </div>
            <p className="text-gray-300">
              A modern Open Public Access Catalog system for efficient library resource management.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center">
              <Library className="h-4 w-4 mr-2" />
              Quick Links
            </h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="/search" className="hover:text-white transition-colors">
                  Advanced Search
                </a>
              </li>
              <li>
                <a href="/books/new" className="hover:text-white transition-colors">
                  New Arrivals
                </a>
              </li>
              <li>
                <a href="/books/popular" className="hover:text-white transition-colors">
                  Most Popular
                </a>
              </li>
              <li>
                <a href="/help" className="hover:text-white transition-colors">
                  Help & Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Services
            </h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="/account" className="hover:text-white transition-colors">
                  My Account
                </a>
              </li>
              <li>
                <a href="/checkouts" className="hover:text-white transition-colors">
                  My Checkouts
                </a>
              </li>
              <li>
                <a href="/reservations" className="hover:text-white transition-colors">
                  My Reservations
                </a>
              </li>
              <li>
                <a href="/fines" className="hover:text-white transition-colors">
                  Fines & Fees
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              About
            </h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="/about" className="hover:text-white transition-colors">
                  About OPAC
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-300 text-sm">
          <p>© {currentYear ?? "2026"} Open Public Access Catalog System. All rights reserved.</p>
          <p className="mt-2">Version 1.0.0</p>
        </div>
      </div>
    </footer>
  );
}