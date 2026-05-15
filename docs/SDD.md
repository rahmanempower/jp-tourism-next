


SOFTWARE DESIGN DOCUMENT
Travel & Visa Services Platform
Version 1.0  |  Architecture, Database, API & UI Specification

Tech Stack	Next.js 14 | MongoDB | Prisma ORM | PrimeReact | AWS S3
Auth	JWT Middleware — Role-Based Access Control (RBAC)
Notifications	WhatsApp Business API
Storage	AWS S3 Buckets (Documents, KYC, Invoices)
Date	May 11, 2026
 
Table of Contents
Table of Contents	1
1.1 Purpose	1
1.2 Scope	1
1.3 Stakeholders	1
1.4 Technology Stack	1
2.1 High-Level Architecture	1
2.2 Middleware Architecture	1
2.3 Directory Structure (Next.js)	1
3.1 User Model	1
3.2 Vendor Model	1
3.3 Agency Model	1
3.4 ServiceListing Model	1
3.5 Enquiry Model	1
3.6 DraftPackage Model	1
3.7 Booking Model	1
3.8 Customer Model (CRM)	1
3.9 WalletTransaction Model	1
3.10 EscrowLedger Model	1
3.11 Document Model	1
3.12 Invoice Model	1
3.13 Notification Model	1
3.14 AuditLog Model	1
4.1 Authentication API	1
4.2 Vendor Management API	1
4.3 Marketplace / Service Listings API	1
4.4 Enquiry & Draft Package API	1
4.5 Booking & Order Management API	1
4.6 CRM API	1
4.7 Wallet & Escrow API	1
4.8 Document Management API	1
4.9 Notifications API	1
4.10 Invoice & Billing API	1
4.11 Admin & RBAC API	1
5.1 Role Definitions	1
5.2 Module Access Matrix	1
6.1 Authentication Stories	1
6.2 Marketplace Stories	1
6.3 Enquiry & Draft Package Stories	1
6.4 Booking & Order Management Stories	1
6.5 CRM Stories	1
6.6 Wallet & Financial Stories	1
6.7 Document Management Stories	1
6.8 Vendor Management Stories	1
6.9 Notification Stories	1
6.10 Admin Dashboard Stories	1
7.1 Bucket Structure	1
7.2 Upload Flow	1
7.3 Bucket Policies	1
8.1 Integration	1
8.2 Notification Triggers	1
9.1 Architecture	1
9.2 Webhook Payload Contract	1

 
1. Introduction & System Overview

1.1 Purpose
This Software Design Document (SDD) describes the architecture, database schema, API design, and UI specifications for a multi-tenant, web-based platform serving the travel, visa, and attestation industry. It is intended for engineering teams, architects, and stakeholders involved in building and maintaining the system.

1.2 Scope
The platform enables Travel Agencies to discover vendor services, build draft packages, manage customer bookings, handle payments via wallet/escrow, and track order fulfilment — all within a governed marketplace controlled by an Admin.

1.3 Stakeholders
Stakeholder	Role
Platform Owner / Admin	Governance, approvals, financial control, system oversight
Vendors	Tour operators, visa agents, attestation providers — service providers in the marketplace
Travel Agencies (Clients)	Primary platform users; discover services, build packages, manage bookings and customers
End Customers	Indirectly served through agencies; final beneficiaries of travel/visa services

1.4 Technology Stack
Layer	Technology
Frontend Framework	Next.js 14 (App Router, Server Components)
UI Library	PrimeReact + PrimeFlex + PrimeIcons
Database	MongoDB (via Atlas)
ORM	Prisma ORM (with MongoDB connector)
Authentication	NextAuth.js + JWT Middleware
File Storage	AWS S3 (signed URLs, bucket policies per role)
Notifications	WhatsApp Business API (Meta Cloud API)
Hosting	Vercel (frontend) + MongoDB Atlas (database)
API Style	Next.js Route Handlers (REST, JSON)
 
2. System Architecture

2.1 High-Level Architecture
The platform follows a layered Next.js App Router architecture with server-side rendering, API route handlers, and Prisma as the database access layer.

Presentation Layer
Next.js App Router PrimeReact / PrimeFlex Server & Client Components	Application Layer
Next.js Route Handlers Middleware (JWT/RBAC) Business Logic Services	Data Layer
Prisma ORM MongoDB Atlas AWS S3 WhatsApp API

2.2 Middleware Architecture
All API routes pass through a centralized Next.js Middleware that enforces authentication and authorization before the request reaches route handlers.

Middleware Layer	Responsibility
Authentication Check	Validates JWT token from Authorization header or cookie
Session Hydration	Attaches user object (id, role, tenantId) to request context
Role Guard	Compares route prefix with RBAC matrix; returns 403 on mismatch
Tenant Isolation	Injects tenantId filter into all Prisma queries via middleware hook
Rate Limiting	Per-IP and per-user rate limiting via Redis (Upstash)
Audit Logging	Writes action logs for sensitive mutations

