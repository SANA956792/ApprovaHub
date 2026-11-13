**IBAT OP** is a web-based Approval Management System designed to organize and manage employee approval requests within an organization.

The application provides a centralized platform where employees can submit requests, authorized approvers can review them, and users can track request statuses.

---

## 🚀 Project Overview

IBAT OP helps organizations manage internal approval processes digitally instead of relying on manual paperwork and disconnected communication channels.

## ✨ Features

### 1. Authentication and User Management

- Mobile number and password-based login.
- Login and logout.
- Persistent login sessions.
- Separate Admin and Employee roles.
- Role-based access to application features.
- JWT-based authentication.

### 2. Dashboard

- Centralized dashboard.
- Overview of approval requests.
- Approved and rejected request summaries.
- Quick access to create new requests.
- Request status tracking.

### 3. Approval Request Management

The application is designed to support request categories such as:

- Expense Reimbursement
- Equipment Purchase
- Software Subscription
- Stationery Purchase
- Casual Leave
- Sick Leave
- Permission Request
- Meta Ads Budget
- Office Maintenance
- Travel Request
- Early Leaving Request
- Salary Increment Request
- Other request categories

### 4. Request Details

Depending on the request type, users can provide:

- Request description.
- Amount, where applicable.
- Supporting bills or documents, where upload is implemented.
- Selected approver.
- Additional information required for review.

### 5. Approval Workflow

- Submit approval requests.
- Review requests according to user permissions.
- Approve or reject requests.
- Track request status.
- Keep request information organized.

### 6. Group Communication

The project is intended to support group-based communication, including:

- Creating and managing groups.
- Adding registered users to groups.
- Group conversations.

### 7. Progressive Web App (PWA)

- Installable web application.
- Mobile-friendly interface.
- App-like experience on supported devices.
- Persistent login support, subject to token validity.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend development |
| TypeScript | Type-safe development |
| Vite | Frontend build tooling |
| Node.js | Backend runtime |
| Express.js | Backend API |
| Bun | Runtime and tooling, where configured |
| PostgreSQL | Relational database |
| Supabase | Managed PostgreSQL hosting |
| Drizzle ORM | Database operations |
| JWT | Authentication |
| Render | Application hosting |
| GitHub | Source code management |

---

## 🏗️ System Architecture

```text
                 IBAT OP
                    |
           React + TypeScript
                    |
               API Requests
                    |
            Node.js + Express
                    |
               Drizzle ORM
                    |
               PostgreSQL
                    |
                 Supabase
```

---

## 🗄️ Database

IBAT OP uses PostgreSQL for persistent application data. The database is hosted using Supabase.

Database information may include:

- User records.
- Approval requests.
- Request statuses.
- Group information.
- Other application records.

Database schema and migrations are managed using Drizzle ORM.

---

## 🔐 Security

Security-related mechanisms include:

- JWT-based authentication.
- Protected backend API routes.
- Admin and Employee role separation.
- Server-side database access.
- Environment-based configuration.
- HTTPS through supported hosting infrastructure.

**Important:** Never commit database passwords, JWT secrets, API keys, or other credentials to a public repository. Configure secrets through the hosting provider's environment settings.

---

## ☁️ Deployment

The project uses:

- **GitHub** for source code management.
- **Render** for application hosting.
- **Supabase** for PostgreSQL database hosting.

### Deployment Workflow

1. Make and review code changes.
2. Commit and push changes to GitHub.
3. Deploy the latest commit through Render.
4. Check deployment logs and service status.
5. Test the application after deployment.

---

## ⚙️ Environment Configuration

The backend may require environment variables similar to the following:

```env
SQL_HOST=your_database_host
SQL_USER=your_database_user
SQL_PASSWORD=your_database_password
SQL_DB_NAME=your_database_name
JWT_SECRET=your_secure_jwt_secret
```

The exact variables depend on the current project configuration. Set real values securely in the deployment environment. Do not publish actual credentials in this README or in source control.

---

## 💻 Local Development

### Prerequisites

- Node.js
- npm
- Bun, if required by the project scripts
- Access to a PostgreSQL database
- Git

### Clone the Repository

```bash
git clone https://github.com/SANA956792/ApprovaHub.git
cd ApprovaHub
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create the required local environment configuration using the variables expected by the backend. Do not commit secret values.

### Run the Development Server

Use the development command defined in `package.json`. For example:

```bash
npm run dev
```

### Build the Project

```bash
npm run build
```

---

## 📱 Application Benefits

- Centralizes internal approval requests.
- Reduces reliance on manual approval paperwork.
- Helps users track request progress.
- Organizes employee and approver workflows.
- Provides role-based application access.
- Supports access from desktop and mobile devices.

---

## 🔮 Possible Future Enhancements

- Advanced analytics dashboard.
- Downloadable approval reports.
- Email and push notifications.
- Improved document management.
- Detailed audit logs.
- Enhanced user management.
- Automated database backup monitoring.
- Configurable multi-level approval workflows.

---

## 📌 Project Information

| Detail | Information |
|---|---|
| Project Name | IBAT OP |
| Project Type | Approval Management System |
| Frontend | React + TypeScript |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Hosting | Render |
| Database Hosting | Supabase |
| Source Repository | [ApprovaHub](https://github.com/SANA956792/ApprovaHub) |

---
