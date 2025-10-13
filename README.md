# Tabulation System

A comprehensive web-based tabulation system for pageant events, built with Next.js, Prisma, and Socket.io for real-time scoring updates.

## Features

- **Multi-Event Management**: Create and manage multiple pageant events with customizable settings
- **Judge & Contestant Management**: Handle judges and contestants with unique identifiers
- **Flexible Criteria System**: Support for main criteria, sub-criteria, weights, and phase-specific scoring
- **Two-Phase Scoring**: Preliminary and Final rounds with configurable phase settings
- **Real-Time Updates**: WebSocket-powered live scoring updates across all connected clients
- **Admin Dashboard**: Complete event management interface for administrators
- **Judge Interface**: Dedicated scoring interface for judges with locking mechanisms
- **Ranking & Reports**: Automatic ranking calculations, category breakdowns, and printable reports
- **Gender Separation**: Optional gender-based contestant separation and finalist selection
- **Automatic Finalist Selection**: Configurable finalist counts based on preliminary scores

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with custom server, Socket.io for real-time communication
- **Database**: MySQL with Prisma ORM
- **UI Components**: Radix UI component library
- **Authentication**: bcryptjs for secure password hashing
- **Process Management**: PM2 for production deployment
- **Reverse Proxy**: Apache for serving Node.js application

## Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm, yarn, or pnpm package manager
- PM2 (for production deployment)
- Apache web server (for reverse proxy setup)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tabulation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   - Copy environment template files
   - Configure database connection and application settings

   Create `.env.development` and `.env.production` files:

   ```env
   # Database
   DATABASE_URL="mysql://username:password@localhost:3306/tabulation_db"

   # Application
   NEXT_PUBLIC_BASE_PATH="/tabulation"
   NODE_ENV=development

   # Optional: Additional configuration
   # PORT=3000
   ```

## Database Setup

1. **Create MySQL Database**:
   ```sql
   CREATE DATABASE tabulation_db;
   GRANT ALL PRIVILEGES ON tabulation_db.* TO 'tabulation_user'@'localhost' IDENTIFIED BY 'your_password';
   FLUSH PRIVILEGES;
   ```

2. **Run Database Migrations**:
   ```bash
   # Ensure no development server is running
   npx prisma migrate dev
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Seed Database (Optional)**:
   ```bash
   npm run db:seed
   ```
   This creates an initial admin user:
   - **Username**: `admin`
   - **Password**: `admin123`
   - **Name**: `Admin User`

   **Important**: Change the default password after first login for security.

## Running the Application

### Development Mode
```bash
npm run dev
```
- Starts the development server with hot reload
- Access at: `http://localhost:3000/tabulation`
- WebSocket path: `/tabulation/ws`

### Production Build
```bash
npm run build
npm run start
```
- Builds optimized production bundle
- Starts production server

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:seed` - Seed database with sample data

## Deployment

The application can be deployed on any server supporting Node.js and MySQL.

### Server Requirements
- Node.js 18+
- MySQL 8.0+
- Web server (Apache/Nginx) for reverse proxy (optional)
- PM2 for process management (recommended)

### Basic Deployment Steps

1. **Upload Application**:
   ```bash
   # Upload files to your server
   scp -r . user@your-server:/path/to/app
   ```

2. **Install Dependencies**:
   ```bash
   npm install --production
   ```

3. **Environment Configuration**:
   Set production environment variables:
   ```bash
   export NODE_ENV=production
   export DATABASE_URL="mysql://user:pass@db-host:3306/db_name"
   export NEXT_PUBLIC_BASE_PATH="/tabulation"
   ```

4. **Database Setup**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Build Application**:
   ```bash
   npm run build
   ```

6. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### Reverse Proxy Setup (Optional)

If using Apache as reverse proxy:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    # Proxy to Node.js app
    ProxyPass /tabulation http://localhost:3000/tabulation
    ProxyPassReverse /tabulation http://localhost:3000/tabulation

    # WebSocket proxy
    ProxyPass /tabulation/ws ws://localhost:3000/tabulation/ws
    ProxyPassReverse /tabulation/ws ws://localhost:3000/tabulation/ws
</VirtualHost>
```

### URLs
- **Judge Login**: `https://yourdomain.com/tabulation`
- **Admin Dashboard**: `https://yourdomain.com/tabulation/admin`

## Database Schema Overview

### Core Models

- **Event**: Pageant events with phases, gender settings, and finalist counts
- **Contestant**: Participants with numbers, names, and gender
- **Judge**: Scoring judges with phase-specific locking
- **Criteria**: Hierarchical scoring categories with weights and phases
- **Score**: Individual judge scores for contestants on specific criteria
- **Admin**: System administrators with authentication

### Key Features
- **Phased Scoring**: Support for preliminary and final rounds
- **Weighted Criteria**: Flexible scoring with percentage weights
- **Sub-Criteria**: Nested criteria structure
- **Judge Locking**: Prevent score modifications after submission
- **Real-Time Sync**: WebSocket updates for live scoring

## API Reference

The application provides RESTful API endpoints under `/api/`:

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create new event
- `GET /api/events/[id]` - Get event details
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### Contestants
- `GET /api/events/[eventId]/contestants` - List event contestants
- `POST /api/events/[eventId]/contestants` - Add contestant

### Judges
- `GET /api/events/[eventId]/judges` - List event judges
- `POST /api/events/[eventId]/judges` - Add judge

### Criteria
- `GET /api/events/[eventId]/criteria` - List event criteria
- `POST /api/events/[eventId]/criteria` - Add criteria

### Scores
- `GET /api/events/[eventId]/scores` - Get all scores
- `POST /api/events/[eventId]/scores` - Submit scores

### Real-Time Updates
WebSocket events for live updates:
- `judges-status` - Active judges list
- `scores-updated` - Score changes
- `judge-locked` - Judge submission status

## Development Guidelines

### Code Standards
- Follow TypeScript best practices
- Use ESLint for code linting
- Maintain consistent code formatting

### Database Operations
- Use Prisma CLI for migrations and schema changes
- Test database changes in development before production deployment
- Keep database schema documentation updated

### Reference Codebase
The `pageant_old/` directory contains the previous version for reference only. Do not modify or deploy it.

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` in environment files
   - Ensure MySQL service is running
   - Check user permissions on database

2. **WebSocket Connection Issues**
   - Verify Apache proxy configuration for `/tabulation/ws`
   - Check firewall settings for WebSocket ports

3. **Build Failures**
   - Clear Next.js cache: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run lint`

4. **PM2 Issues**
   - Check logs: `pm2 logs tabulation`
   - Restart process: `pm2 restart tabulation`
   - Check process status: `pm2 status`

### Logs and Monitoring
- Application logs: `pm2 logs tabulation`
- Database logs: Check MySQL error logs
- Apache logs: `/var/log/apache2/error.log`

## Contributing

1. Follow the established code writing guidelines
2. Test all changes thoroughly
3. Update documentation for any new features
4. Ensure database migrations are properly tested
5. Follow the existing commit message conventions

## Support

If you find this project helpful, consider supporting the development:

- [GitHub Sponsors](https://github.com/sponsors/kmredosendo)
- [Ko-fi](https://ko-fi.com/kmredosendo)
- [Buy Me a Coffee](https://buymeacoffee.com/kmredosendo)
- [PayPal](https://paypal.me/kmredosendo)

## License

[Specify license here if applicable]

---

**Note**: Ensure proper backup procedures for production databases and test thoroughly before deployment.