2.3 Directory Structure (Next.js)
The recommended project directory layout:

Path	Description
app/	Next.js App Router root
app/api/	All REST API Route Handlers
app/(admin)/	Admin portal layout group
app/(vendor)/	Vendor portal layout group
app/(agency)/	Agency portal layout group
components/	Shared PrimeReact UI components
lib/prisma.ts	Prisma client singleton
lib/s3.ts	AWS S3 upload/presign utilities
lib/whatsapp.ts	WhatsApp notification helpers
middleware.ts	JWT + RBAC middleware
prisma/schema.prisma	Prisma schema (MongoDB)
 
3. Database Design (MongoDB + Prisma)

All models use MongoDB ObjectId (String @id @default(auto()) @map("_id") @db.ObjectId). Timestamps (createdAt, updatedAt) are present on all models.

3.1 User Model
Central authentication and identity model shared across all roles.

Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
email	String	Unique, Required	Login email address
passwordHash	String	Required	Bcrypt hashed password
role	Enum	Required	SUPER_ADMIN | ADMIN | VENDOR | AGENCY_OWNER | AGENCY_STAFF
firstName	String	Required	User first name
lastName	String	Required	User last name
phone	String	Optional	Mobile number for WhatsApp notifications
isActive	Boolean	Default: true	Account active status
isEmailVerified	Boolean	Default: false	Email verification flag
vendorId	String?	FK, ObjectId	Linked vendor profile (if role=VENDOR)
agencyId	String?	FK, ObjectId	Linked agency profile (if role=AGENCY_*)
lastLoginAt	DateTime?	Optional	Last successful login timestamp
createdAt	DateTime	Auto	Record creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.2 Vendor Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
businessName	String	Required	Registered business name
slug	String	Unique	URL-friendly identifier
category	Enum[]	Required	UMRAH | VISA | ATTESTATION | HOTEL | TRANSPORT
kycStatus	Enum	Required	PENDING | UNDER_REVIEW | APPROVED | REJECTED
kycDocuments	Json[]	Optional	Array of S3 document references [{key, type, uploadedAt}]
contactEmail	String	Required	Primary contact email
contactPhone	String	Required	WhatsApp-enabled contact number
address	Json	Optional	Structured address object {street, city, country}
bankDetails	Json	Encrypted	Bank account details for payouts (AES encrypted)
isActive	Boolean	Default: false	Activated only after KYC approval
rating	Float	Default: 0	Computed average rating
slaBreachCount	Int	Default: 0	Cumulative SLA breach counter
createdAt	DateTime	Auto	Onboarding timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.3 Agency Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
businessName	String	Required	Travel agency business name
slug	String	Unique	URL-friendly identifier
licenseNumber	String	Optional, Unique	Government travel license number
contactEmail	String	Required	Primary contact email
contactPhone	String	Required	Primary phone / WhatsApp
walletBalance	Float	Default: 0	Current wallet balance in base currency
creditLimit	Float	Default: 0	Pre-approved credit limit (Admin-set)
isActive	Boolean	Default: true	Agency active status
createdAt	DateTime	Auto	Registration timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.4 ServiceListing Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
vendorId	String	FK, Required	Owning vendor
category	Enum	Required	UMRAH | VISA | ATTESTATION | HOTEL | TRANSPORT
title	String	Required	Service title / name
description	String	Optional	Detailed description
destinationCountry	String	Required	ISO-3166-1 alpha-2 country code
inclusions	String[]	Required	Array of included items
requiredDocuments	Json[]	Required	[{name, mandatory, description}]
basePrice	Float	Required	Vendor's fixed price (platform currency)
currency	String	Default: USD	ISO 4217 currency code
slaDays	Int	Required	Standard processing time in business days
status	Enum	Required	DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | ARCHIVED
approvedBy	String?	FK: User	Admin who approved the listing
approvedAt	DateTime?	Optional	Approval timestamp
inventoryCount	Int?	Optional	Available slots (null = unlimited)
tags	String[]	Optional	Searchable tags
createdAt	DateTime	Auto	Creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.5 Enquiry Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
agencyId	String	FK, Required	Agency creating the enquiry
customerId	String?	FK, Optional	Linked CRM customer profile
title	String	Required	Enquiry title / reference
status	Enum	Required	OPEN | DRAFT_CREATED | QUOTED | CONVERTED | LOST
notes	String?	Optional	Internal agency notes
createdBy	String	FK: User	Staff member who created the enquiry
createdAt	DateTime	Auto	Creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.6 DraftPackage Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
enquiryId	String	FK, Required	Parent enquiry
agencyId	String	FK, Required	Owning agency
version	Int	Default: 1	Version number for draft versioning
title	String	Required	Package title
items	Json[]	Required	[{listingId, qty, vendorPrice, agencyMargin, totalPrice}]
subtotal	Float	Computed	Sum of vendor prices
marginTotal	Float	Computed	Sum of agency margins
grandTotal	Float	Computed	Subtotal + margin total
quotationPdfKey	String?	S3 Key	Generated PDF quotation path in S3
whatsappSent	Boolean	Default: false	Whether quotation was shared via WhatsApp
expiresAt	DateTime?	Optional	Quotation expiry datetime
status	Enum	Required	DRAFT | SENT | EXPIRED | CONVERTED
createdAt	DateTime	Auto	Creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.7 Booking Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
bookingRef	String	Unique, Auto-gen	Human-readable reference (e.g. BK-2024-00123)
agencyId	String	FK, Required	Booking agency
customerId	String	FK, Required	End customer
draftPackageId	String?	FK, Optional	Source draft package (if converted)
listingId	String	FK, Required	Service listing booked
vendorId	String	FK, Required	Assigned vendor
quantity	Int	Required	Number of units / pax
vendorPrice	Float	Required	Revalidated vendor price at booking time
agencyMargin	Float	Required	Agency applied margin
platformCommission	Float	Required	Platform commission amount
totalAmount	Float	Required	Total charged to agency wallet
escrowAmount	Float	Required	Amount held in escrow
status	Enum	Required	PENDING | CONFIRMED | PROCESSING | COMPLETED | CANCELLED | REFUNDED
pipelineStage	Enum	Required	ENQUIRY | BOOKING_CREATED | DOCS_SUBMITTED | PROCESSING | COMPLETED
notes	String?	Optional	Agency/vendor notes
createdAt	DateTime	Auto	Booking creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.8 Customer Model (CRM)
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
agencyId	String	FK, Required	Owning agency (tenant isolation)
firstName	String	Required	Customer first name
lastName	String	Required	Customer last name
email	String	Optional	Customer email
phone	String	Required	WhatsApp-enabled phone
nationality	String	Optional	ISO-3166-1 alpha-2
passportNumber	String	Encrypted	Passport number (AES encrypted at rest)
passportExpiry	DateTime?	Optional	Passport expiry date
dateOfBirth	DateTime?	Optional	Date of birth
tags	String[]	Optional	CRM classification tags
pipelineStage	Enum	Required	LEAD | ENQUIRY | BOOKING | PROCESSING | COMPLETED
createdAt	DateTime	Auto	Record creation timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.9 WalletTransaction Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
agencyId	String	FK, Required	Agency wallet owner
type	Enum	Required	CREDIT | DEBIT | ESCROW_HOLD | ESCROW_RELEASE | REFUND | COMMISSION
amount	Float	Required	Transaction amount (always positive)
balanceBefore	Float	Required	Balance before transaction
balanceAfter	Float	Required	Balance after transaction
referenceType	String?	Optional	Booking | Recharge | Refund (polymorphic)
referenceId	String?	FK, Optional	Linked booking or recharge ID
description	String	Required	Human-readable transaction note
status	Enum	Required	PENDING | COMPLETED | FAILED | REVERSED
createdAt	DateTime	Auto	Transaction timestamp

