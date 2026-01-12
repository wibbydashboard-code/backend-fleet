# PCAS Fleet Management - Backend

Backend API for Fleet Management System with multi-tenant support.

## Setup

### Environment Variables

Configure these variables in Render:

```
DB_HOST=tidb-cloud-host
DB_PORT=4000
DB_USER=your-tidb-user
DB_PASSWORD=your-tidb-password
DB_NAME=fleet_db
DB_SSL=true
JWT_SECRET=generate-strong-random-string-min-32-chars
NODE_ENV=production
PORT=3000
```

### Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your local DB credentials
npm start
```

### Deploy to Render

1. Push this repository to GitHub
2. Create a new Web Service in Render
3. Connect your GitHub repository
4. Render will automatically install dependencies and start with `node server.js`
5. Add environment variables in Render dashboard

## API Endpoints

### Auth
- `POST /api/auth/login` - User login

### Units
- `GET /api/units` - Get all units
- `POST /api/units` - Create unit
- `PUT /api/units/:id/status` - Update unit status
- `GET /api/units/template` - Download Excel template
- `POST /api/units/batch-upload` - Bulk upload units

### Contracts
- `GET /api/contracts` - Get all contracts
- `POST /api/contracts` - Create contract
- `POST /api/contracts/:id/upload` - Upload contract PDF

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id/status` - Update payment status
- `POST /api/payments/:id/upload` - Upload payment receipt

### Providers
- `GET /api/providers` - Get all providers
- `POST /api/providers` - Create provider
- `PUT /api/providers/:id` - Update provider
- `PUT /api/providers/:id/status` - Update provider status

### Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `PUT /api/companies/:id/status` - Update company status
- `DELETE /api/companies/:id` - Delete company

### Admin (requires admin role)
- `GET /api/admin/tenants` - List tenants
- `POST /api/admin/tenants` - Create tenant
- `PATCH /api/admin/tenants/:id` - Update tenant
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PATCH /api/admin/users/:id` - Update user

### Reports
- `POST /api/reports/estado-cuenta` - Generate account statement (Excel)
- `GET /api/stats` - Get dashboard stats
- `GET /api/payments/report` - Get payments report

## Requirements

- Node.js 20.x
- MySQL/TiDB database
