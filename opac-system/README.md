# Open Public Access Catalog (OPAC) System

A modern library catalog system built with Next.js 14, Supabase, and TypeScript. This system enables library patrons to search, browse, and manage library resources efficiently.

## Features

### 🔍 Catalog Search
- Full-text search across titles, authors, ISBN, subjects
- Advanced filters (publication year, format, availability)
- Faceted search with tags/categories
- Auto-suggest as users type

### 📚 Resource Management
- Book/item details page with cover images and descriptions
- Real-time availability updates
- Reservation system for checked-out items
- User reviews and ratings

### 👤 User Accounts
- Authentication via Supabase Auth
- User dashboard showing checkouts, due dates, fines
- Checkout/return functionality
- Renewal requests

### 🛠️ Admin Panel
- CRUD operations for catalog items
- Bulk import/export (CSV/MARC formats)
- User management
- Analytics dashboard
- Fine management system

### 💾 Database Architecture
- Supabase PostgreSQL with Row-Level Security (RLS)
- Automated daily backups to local SQLite
- Versioned local backups
- Restoration capabilities

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Hook Form** for forms

### Backend
- **Supabase** (PostgreSQL database, Auth, Storage)
- **Supabase Realtime** for live updates
- **Next.js API Routes** for custom endpoints

### Backup System
- **Node.js** backup scripts
- **SQLite** for local backups
- **Cron jobs** for automated backups

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- Git

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd opac-system
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Navigate to your project settings and get:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anonymous API key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)

### 3. Configure Environment

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# For backup scripts (server-side only)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Database

Run the database schema in your Supabase SQL editor:

```bash
# Option 1: Use Supabase Dashboard
# Navigate to SQL Editor in your Supabase dashboard
# Copy and run the contents of database/schema.sql

# Option 2: Use Supabase CLI (if installed)
supabase db push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Database Backup System

The OPAC system includes an automated backup system:

### Manual Backup

```bash
# Run a manual backup (requires service role key in environment)
npm run backup
```

### Scheduled Backups

```bash
# Start the backup scheduler (runs daily at 2 AM by default)
npm run backup:schedule

# Test the scheduler
npm run backup:schedule test
```

### Restore from Backup

```bash
# Restore from a specific backup file
npm run restore
```

Backup files are stored in the `backups/` directory and automatically cleaned up after 30 days.

## Project Structure

```
opac-system/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── search/            # Search page
│   ├── books/             # Books listing and details
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── layout/           # Layout components (Header, Footer)
│   ├── providers/        # Context providers
│   └── ui/               # Reusable UI components
├── lib/                  # Utility functions
│   └── supabase.ts      # Supabase client configuration
├── scripts/             # Backup and utility scripts
│   ├── backup.js       # Database backup script
│   ├── restore.js      # Database restore script
│   └── schedule-backup.js # Backup scheduler
├── database/           # Database schema and migrations
│   └── schema.sql     # Complete database schema
├── backups/           # Local SQLite backups (auto-generated)
├── public/           # Static assets
└── package.json
```

## API Endpoints

### Search API
```
GET /api/search
Parameters:
  q: search query
  author: filter by author
  format: filter by format (book, ebook, audio, periodical)
  year_min, year_max: filter by publication year

Response:
  {
    success: boolean,
    data: Book[],
    count: number,
    query: string,
    filters: object
  }
```

### Book Details
```
GET /api/books/[id]
```

### User Authentication
- Uses Supabase Auth with built-in UI components
- Protected routes using Next.js middleware

## Database Schema

Key tables include:

- **books**: Catalog items with metadata
- **loans**: Checkout/return records
- **reservations**: Item reservations
- **user_profiles**: Extended user information
- **reviews**: User reviews and ratings
- **fines**: Overdue fines and penalties
- **audit_log**: System audit trail

## Security Features

- **Row-Level Security (RLS)**: Database-level access control
- **Supabase Auth**: Secure authentication with email/password or OAuth
- **Input Validation**: Form validation with Zod
- **HTTPS Enforcement**: All communication encrypted
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logging**: Comprehensive audit trail

## Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backups) | For backups |
| `NEXT_PUBLIC_APP_URL` | Your application URL | Yes |
| `BACKUP_SCHEDULE` | Cron schedule for backups | No |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test
```

## Testing

### Running Tests

```bash
# Install test dependencies (if not already installed)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```bash
tests/
├── unit/           # Unit tests for utilities
├── integration/    # Integration tests for API routes
├── e2e/           # End-to-end tests
└── __mocks__/     # Mock files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

### Commit Guidelines

- Use conventional commits format
- Include tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- [Documentation](./docs)
- [Issue Tracker](https://github.com/yourusername/opac-system/issues)
- [Supabase Documentation](https://supabase.com/docs)

## Acknowledgments

- [Next.js](https://nextjs.org) for the React framework
- [Supabase](https://supabase.com) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com) for styling
- [React Query](https://tanstack.com/query) for data fetching

---

**Note**: This is a production-ready starter project. For production deployment, ensure you:
1. Set up proper environment variables
2. Configure SSL certificates
3. Set up monitoring and logging
4. Implement disaster recovery procedures
5. Perform security audit

For questions or issues, please open an issue on the GitHub repository.