3.10 EscrowLedger Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
bookingId	String	FK, Required, Unique	One escrow record per booking
agencyId	String	FK, Required	Paying agency
vendorId	String	FK, Required	Receiving vendor
amount	Float	Required	Escrowed amount
commission	Float	Required	Platform commission to deduct on release
status	Enum	Required	HELD | RELEASED | REFUNDED | DISPUTED
heldAt	DateTime	Required	Escrow hold timestamp
releasedAt	DateTime?	Optional	Release timestamp
releasedBy	String?	FK: User	Admin or system that released funds

3.11 Document Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
bookingId	String	FK, Required	Associated booking
customerId	String	FK, Required	Document owner (customer)
agencyId	String	FK, Required	Uploading agency (tenant)
type	String	Required	PASSPORT | VISA | NID | PHOTO | OTHER
name	String	Required	Document display name
s3Key	String	Required, Unique	S3 object key for the uploaded file
s3Bucket	String	Required	S3 bucket name
mimeType	String	Required	File MIME type (e.g. application/pdf)
fileSizeBytes	Int	Required	File size in bytes
reviewStatus	Enum	Required	PENDING | APPROVED | REJECTED
reviewedBy	String?	FK: User	Vendor or admin who reviewed
reviewNote	String?	Optional	Rejection reason or review note
uploadedAt	DateTime	Auto	Upload timestamp
updatedAt	DateTime	Auto	Last update timestamp

