# OPAC System - Setup Checklist

This checklist will help you get your OPAC system up and running quickly.

## ✅ **Phase 1: Basic Setup**

### 1.1 Install Dependencies
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Navigate to project directory: `cd opac-system`
- [ ] Install dependencies: `npm install`

### 1.2 Create Supabase Account
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Sign up for a free account
- [ ] Create a new project
- [ ] Wait for database to initialize

### 1.3 Get Supabase Credentials
From your Supabase project dashboard:
- [ ] Navigate to **Settings > API**
- [ ] Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (for backups)

### 1.4 Configure Environment
- [ ] Create `.env.local` file in project root
- [ ] Add all environment variables from `.env.local.template`
- [ ] Replace placeholder values with your actual credentials

## ✅ **Phase 2: Database Setup**

### 2.1 Set Up Database Schema
**Option A: Using Supabase Dashboard**
- [ ] Go to **SQL Editor** in Supabase dashboard
- [ ] Copy contents from `database/schema.sql`
- [ ] Paste and run the SQL script
- [ ] Verify tables are created successfully

**Option B: Using Supabase CLI**
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref your-project-ref`
- [ ] Push schema: `supabase db push`

### 2.2 Verify Database Structure
- [ ] Check tables are created:
  - [ ] `books`
  - [ ] `loans`
  - [ ] `reservations`
  - [ ] `user_profiles`
  - [ ] `reviews`
  - [ ] `fines`
  - [ ] `audit_log`
- [ ] Verify sample data is inserted

### 2.3 Enable Row Level Security (RLS)
- [ ] Navigate to **Authentication > Policies** in Supabase
- [ ] Verify RLS is enabled for all tables
- [ ] Test policies by trying to access data as anonymous user

## ✅ **Phase 3: Development Setup**

### 3.1 Start Development Server
- [ ] Run: `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify homepage loads correctly
- [ ] Check for any console errors

### 3.2 Test Search Functionality
- [ ] Navigate to `/search`
- [ ] Try searching for sample books (e.g., "Harry Potter")
- [ ] Test filters (author, format, year)
- [ ] Verify search results display

### 3.3 Test Pages
- [ ] Homepage (`/`)
- [ ] Search page (`/search`)
- [ ] Books listing (`/books`)
- [ ] Navigation links

## ✅ **Phase 4: Authentication Setup**

### 4.1 Configure Supabase Auth
- [ ] Go to **Authentication > Settings** in Supabase
- [ ] Enable **Email Auth Provider**
- [ ] Configure email templates
- [ ] Set site URL to `http://localhost:3000`

### 4.2 Test Authentication
- [ ] Sign up with a test email
- [ ] Verify email confirmation
- [ ] Login with credentials
- [ ] Test logout functionality

## ✅ **Phase 5: Backup System Setup**

### 5.1 Test Manual Backup
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is in environment
- [ ] Run: `npm run backup`
- [ ] Verify backup file is created in `backups/` directory
- [ ] Check backup file size (should not be 0 bytes)

### 5.2 Test Restore
- [ ] Run: `npm run restore`
- [ ] Select a backup to restore from
- [ ] Confirm restoration
- [ ] Verify data is restored in Supabase

### 5.3 Set Up Scheduled Backups
- [ ] Test scheduler: `npm run backup:schedule test`
- [ ] Start scheduler: `npm run backup:schedule schedule`
- [ ] Monitor logs for scheduled backups

## ✅ **Phase 6: Production Preparation**

### 6.1 Environment Configuration
- [ ] Create production `.env.production.local`
- [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Set up production Supabase project (recommended separate from dev)

### 6.2 Build and Test
- [ ] Run: `npm run build`
- [ ] Verify build completes without errors
- [ ] Run: `npm start`
- [ ] Test all pages in production mode

### 6.3 Security Configuration
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS policies in Supabase
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts

## ✅ **Phase 7: Deployment**

### 7.1 Choose Deployment Platform
**Vercel (Recommended)**
- [ ] Connect GitHub repository
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy automatically on push

**Docker**
- [ ] Build Docker image: `docker build -t opac-system .`
- [ ] Run container: `docker run -p 3000:3000 opac-system`

### 7.2 Post-Deployment
- [ ] Test all features on live site
- [ ] Set up monitoring (error tracking, performance)
- [ ] Configure backups for production database
- [ ] Set up SSL certificate

## ✅ **Phase 8: Maintenance**

### 8.1 Daily Tasks
- [ ] Check backup logs
- [ ] Monitor system health
- [ ] Review audit logs

### 8.2 Weekly Tasks
- [ ] Verify backup integrity
- [ ] Review user registrations
- [ ] Check for overdue loans

### 8.3 Monthly Tasks
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Database optimization

## ⚠️ **Troubleshooting**

### Common Issues

1. **Database connection errors**
   - Verify Supabase credentials
   - Check network connectivity
   - Verify Supabase project is active

2. **Authentication not working**
   - Check Supabase Auth settings
   - Verify email provider is enabled
   - Check site URL configuration

3. **Backup failures**
   - Verify service role key has proper permissions
   - Check disk space
   - Review backup script logs

4. **Build errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors
   - Verify Next.js compatibility

### Quick Fixes

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run dev

# Reset database
# Run the schema.sql again in Supabase SQL editor

# Test backup manually
node scripts/backup.js
```

## 🔧 **Useful Commands**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start              # Start production server

# Database
npm run backup         # Manual database backup
npm run restore        # Restore from backup
npm run backup:schedule # Start backup scheduler

# Maintenance
npm audit             # Check for vulnerabilities
npm update           # Update dependencies
npm run lint         # Check code quality
```

## 📞 **Support**

If you encounter issues:

1. **Check the logs**: Look for error messages in browser console or server logs
2. **Review documentation**: Check README.md for setup instructions
3. **Test endpoints**: Use curl or Postman to test API endpoints
4. **Contact support**: Create an issue on GitHub repository

## 🎯 **Next Steps**

After successful setup:

1. **Customize branding**: Update colors, logos, and content
2. **Add more books**: Import your catalog using CSV or API
3. **Configure notifications**: Set up email/SMS alerts for due dates
4. **Add analytics**: Set up Google Analytics or similar
5. **Implement features**: Add requested features from users

---

**Setup Status**: [ ] Not Started [ ] In Progress [ ] Completed
**Last Updated**: 2026-10-10