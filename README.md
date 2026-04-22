--HR Onboarding Software
A full-stack web application for managing recruitment and candidate onboarding workflows. The system provides role-based dashboards for recruiters and candidates, document verification tracking, bulk email communication, and real-time progress monitoring.

--Overview
The application streamlines the onboarding process by allowing recruiters to import candidates in bulk, manage document submissions (medical exam, police verification), assign final clearance, and issue joining letters. Candidates receive OTP-based first-login credentials, upload required documents, and track their approval status. The platform also includes hospital list management, email templating, bulk email sending, and automated notifications for document uploads.

--Architecture
---Frontend: React single-page application with client-side routing (React Router) and state management via Context API.
---Backend: RESTful API built with Node.js and Express.js.
---Database: PostgreSQL with tables for users, authentication, documents, email templates, logs, notifications, and token blacklist.
---Authentication: JWT stored in httpOnly cookies, with refresh-less session and token blacklisting for strict logout.
---Email: Nodemailer or Mailgun integration for OTP, password reset, and bulk emails using database-stored templates.
---File Storage: Local disk storage for uploaded documents (medical and police files) with permission flags.
---Background Jobs: node-cron schedules periodic tasks (document upload checks, OTP refresh, token blacklist cleanup).

-Features
---Recruiter
---CSV bulk import of candidates and recruiters (with automatic OTP generation and email)
---User management: list, filter, edit, and resend OTP
---Document review: approve/reject medical and police documents with rejection reasons
---Final clearance and joining letter status updates
---Hospital list management (CRUD + CSV upload)
---Email template management (create, edit, delete)
---Bulk email sending to filtered users (by batch, role, document status)
---Dashboard with batch-wise statistics and recent candidates
---Notifications for document uploads and bulk email results

--Candidate
---First-login OTP verification and password setup
---Upload medical and police documents (with recruiter-controlled re-upload permissions)
---View document statuses (pending, completed, rejected)
---Read-only hospital list

--Security
---JWT with 30-minute expiration
---httpOnly cookies prevent XSS token theft
---Token blacklist on logout
---Failed login attempts with temporary lockout
---Role-based access control (recruiter / candidate)
---Input validation and SQL injection prevention (parameterized queries)

--Technologies
---Node.js, Express.js, PostgreSQL
---React, React Router, Axios, Tailwind CSS
---bcryptjs, jsonwebtoken, cookie-parser, cors
---Multer (file upload), node-cron (scheduling)
---Nodemailer / Mailgun (email)
---Git for version control

--Database Schema
--Core tables:
---users – profile data (employee_id, name, email, role, batch)
---auth – password hash, failed attempts, lockout, last login
---first_login – OTP and validity for new users
---dox – document file paths, statuses, permissions, final clearance, joining letter
---templates – email templates (name, subject, body)
---email_logs – audit of sent emails (status, error)
---notifications – recruiter alerts
---hosp_list – hospital list (name, unique address)
---token_blacklist – revoked JWT tokens

--API Endpoints (Selected)
---POST /api/auth/login – unified login (email + credential + role)
---POST /api/auth/set-password – set password after OTP
---POST /api/auth/logout – logout with token blacklist
---POST /api/recruiter/candidates/upload – CSV bulk import
---GET /api/recruiter/users – list users with filters and pagination
---PATCH /api/recruiter/users/:id – update user profile
---PATCH /api/recruiter/candidates/:id/documents/medical – update medical status

POST /api/recruiter/emails/bulk – bulk email sending

GET /api/candidates/documents – get candidate’s document status

POST /api/candidates/documents/medical – upload medical document