3.12 Invoice Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
invoiceNumber	String	Unique, Auto-gen	Sequential invoice number (INV-2024-00456)
agencyId	String	FK, Required	Billed agency
bookingId	String?	FK, Optional	Linked booking (if booking invoice)
type	Enum	Required	BOOKING | WALLET_RECHARGE | COMMISSION | REFUND
lineItems	Json[]	Required	[{description, qty, unitPrice, total}]
subtotal	Float	Required	Pre-tax subtotal
taxAmount	Float	Default: 0	Applicable tax (extensible)
totalAmount	Float	Required	Total invoice amount
status	Enum	Required	DRAFT | ISSUED | PAID | VOID
s3Key	String?	S3 Key	Generated PDF invoice S3 key
issuedAt	DateTime?	Optional	Invoice issue date
dueAt	DateTime?	Optional	Payment due date
createdAt	DateTime	Auto	Creation timestamp

3.13 Notification Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
userId	String	FK, Required	Target user
type	Enum	Required	BOOKING | DOCUMENT | PAYMENT | STATUS_CHANGE | SYSTEM
channel	Enum	Required	IN_APP | WHATSAPP | EMAIL
title	String	Required	Notification title
message	String	Required	Notification body
referenceId	String?	Optional	ID of linked entity (bookingId, etc.)
isRead	Boolean	Default: false	Read status for in-app notifications
deliveryStatus	Enum	Required	PENDING | SENT | DELIVERED | FAILED
createdAt	DateTime	Auto	Creation timestamp

3.14 AuditLog Model
Field	Type	Constraints	Description
id	String	PK, ObjectId	MongoDB document ID
userId	String	FK, Required	User who performed the action
action	String	Required	Action name (e.g. BOOKING_CREATED, STATUS_UPDATED)
entityType	String	Required	Affected model name (Booking, Document, etc.)
entityId	String	Required	Affected record ID
oldValue	Json?	Optional	Previous state snapshot
newValue	Json?	Optional	New state snapshot
ipAddress	String?	Optional	Client IP address
userAgent	String?	Optional	Browser/client user agent
createdAt	DateTime	Auto	Log timestamp
 
4. API Design (Next.js Route Handlers)

All endpoints require Authorization: Bearer <JWT>. Responses follow { success, data, error, meta } envelope. Pagination uses ?page=1&limit=20.

4.1 Authentication API
Method	Endpoint	Auth	Description
POST	/api/auth/register	Public	Register new user (agency or vendor). Sends email verification.
POST	/api/auth/login	Public	Authenticate user; returns JWT access token + refresh token.
POST	/api/auth/refresh	Refresh Token	Exchange refresh token for new access token.
POST	/api/auth/logout	JWT	Invalidate refresh token server-side.
POST	/api/auth/forgot-password	Public	Send password reset email.
POST	/api/auth/reset-password	Reset Token	Set new password using reset token.
GET	/api/auth/me	JWT	Get current authenticated user profile.

4.2 Vendor Management API
Method	Endpoint	Auth	Description
POST	/api/vendors	Admin	Create vendor profile (onboarding).
GET	/api/vendors	Admin	List all vendors with KYC status filters.
GET	/api/vendors/:id	Admin | Vendor(own)	Get vendor detail by ID.
PUT	/api/vendors/:id	Admin | Vendor(own)	Update vendor profile details.
PATCH	/api/vendors/:id/kyc	Admin	Approve or reject KYC; triggers activation.
POST	/api/vendors/:id/kyc/documents	Vendor(own)	Upload KYC document to S3; returns presigned URL.
GET	/api/vendors/:id/performance	Admin | Vendor(own)	SLA metrics, breach count, ratings.
PATCH	/api/vendors/:id/status	Admin	Activate or deactivate vendor account.

4.3 Marketplace / Service Listings API
Method	Endpoint	Auth	Description
POST	/api/listings	Vendor	Create a new service listing (status: DRAFT).
GET	/api/listings	JWT	List approved listings with search/filter (category, country, price range, SLA).
GET	/api/listings/:id	JWT	Get listing detail including required documents.
PUT	/api/listings/:id	Vendor(own)	Update listing; resets to PENDING_APPROVAL.
PATCH	/api/listings/:id/approve	Admin	Approve or reject listing with optional note.
DELETE	/api/listings/:id	Vendor(own) | Admin	Archive listing (soft delete).
GET	/api/listings/search	JWT	Full-text + faceted search across listings.

4.4 Enquiry & Draft Package API
Method	Endpoint	Auth	Description
POST	/api/enquiries	Agency	Create new customer enquiry.
GET	/api/enquiries	Agency	List agency's enquiries with status filter.
GET	/api/enquiries/:id	Agency	Get enquiry with linked draft packages.
PATCH	/api/enquiries/:id	Agency	Update enquiry status or notes.
POST	/api/enquiries/:id/drafts	Agency	Create new draft package version under enquiry.
GET	/api/enquiries/:id/drafts	Agency	List all draft versions for an enquiry.
GET	/api/drafts/:id	Agency	Get full draft package with margin calculation.
PUT	/api/drafts/:id	Agency	Update draft items and margins; creates new version.
POST	/api/drafts/:id/quotation	Agency	Generate PDF quotation and store to S3.
POST	/api/drafts/:id/share	Agency	Share quotation via WhatsApp to customer.
POST	/api/drafts/:id/convert	Agency	Convert draft to booking; triggers escrow hold.

4.5 Booking & Order Management API
Method	Endpoint	Auth	Description
POST	/api/bookings	Agency	Create booking from direct listing or draft conversion.
GET	/api/bookings	Agency | Admin | Vendor	List bookings (scoped by role/tenant).
GET	/api/bookings/:id	Agency | Admin | Vendor(assigned)	Get full booking detail with timeline.
PATCH	/api/bookings/:id/status	Vendor(assigned) | Admin	Update booking pipeline stage and status.
PATCH	/api/bookings/:id/override	Admin	Admin override for any booking field.
POST	/api/bookings/:id/cancel	Agency | Admin	Cancel booking; triggers refund workflow.
GET	/api/bookings/:id/timeline	Agency | Admin | Vendor	Get full status change timeline with timestamps.
GET	/api/bookings/:id/documents	Agency | Vendor(assigned)	List documents for a booking.

4.6 CRM API
Method	Endpoint	Auth	Description
POST	/api/customers	Agency	Create new customer profile.
GET	/api/customers	Agency	List agency customers with pipeline stage filter.
GET	/api/customers/:id	Agency	Get customer detail with bookings and documents.
PUT	/api/customers/:id	Agency	Update customer profile.
DELETE	/api/customers/:id	Agency	Soft delete customer record.
PATCH	/api/customers/:id/pipeline	Agency	Move customer to new pipeline stage.
GET	/api/customers/:id/documents	Agency	List all documents associated with customer.

4.7 Wallet & Escrow API
Method	Endpoint	Auth	Description
GET	/api/wallet/:agencyId	Agency(own) | Admin	Get wallet balance and recent transactions.
POST	/api/wallet/:agencyId/recharge	Agency(own) | Admin	Initiate wallet recharge via gateway or manual credit.
GET	/api/wallet/:agencyId/transactions	Agency(own) | Admin	Paginated transaction history with filters.
GET	/api/escrow/:bookingId	Admin | Agency(own) | Vendor(assigned)	Get escrow record for a booking.
POST	/api/escrow/:bookingId/release	Admin	Release escrow to vendor after booking completion.
POST	/api/escrow/:bookingId/refund	Admin	Refund escrowed amount to agency wallet.

4.8 Document Management API
Method	Endpoint	Auth	Description
POST	/api/documents/presign	Agency	Get S3 presigned URL for direct browser upload.
POST	/api/documents	Agency	Register document metadata after S3 upload.
GET	/api/documents/:id	Agency | Vendor(assigned) | Admin	Get document metadata and presigned download URL.
PATCH	/api/documents/:id/review	Vendor(assigned) | Admin	Approve or reject uploaded document.
DELETE	/api/documents/:id	Agency(own) | Admin	Delete document (S3 + record).

4.9 Notifications API
Method	Endpoint	Auth	Description
GET	/api/notifications	JWT	Get user's notification inbox (unread first).
PATCH	/api/notifications/:id/read	JWT	Mark a single notification as read.
PATCH	/api/notifications/read-all	JWT	Mark all notifications as read.
POST	/api/notifications/whatsapp	System (internal)	Trigger WhatsApp message via Meta Cloud API.

4.10 Invoice & Billing API
Method	Endpoint	Auth	Description
POST	/api/invoices/generate	System | Admin	Generate invoice for booking or recharge event.
GET	/api/invoices	Agency | Admin	List invoices with type/status filter.
GET	/api/invoices/:id	Agency(own) | Admin	Get invoice detail with line items.
GET	/api/invoices/:id/download	Agency(own) | Admin	Get presigned URL for PDF invoice download.
PATCH	/api/invoices/:id/void	Admin	Void an issued invoice with reason.

4.11 Admin & RBAC API
Method	Endpoint	Auth	Description
GET	/api/admin/dashboard	Admin	Platform KPIs: revenue, bookings, active vendors, agencies.
GET	/api/admin/agencies	Admin	List all agencies with wallet and booking stats.
PATCH	/api/admin/agencies/:id/credit	Admin	Set credit limit for an agency.
GET	/api/admin/audit-logs	Super Admin	Query audit log with entity/user/action filters.
GET	/api/admin/commissions	Admin	Commission report by vendor, period, and service.
POST	/api/admin/inventory/sync	Admin	Trigger manual inventory sync job for a vendor.
 
5. Role-Based Access Control (RBAC)

5.1 Role Definitions
Role	Description
SUPER_ADMIN	Full system access including user management, audit logs, and financial overrides
ADMIN	Platform governance, listing approvals, financial control, reporting
VENDOR	Manage own listings, update booking status, review documents, view assigned orders
AGENCY_OWNER	Full agency access — bookings, CRM, wallet, staff management
AGENCY_STAFF	Create enquiries, bookings, upload documents (no wallet/financial access)

5.2 Module Access Matrix
Module	Super Admin	Admin	Vendor	Agency Owner	Agency Staff
Marketplace	Full	Full	Own Listings	Read	Read
Vendor Mgmt	Full	Full	Own Profile	—	—
KYC Approval	Full	Full	—	—	—
Enquiries	Full	Read	—	Full	Create/Edit
Draft Packages	Full	Read	—	Full	Create/Edit
Bookings	Full	Full	Assigned	Full	Create/View
CRM	Full	Read	—	Full	Create/Edit
Wallet	Full	Full	—	View/Recharge	—
Escrow	Full	Full	—	View	—
Documents	Full	Full	Review (Assigned)	Upload/View	Upload
Invoices	Full	Full	—	View	—
Notifications	Full	Full	Own	Own	Own
Audit Logs	Full	Read	—	—	—
Admin Dashboard	Full	Full	—	—	—
 
6. UI Stories & Acceptance Criteria

All UI components use PrimeReact + PrimeFlex + PrimeIcons. Layout uses PrimeFlex grid system. Authentication pages are full-screen, portal pages use a sidebar layout.

6.1 Authentication Stories
ID	Story	Acceptance Criteria	Priority
AUTH-01	As a user, I want to log in with email and password so I can access my role-based portal.	Email + password form. JWT stored in httpOnly cookie. Role-based redirect on success.	Critical
AUTH-02	As a new agency, I want to register my business so I can start using the platform.	Registration form with business name, email, phone. Email verification required before login.	Critical
AUTH-03	As a user, I want to reset my forgotten password via email link.	Forgot password form. Email with expiring reset link. Password confirmation field.	High
AUTH-04	As an admin, I want to impersonate agency users for support purposes.	Admin 'login as' feature. Audit log entry created. Banner shown during impersonation.	Medium

6.2 Marketplace Stories
ID	Story	Acceptance Criteria	Priority
MKT-01	As an agency, I want to search and filter service listings so I can find relevant vendor services.	DataTable/DataView with filters: category, country, price range, SLA. PrimeReact FilterMatchMode.	Critical
MKT-02	As an agency, I want to view a listing detail page with inclusions, documents, and pricing.	Accordion for inclusions. Tag list for required docs. Price card with add-to-draft button.	Critical
MKT-03	As a vendor, I want to create a service listing with all required fields.	Multi-step form (Stepper). Category dropdown, price input, SLA spinner, document checklist builder.	Critical
MKT-04	As an admin, I want to approve or reject vendor listings from a review queue.	Listing review panel. Side-by-side field view. Approve/Reject buttons with optional rejection message Dialog.	Critical
MKT-05	As an agency, I want to compare up to 3 listings side by side before selecting.	Compare mode toggle. Side-by-side comparison table. Highlight difference rows.	Medium

6.3 Enquiry & Draft Package Stories
ID	Story	Acceptance Criteria	Priority
ENQ-01	As an agency, I want to create an enquiry from a marketplace listing and link it to a customer.	Enquiry creation Dialog on listing page. Customer selector (Dropdown with search). Auto-saves as draft.	Critical
ENQ-02	As an agency, I want to build a draft package by combining multiple services with custom margins.	Package builder page. Dynamic item list (add/remove). Per-item margin input (%). Real-time grand total calculation.	Critical
ENQ-03	As an agency, I want to generate a PDF quotation for a draft package to share with my customer.	Generate PDF button. Preview in Dialog or new tab. Download button. Share via WhatsApp button.	Critical
ENQ-04	As an agency, I want to see version history of a draft package.	Version timeline in Sidebar. Each version shows date, changes, and creator. Restore version button.	High
ENQ-05	As an agency, I want to convert a confirmed draft package into a booking with one click.	Convert to Booking CTA. Pricing revalidation step shown. Wallet balance check. Confirmation Dialog.	Critical

6.4 Booking & Order Management Stories
ID	Story	Acceptance Criteria	Priority
BKG-01	As an agency, I want to view all my bookings in a searchable, filterable list.	DataTable with columns: Ref, Customer, Service, Status, Amount, Date. Filter by status, date range, vendor. Export CSV.	Critical
BKG-02	As an agency, I want to view the full details and timeline of a booking.	Booking detail page. Status Badge. Timeline component showing all stage changes with timestamps and actor.	Critical
BKG-03	As a vendor, I want to update the status of my assigned bookings.	Vendor order list. Status update dropdown per booking. Confirmation step. Notification triggered on change.	Critical
BKG-04	As an admin, I want to override any booking status and add an admin note.	Admin override panel in booking detail. Free-form status selector. Mandatory note field. Audit logged.	High
BKG-05	As an agency, I want to cancel a booking and receive a refund to my wallet.	Cancel booking button with confirmation Dialog. Cancellation reason selector. Refund policy shown. Wallet credited on success.	High

6.5 CRM Stories
ID	Story	Acceptance Criteria	Priority
CRM-01	As an agency, I want to manage my customer database with profile information and documents.	Customer list DataTable. Add/Edit customer form in Sidebar. Passport, DOB fields. Document list tab.	Critical
CRM-02	As an agency, I want to visualize my customer pipeline stages.	Kanban-style pipeline view using PrimeReact drag-drop. Stage columns: Lead, Enquiry, Booking, Processing, Completed.	High
CRM-03	As an agency, I want to upload and manage customer documents linked to bookings.	Document upload component with file type validation. Progress bar during upload. Review status badges (Pending/Approved/Rejected).	Critical
CRM-04	As an agency, I want to search customers by name, phone, or passport number.	Global search with debounce. Encrypted field search on passport. Results highlight matching term.	High

6.6 Wallet & Financial Stories
ID	Story	Acceptance Criteria	Priority
WAL-01	As an agency, I want to see my wallet balance and recent transactions on my dashboard.	Dashboard wallet card showing balance. Quick stats: pending escrow, last 5 transactions. Recharge button.	Critical
WAL-02	As an agency, I want to recharge my wallet via payment gateway or bank transfer.	Recharge Dialog with amount input. Gateway selector (Stripe/Razorpay). Manual recharge with reference upload.	Critical
WAL-03	As an agency, I want to view a full transaction ledger with filters.	Transactions DataTable: type, amount, balance after, reference, date. Filter by type and date range. Export CSV.	High
WAL-04	As an admin, I want to view escrow ledger for all bookings.	Escrow overview table. Status filter (Held, Released, Refunded). Total held amount KPI card. Release button per row.	Critical

6.7 Document Management Stories
ID	Story	Acceptance Criteria	Priority
DOC-01	As an agency, I want to upload documents for a booking using a drag-and-drop interface.	PrimeReact FileUpload component. Drag-and-drop zone. File type/size validation. Progress indicator. S3 direct upload.	Critical
DOC-02	As a vendor, I want to review uploaded documents and approve or reject them.	Document review queue. Preview in Dialog (PDF/image). Approve and Reject buttons. Reject reason field. Status updated + notification sent.	Critical
DOC-03	As an admin, I want to define document checklists per service category.	Document template builder. Per-category checklist (Umrah, Visa, Attestation). Add/remove/reorder documents. Mandatory flag toggle.	High

6.8 Vendor Management Stories
ID	Story	Acceptance Criteria	Priority
VND-01	As a vendor, I want to complete my KYC onboarding by uploading required documents.	KYC wizard (Stepper). Document upload per requirement. Submit for review button. Status tracking badge.	Critical
VND-02	As an admin, I want to review and approve/reject vendor KYC applications.	KYC review queue. Document previewer. Field comparison. Approve with notes / Reject with reason. Email/WhatsApp notification triggered.	Critical
VND-03	As an admin, I want to monitor vendor SLA performance with breach alerts.	Vendor performance dashboard. SLA compliance % chart (Chart.js). Breach count badge. Breach list with booking links.	High
VND-04	As a vendor, I want to manage my listing inventory to prevent overbooking.	Inventory management panel. Real-time count display. Manual adjustment input. Webhook sync status indicator.	High

6.9 Notification Stories
ID	Story	Acceptance Criteria	Priority
NOT-01	As any user, I want to see real-time in-app notifications for platform events.	Bell icon in navbar with unread count Badge. Notification Overlay Panel. Click to navigate to relevant record.	Critical
NOT-02	As an agency, I want to receive WhatsApp messages for key booking events.	WhatsApp notification on: booking confirmed, document requested, status changed, payment processed. Opt-out setting available.	Critical
NOT-03	As an admin, I want to send broadcast notifications to all agencies or vendors.	Broadcast notification composer. Target selector (all agencies, all vendors, specific agency). Preview WhatsApp template. Send confirmation.	Medium

6.10 Admin Dashboard Stories
ID	Story	Acceptance Criteria	Priority
ADM-01	As an admin, I want a dashboard overview of platform KPIs.	KPI cards: Total Bookings, Revenue MTD, Active Vendors, Active Agencies, Pending Approvals. Charts: booking trend (line), revenue by category (pie).	Critical
ADM-02	As an admin, I want to view and export commission reports.	Commission DataTable: vendor, period, bookings, gross, commission. Date range picker. Group by vendor/category. CSV export.	High
ADM-03	As a super admin, I want to view the full system audit log.	Audit log table: timestamp, user, action, entity, changes. Expandable row for old/new JSON diff. Filter by user, action, date.	High
 
7. AWS S3 Architecture

7.1 Bucket Structure
S3 Path Pattern	Purpose
kyc/{vendorId}/{documentType}/{filename}	Vendor KYC documents (private, admin-only access)
bookings/{agencyId}/{bookingId}/documents/{filename}	Customer booking documents (agency + vendor access)
listings/{vendorId}/assets/{filename}	Listing images and marketing assets (public CDN)
invoices/{agencyId}/{year}/{month}/{invoiceId}.pdf	Generated invoice PDFs (agency read access)
quotations/{agencyId}/{draftId}/v{version}.pdf	Draft package quotation PDFs (agency access)
exports/{adminUserId}/{jobId}.csv	Admin-generated reports (temp, auto-deleted after 24h)

7.2 Upload Flow
1.	Agency/Vendor requests presigned URL from /api/documents/presign
2.	Backend validates role, generates S3 presigned PUT URL (15min expiry)
3.	Frontend uploads file directly to S3 using presigned URL
4.	On upload success, frontend calls /api/documents to register metadata in MongoDB
5.	Backend verifies S3 object exists (HeadObject) before saving record
6.	Presigned GET URL generated on demand for document preview/download

7.3 Bucket Policies
Bucket	Access Policy
KYC Bucket	Private. Only Lambda/API role has read. Presigned URLs for Admin only (1h expiry).
Documents Bucket	Private. Presigned URLs scoped to agency + assigned vendor. 2h expiry.
Listings Bucket	Public read (CDN). Write restricted to platform API role.
Invoices Bucket	Private. Presigned URLs for agency owner only. 30min expiry.
Quotations Bucket	Private. Presigned URLs for agency. 24h expiry for sharing.
 
8. WhatsApp Notification System

8.1 Integration
WhatsApp notifications use the Meta Cloud API (WhatsApp Business Platform). All messages must use pre-approved message templates with variable substitution.

8.2 Notification Triggers
Event	Recipient(s)	Template Variables
Booking Created	Agency Owner, Customer	{{booking_ref}}, {{service}}, {{amount}}
Document Requested	Agency, Customer	{{booking_ref}}, {{document_list}}
Document Rejected	Agency	{{booking_ref}}, {{doc_name}}, {{reason}}
Status Updated	Agency, Customer	{{booking_ref}}, {{old_status}}, {{new_status}}
Payment Confirmed	Agency Owner	{{amount}}, {{balance}}, {{ref}}
Booking Completed	Agency, Customer	{{booking_ref}}, {{service}}, {{vendor}}
KYC Approved/Rejected	Vendor	{{vendor_name}}, {{status}}, {{reason?}}
Quotation Shared	Customer	{{agency_name}}, {{package_title}}, {{pdf_link}}
 
9. Vendor Inventory & API Sync

9.1 Architecture
Component	Description
Webhook Endpoint	POST /api/vendors/:id/inventory/webhook — receives real-time push updates from vendor's system
Scheduled Sync	Cron job (every 15min) pulls inventory from vendor API endpoint (fallback when webhook unavailable)
Token Auth	Vendor registers API key in dashboard; platform uses Bearer token for pull requests
Reconciliation	Daily job compares platform inventory counts against vendor API; flags discrepancies
Conflict Resolution	Lower of (platform count, vendor count) is used; admin alerted on large discrepancies

9.2 Webhook Payload Contract
Vendors must send updates in the following JSON format:

Field	Type	Description
listingId	String	Platform listing ID to update
availableCount	Integer	Current available inventory slots
event	String	SALE | CANCELLATION | ADJUSTMENT
externalRef	String	Vendor's internal order reference
timestamp	ISO8601	Event timestamp from vendor's system
 
10. Non-Functional Requirements

Category	Requirement	Implementation
Performance	Page load < 2s, API response < 500ms (p95)	Server Components, ISR caching, MongoDB indexes
Security	OWASP Top 10 compliance, data encryption at rest	JWT rotation, AES-256 for PII, parameterized queries
Availability	99.9% uptime SLA	Vercel Edge, MongoDB Atlas M10+ replica set
Scalability	Support 1000+ concurrent agency users	Stateless API, connection pooling, horizontal scaling
Tenant Isolation	Agency data fully isolated	AgencyId filter on all Prisma queries, middleware enforced
Audit Trail	All mutations logged with user + timestamp	AuditLog model, Prisma middleware hook on writes
Accessibility	WCAG 2.1 AA compliance	PrimeReact ARIA attributes, keyboard navigation
Mobile	Responsive design (≥ 768px), mobile-first	PrimeFlex grid, responsive DataTable
 

