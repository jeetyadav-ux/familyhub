# FAMILYHUB – FINAL MASTER PRODUCT & DEVELOPMENT PROMPT

## 1. YOUR ROLE AND OBJECTIVE

Act as a Senior Product Architect, UI/UX Designer, Full-Stack Developer, Mobile Application Engineer, Database Architect, Security Engineer and QA Lead.

I want you to design and develop a complete, production-ready family management application named **FamilyHub** for Android and iOS, with an optional responsive web-based administration interface.

FamilyHub will be an all-in-one private family ecosystem that allows family members to manage:

1. Personal and family finances.
2. Expenses and income.
3. Bank accounts, credit cards and UPI.
4. Budgets and expense forecasting.
5. EMI and loans.
6. Shopping and grocery lists.
7. Family expense splitting.
8. Family chat.
9. Family documents and photos.
10. Medicine and health records.
11. Family tasks and reminders.
12. Calendar and events.
13. Household bills and subscriptions.
14. Meal planning and recipes.
15. Household inventory.
16. Vehicles and property.
17. Travel planning.
18. Savings goals.
19. Family member management.
20. AI Family Assistant.
21. Backup and restore.
22. App updates and version management.

The application should combine the useful capabilities of personal finance apps, family budgeting apps, shopping list apps, document vaults, medicine reminder apps, family communication apps and household management apps.

**Important: Build a real, functional application, not just a UI prototype.**

Every button, form, menu, dashboard, filter, notification, API, database operation and workflow must perform its intended action.

Do not create dummy buttons, hardcoded dashboard numbers, fake transaction data presented as real data, or non-functional screens.

---

# 2. TECHNOLOGY STACK AND ARCHITECTURE

Use the following preferred technology stack, subject to technical validation.

### Mobile application
- React Native
- Expo
- TypeScript
- Native modules when required.

### Backend
- Node.js
- NestJS or Express
- REST APIs
- WebSockets or Supabase Realtime.

### Database
- PostgreSQL
- Supabase or equivalent managed backend.
- Proper relational database design.
- Row Level Security.
- Server-side authorization.

### Authentication
- Mobile number OTP authentication.
- Google Sign-In as an optional additional login method.

### Storage
- Secure cloud object storage for documents, photos and receipts.
- Optional encrypted Google Drive backup.

### Notifications
- Firebase Cloud Messaging for Android.
- Apple Push Notification service for iOS.
- Local device notifications for time-sensitive reminders.

### Integrations
- Gmail API.
- Microsoft Graph where feasible.
- Google Drive API.
- OCR services.
- AI services through secure server-side APIs.

Use modular architecture, reusable components, centralized validation, secure APIs, database migrations and maintainable code.

Before implementation, provide:
- Proposed architecture.
- Technology decisions.
- Database schema.
- API structure.
- Authentication and authorization design.
- Application navigation.
- Development phases.
- Deployment requirements.
- Estimated infrastructure requirements.

Do not compromise security or platform compliance to implement a feature.

---

# 3. USER REGISTRATION AND FAMILY MANAGEMENT

## Registration and login

Primary login must be:

- Mobile number.
- Country code, default +91.
- Six-digit OTP verification.

Google Sign-In can be provided as an additional account-linking or login option.

Each family member must have an independent account and login session.

## Family creation

- The first registered user can create a family workspace.
- The creator becomes Family Admin.
- Invite family members using mobile number, SMS invitation link, QR code or shareable invitation link.
- Existing users should join without creating duplicate accounts.
- A user can belong to multiple family workspaces.
- Provide an easy family-switching option.

## Family roles

Implement:

1. Family Admin.
2. Adult Member.
3. Child Member.
4. Viewer.

Permissions must be validated on the backend.

### Recommended permissions

**Family Admin**
- Invite and remove members.
- Manage family permissions.
- Manage family settings.
- Manage shared records.
- Permanently delete authorized shared records.
- Manage backup and full family restore.
- Delete the family workspace.

**Adult Member**
- Add and edit authorized records.
- Manage personal information.
- Manage shared shopping, tasks and expenses according to permissions.
- Archive and restore authorized records.
- Mark incorrect transactions as excluded.
- Upload authorized documents.

**Child Member**
- Restricted access to assigned tasks, allowances, shopping and approved family information.

**Viewer**
- Read-only access to authorized information.

Provide an optional Secondary Admin to prevent loss of family access if the primary Admin becomes unavailable.

Personal records must remain private and owner-controlled unless explicitly shared.

Removing a member must revoke their access to that family without deleting their entire FamilyHub account.

---

# 4. HOME DASHBOARD AND NAVIGATION

Create a modern, premium, family-friendly interface.

### Home dashboard

Display:

- Total family expenses this month.
- Total family income.
- Monthly budget.
- Amount spent.
- Remaining budget.
- Savings progress.
- Upcoming bills.
- Upcoming EMIs.
- Credit card payment reminders.
- Recent transactions.
- Pending shopping items.
- Today's tasks.
- Upcoming events.
- Medicine reminders.
- Document expiry alerts.
- Family activity.

Allow users to customize dashboard widgets.

### Main navigation

Use a simple navigation structure:

1. Home
2. Finance
3. Shopping
4. Health
5. Family
6. More

The More section should contain:

- Income.
- Bank Accounts.
- Credit Cards.
- EMI & Loans.
- Budgets.
- Family Vault.
- Chat.
- Tasks.
- Calendar.
- Bills.
- Subscriptions.
- Meal Planner.
- Inventory.
- Vehicles.
- Property.
- Travel.
- Savings Goals.
- Family Members.
- Settings.

Provide a floating Quick Add button for:
- Expense.
- Income.
- Shopping item.
- Shopping list.
- Task.
- Reminder.
- Document.
- Calendar event.

Support light mode and dark mode, accessible typography, responsive layouts and a consistent design system.

---

# 5. FINANCE MANAGEMENT

This is one of the most important modules.

## 5.1 Expense management

Support automatic and manual expense tracking.

### Automatic expense detection

Implement available, permitted and platform-compliant methods:

- Android SMS transaction detection, only where permitted.
- Gmail transaction email integration through OAuth.
- Microsoft Outlook integration where feasible.
- Forwarded transaction emails.
- Receipt and invoice OCR.
- iOS share-to-app workflow.
- Manual expense entry.

Do not assume iOS permits unrestricted SMS inbox access.

Manual entry must always remain available.

### Expense fields

Every expense should support:

- Amount.
- Merchant/shop name.
- Category and subcategory.
- Transaction date and time.
- Payment method.
- Specific bank account, card or UPI source.
- Transaction reference.
- Paid by.
- Personal or family designation.
- Transaction source.
- Notes.
- Receipt image or attachment.
- Related shopping list/item.
- EMI reference.
- Transaction status.

Merchant name should be mandatory when identifiable. Otherwise, use "Unknown Merchant" and allow manual correction.

### Default categories

- Grocery.
- Food & Dining.
- Shopping.
- Entertainment.
- Travel.
- Transportation.
- Fuel.
- Rent.
- Electricity.
- Water.
- Mobile & Internet.
- Healthcare.
- Education.
- Insurance.
- EMI & Loans.
- Credit Card Payments.
- Subscriptions.
- Personal Care.
- Home Maintenance.
- Children.
- Pets.
- Gifts & Donations.
- Investments.
- Miscellaneous.

Allow custom categories, subcategories, icons and colors.

### Transaction management

Users must be able to:

- Add expenses.
- Edit and correct expenses.
- Change merchant and category.
- Change amount, date and payment source.
- Split a transaction into multiple categories.
- Upload, replace or remove authorized receipts.
- Add notes.
- Mark duplicates.
- Exclude incorrect detections.
- Archive and restore records.

Implement these statuses:

- Active.
- Pending Review.
- Excluded – Not an Expense.
- Excluded – Not an Income.
- Duplicate.
- Archived.
- Corrected.

Excluded transactions must not contribute to financial calculations, budgets or reports.

Archived valid transactions must remain included in calculations unless separately excluded.

Never discard the original details or audit history of an excluded transaction.

### Accounting rules

Implement correct accounting logic:

- Credit card purchases count as expenses.
- Credit card bill payments are settlements, not additional expenses.
- Transfers between a user's own accounts are not income or expenses.
- Refunds should be linked to original expenses wherever possible.
- EMI purchases and repayments must not cause double counting.
- Split transactions must reconcile to the original total.
- Pending expected bills must not count as actual expenses.

## 5.2 Income management

Support:

- Salary.
- Business income.
- Freelancing.
- Rental income.
- Interest.
- Dividends.
- Cashback.
- Refunds.
- Gifts.
- Other income.

Fields:

- Amount.
- Income source/payer.
- Category.
- Received by.
- Date.
- Account/payment source.
- Personal or family designation.
- Notes.
- Attachments.
- Recurring or one-time income.

Support automatic detection where feasible and manual entry.

Own-account transfers must not be classified as income.

Link refunds to original expenses where possible.

## 5.3 Bank accounts and payment methods

Support multiple:

- Bank accounts.
- Debit cards.
- Credit cards.
- UPI accounts.
- Cash.
- Digital wallets.
- Net banking.
- Gift cards.
- BNPL.
- Other payment methods.

Capture:

- Bank/provider name.
- Account nickname.
- Account type.
- Masked account number.
- Card nickname.
- Last four digits.
- Card network.
- Account owner.
- Personal/family designation.
- Credit limit.
- Manually maintained available credit limit.
- Billing date.
- Due date.
- Active/inactive status.

Never store full card numbers, CVV, PIN, OTP or banking passwords.

### Payment selection workflow

When creating an expense:

1. Select Cash, UPI, Debit Card, Credit Card, Bank Transfer, Wallet or Other.
2. Display registered sources under the selected method.
3. Select the exact account or card.
4. Allow adding a new payment source directly.
5. Remember the last-used method as a convenience, but do not silently select it for a new transaction.

Example:
- HDFC Regalia •4521.
- ICICI Amazon Pay •8721.
- SBI Savings Account •1234.
- Google Pay.
- PhonePe.
- Cash.

Provide account-wise, card-wise, payment-method-wise and member-wise analytics.

## 5.4 Credit card management

Create a dedicated credit card dashboard.

Display:

- Credit limit.
- Available limit.
- Outstanding balance.
- Billing cycle.
- Statement generation date.
- Payment due date.
- Total bill.
- Minimum amount due.
- Previous unpaid balance.
- Payment status.
- Recent purchases.

Support multiple credit cards.

Provide reminders before due dates and card-wise transaction history.

Clearly distinguish purchases from card bill settlements.

## 5.5 EMI and loan management

Support:

- Credit card EMI.
- Personal loans.
- Home loans.
- Vehicle loans.
- Education loans.
- Consumer durable loans.
- Zero-cost EMI.

Capture:

- Purchase description.
- Merchant.
- Purchase amount.
- Down payment.
- Loan amount.
- Interest rate.
- Processing fee.
- EMI amount.
- Tenure.
- Start/end date.
- Lender.
- Paid EMIs.
- Remaining EMIs.
- Outstanding principal.
- Next due date.
- Loan owner.

Provide EMI schedules, reminders, paid/missed status, early repayment and foreclosure tracking.

Prevent double counting between original purchases and repayments.

---

# 6. BUDGETING AND EXPENSE FORECASTING

Create a complete budgeting and expense forecasting module.

### Budget setup

Support:

- Monthly budgets.
- Annual budgets.
- Custom-period budgets.
- Family budgets.
- Individual member budgets.
- Category and subcategory budgets.
- Personal and shared budgets.

Users can set budgets manually or use historical spending as a recommendation.

### Budget dashboard

Display:

- Total budget.
- Actual spending.
- Remaining budget.
- Utilization percentage.
- Forecasted month-end spending.
- Expected savings.
- Over-budget categories.
- Categories at risk.

Example:

| Category | Budget | Spent | Remaining |
|---|---:|---:|---:|
| Grocery | ₹15,000 | ₹9,000 | ₹6,000 |
| Shopping | ₹10,000 | ₹7,500 | ₹2,500 |
| Fuel | ₹5,000 | ₹3,000 | ₹2,000 |
| Healthcare | ₹5,000 | ₹2,000 | ₹3,000 |

### Forecasting

Use available 3, 6 and 12-month transaction history.

Calculate:

- Average monthly spending.
- Current spending pace.
- Expected month-end spending.
- Recurring expenses.
- Upcoming bills and EMIs.
- Category-wise forecast.
- Savings forecast.
- Overspending risk.

Clearly distinguish actual figures from estimates and predictions.

Show calculation basis and confidence level.

### Daily spending guidance

Calculate a suggested daily spending limit based on:

- Remaining budget.
- Days remaining in the month.
- Upcoming fixed expenses.
- User-configured savings goals.

### Alerts

Support configurable alerts at:

- 50%.
- 75%.
- 90%.
- 100%.

Also support projected overspending, upcoming bills and savings-goal risk alerts.

### Additional features

- Month-on-month comparison.
- Year-on-year comparison.
- Budget rollover.
- Savings goals.
- Purchase affordability calculator.
- What-if scenarios.
- AI budgeting recommendations.

Never change an approved budget automatically without user confirmation.

### Budget calculation rules

- Excluded transactions are not included.
- Archived valid transactions remain included.
- Credit card bill settlements are not additional expenses.
- Own-account transfers are excluded.
- Refunds reduce the original expense where possible.
- Personal expenses are excluded from shared family budgets unless configured otherwise.
- Forecasts remain separate from actual financial records.

---

# 7. SHOPPING AND GROCERY MANAGEMENT

Create a real-time shared shopping module.

### Categories

- Grocery.
- Vegetables and Fruits.
- Dairy.
- Household.
- Medicines.
- Clothing.
- Electronics.
- Kids.
- Personal Care.
- Custom categories.

### Shopping list fields

- Item name.
- Item photo.
- Quantity.
- Unit.
- Estimated price.
- Actual purchase price.
- Category.
- Preferred merchant.
- Assigned member.
- Added by.
- Priority.
- Notes.
- Status.

### Features

- Create shared lists.
- Add, edit and remove items.
- Assign items to family members.
- Mark items completed.
- Mark items purchased.
- Mark items not required.
- Create recurring lists.
- Duplicate previous lists.
- Upload photos using camera or gallery.
- Real-time synchronization.

### Purchase tracking

On purchase, capture:

- Actual price.
- Quantity.
- Merchant.
- Purchase date.
- Paid by.
- Receipt.
- Payment method.

Offer to create an expense after purchase confirmation.

Never create an expense automatically without a confirmed amount.

Show shopping history, previous prices and merchant history.

---

# 8. FAMILY EXPENSE SPLITTING AND SETTLEMENT

Allow family members to split shared expenses.

Example:

One member pays ₹3,000 for groceries.

Allocation:
- Member A: ₹1,000.
- Member B: ₹1,000.
- Member C: ₹1,000.

Display:

- Who paid.
- Who benefited.
- Amount owed.
- Amount settled.
- Outstanding balance.
- Settlement history.

Avoid creating duplicate expenses during settlement.

---

# 9. FAMILY CHAT

Build an integrated family messaging system.

Features:

- Family group chat.
- One-to-one chat.
- Text messages.
- Photos.
- Documents.
- Voice messages.
- Replies.
- Reactions.
- Read receipts.
- Typing indicators.
- Search.
- Timestamps.
- Push notifications.
- Edit/delete messages subject to permissions and retention rules.

Allow sharing:

- Expenses.
- Shopping lists.
- Shopping items.
- Documents.
- Tasks.
- Calendar events.
- Reminders.

Allow conversion of chat content into a task, expense or shopping item only after confirmation.

Keep chat messages separate from financial records unless explicitly converted.

---

# 10. FAMILY VAULT – DOCUMENTS AND PHOTOS

Create a secure digital family document repository.

### Categories

**Identity**
- Aadhaar.
- PAN.
- Passport.
- Driving Licence.
- Voter ID.
- Birth Certificate.
- Marriage Certificate.
- Education Documents.

**Insurance**
- Health Insurance.
- Life Insurance.
- Motor Insurance.
- Shop Insurance.
- Policy Documents.
- Claims.
- Premium Receipts.

**Financial**
- Bank Statements.
- Loan Documents.
- Tax Documents.
- ITR.
- Salary Documents.
- Investment Documents.

**Property and Vehicles**
- Property Documents.
- Rent Agreements.
- Sale Deeds.
- Vehicle RC.
- Vehicle Insurance.
- PUC.
- Service Records.

**Medical**
- Prescriptions.
- Test Reports.
- X-rays.
- Ultrasound.
- MRI.
- CT Scans.
- Discharge Summaries.
- Medical Bills.
- Vaccination Records.

**Other**
- School Documents.
- Warranties.
- Invoices.
- Legal Documents.
- Family Photos and Videos.

### Features

- Upload from camera, gallery or file picker.
- Support PDF, DOC, DOCX, XLS, XLSX, JPG and PNG.
- Multiple uploads.
- Preview and download.
- Search and filters.
- Custom folders.
- Favorites and tags.
- Rename, move, replace, archive and restore.
- Secure sharing with authorized members.
- Personal and shared folders.
- Expiry reminders.

Capture:

- Document name.
- Category.
- Owner.
- Issue date.
- Expiry date.
- Issuing authority.
- Document number, where required.
- Notes.
- Visibility.
- Uploaded by.

Provide configurable 30-day, 15-day and 7-day expiry reminders.

Provide optional biometric protection for sensitive documents.

OCR can suggest document type, category and expiry date, but the user must confirm extracted information.

Avoid unnecessarily sending sensitive document numbers to external AI services.

Include optional Emergency Access, allowing a trusted adult to request access to selected important documents under predefined, auditable rules.

---

# 11. MEDICINE AND HEALTH MANAGEMENT

Create a dedicated health module with strong privacy controls.

## Health profiles

Maintain separate health profiles for each family member.

Medical information must be private by default and visible only to authorized users.

## Medicine management

Allow users to:

- Add medicine manually.
- Scan medicine packaging.
- Upload prescriptions.
- Add medicine photos.

Fields:

- Medicine name.
- Brand/generic name.
- Strength.
- Dosage.
- Frequency.
- Food instructions.
- Start date.
- End date.
- Prescriber.
- Assigned family member.
- Prescription attachment.
- Special instructions.

## Medicine reminders

Support:

- Multiple reminders per day.
- Weekly schedules.
- Selected weekdays.
- Custom intervals.
- Snooze.
- Taken.
- Skipped.
- Missed.

Never automatically mark medicine as taken.

Maintain administration history with scheduled and actual times.

Provide daily, weekly and monthly adherence summaries.

## Medicine inventory

Track:

- Available quantity.
- Dosage per day.
- Estimated remaining stock.
- Purchase date.
- Expiry date.
- Pharmacy.
- Price.

Estimate stock depletion and provide configurable refill reminders, such as 7, 3 and 0 days before depletion.

## Doctor and hospital appointments

Capture:

- Doctor/hospital.
- Appointment purpose.
- Family member.
- Date and time.
- Contact details.
- Location.
- Notes.
- Prescription.
- Reminder.
- Status: Upcoming, Rescheduled, Cancelled or Completed.

Link consultation expenses where appropriate.

## Medical records

Store:

- Prescriptions.
- Blood tests.
- X-rays.
- Ultrasound.
- MRI.
- CT scans.
- Discharge summaries.
- Medical bills.
- Vaccination records.

## Medical expenses and medicine shopping

Allow expenses to be linked to:

- Pharmacy/hospital.
- Medicine.
- Appointment.
- Family member.
- Amount.
- Date.
- Payment source.
- Category.
- Bill photo.

Integrate medicine purchases into the Shopping module.

Allow users to add medicine to a shopping list, upload a prescription, assign a buyer, enter actual price and create an expense after purchase confirmation.

Do not automatically change a medicine schedule based on a purchase.

## Health dashboard

Display:

- Today's medicine schedule.
- Upcoming reminders.
- Missed doses.
- Low medicine stock.
- Upcoming appointments.
- Recent medical records.
- Medical expenses.

AI may help extract information and organize records, but must not diagnose, prescribe, change dosages or advise stopping medicines.

Use local notifications for reliable scheduled reminders, with server synchronization as a secondary mechanism.

---

# 12. FAMILY TASKS AND REMINDERS

Create a shared family task management module.

Each task should include:

- Task title.
- Description.
- Assigned member.
- Created by.
- Due date.
- Priority.
- Reminder.
- Category.
- Attachment.
- Status.

Statuses:

- Pending.
- In Progress.
- Completed.
- Not Required.
- Cancelled.
- Archived.

Support:
- Assigning tasks.
- Reassigning tasks.
- Editing due dates.
- Recurring tasks.
- Reminders.
- Completion tracking.
- Family task dashboard.
- Task history.

Examples:
- Pay electricity bill.
- Buy groceries.
- Renew vehicle insurance.
- Visit doctor.
- Pay school fees.
- Service the car.

---

# 13. FAMILY CALENDAR AND EVENTS

Create a shared calendar.

Support:

- Birthdays.
- Anniversaries.
- School events.
- Doctor appointments.
- Family functions.
- Trips.
- Festivals.
- Bill due dates.
- EMI due dates.
- Insurance renewals.
- Custom events.

Features:

- Daily, weekly and monthly views.
- Recurring events.
- Event reminders.
- Member assignment.
- Event invitations.
- Attachments.
- Calendar synchronization where feasible.

---

# 14. BILLS AND SUBSCRIPTIONS

Create a dedicated bills management module.

Support:

- Electricity.
- Water.
- Gas.
- Broadband.
- Mobile.
- DTH.
- Rent.
- School fees.
- Credit card bills.
- Insurance premiums.
- EMIs.
- Subscriptions.
- Other recurring payments.

Capture:

- Provider.
- Bill type.
- Amount.
- Due date.
- Billing frequency.
- Payment source.
- Paid by.
- Status.
- Receipt.

Support reminders, recurring bills, payment history and missed-payment alerts.

Detect recurring subscriptions from imported transactions or emails where feasible.

Never mark a bill paid without confirmation or reliable payment evidence.

---

# 15. MEAL PLANNING AND RECIPES

Create a family meal planner.

Features:

- Breakfast, lunch, dinner and snacks.
- Daily and weekly meal plans.
- Recipe library.
- Ingredients.
- Preparation instructions.
- Serving quantity.
- Meal preferences.
- Family member assignment.

Allow ingredients to be converted into shopping list items.

Avoid automatically treating a planned meal or estimated ingredient cost as an actual expense.

---

# 16. HOUSEHOLD INVENTORY

Track household items and supplies.

Examples:

- Grocery stock.
- Cleaning supplies.
- Medicines.
- Toiletries.
- Household consumables.

Fields:

- Item name.
- Category.
- Quantity.
- Unit.
- Purchase date.
- Expiry date.
- Minimum stock level.
- Storage location.

Provide:

- Current inventory.
- Low-stock alerts.
- Expiry alerts.
- Purchase history.
- Shopping list integration.

Do not assume stock changes without a user-confirmed purchase, consumption or manual adjustment.

---

# 17. VEHICLE MANAGEMENT

Allow users to manage family vehicles.

Fields:

- Vehicle name.
- Registration number.
- Owner.
- Vehicle type.
- Purchase date.
- Insurance details.
- PUC details.
- Service history.
- Fuel expenses.
- Maintenance expenses.

Provide reminders for:

- Insurance renewal.
- PUC renewal.
- Service due date.
- Registration-related deadlines.

Allow uploading RC, insurance, PUC and service documents to Family Vault.

---

# 18. PROPERTY MANAGEMENT

Allow management of family properties.

Fields:

- Property name.
- Address.
- Ownership.
- Purchase date.
- Purchase value.
- Rent details.
- Tenant details, where applicable.
- Maintenance.
- Property tax.
- Insurance.
- Documents.

Provide rent tracking, maintenance reminders and document storage.

Restrict property information according to family permissions.

---

# 19. TRAVEL PLANNING

Create a family travel planner.

Support:

- Trip name.
- Destination.
- Start/end dates.
- Travelling members.
- Hotels.
- Transport.
- Itinerary.
- Packing checklist.
- Budget.
- Travel documents.
- Travel expenses.
- Photos.

Link trip expenses to Finance and travel documents to Family Vault.

---

# 20. SAVINGS GOALS

Allow family members to create goals such as:

- Emergency Fund.
- Vacation.
- Car.
- Home.
- Education.
- Other purchases.

Capture:

- Goal name.
- Target amount.
- Current savings.
- Target date.
- Contribution frequency.
- Contributing members.

Show progress, remaining amount and estimated completion date.

Allow contributions to be linked to actual financial accounts without double counting transfers as income.

---

# 21. AI FAMILY ASSISTANT

Create an AI-powered Family Assistant that can answer questions using only data the requesting user is authorized to access.

Example questions:

- How much did our family spend this month?
- How much did we spend on groceries?
- Which category exceeded its budget?
- How much did I spend through my HDFC credit card?
- What are the upcoming EMIs?
- Which bills are due this week?
- What medicines need to be refilled?
- Which documents expire next month?
- What items are pending in our shopping list?
- How much did each family member contribute?
- How much can we safely spend this month based on our budget?

### AI requirements

- Use actual authorized database records.
- Support date-range calculations.
- Explain calculation basis.
- Distinguish actual figures from estimates.
- Respect personal and shared data permissions.
- Never expose another member's private data without authorization.
- Require confirmation before creating, modifying or deleting records.
- Never make financial, medical or other high-impact decisions automatically.
- Do not invent transactions or data when records are missing.

---

# 22. PHOTOS, RECEIPTS AND ATTACHMENTS

Allow photo and document uploads throughout the app.

Support:

- Camera.
- Gallery.
- Native photo picker.
- File picker.
- Multiple uploads.
- Preview.
- Remove/replace.
- Full-screen viewing.
- Zoom.
- PDF viewing.
- Secure cloud storage.

Use minimum necessary device permissions.

Compress images while preserving receipt readability.

### OCR and image recognition

For receipts, optionally extract:

- Merchant.
- Date.
- Amount.
- Tax.
- Discount.
- Item details.
- Suggested category.

For shopping images, suggest item names and categories.

For documents, suggest type and expiry date.

All extracted information must be confirmed by the user before saving.

---

# 23. BACKUP AND RESTORE

Implement a complete backup and restore system.

### Backup architecture

Use:
1. Backend database as the primary source of truth.
2. Secure cloud object storage for attachments.
3. Optional encrypted Google Drive backup as an additional recovery mechanism.

Google Sign-In and Google Drive backup must be separate features.

Do not request unnecessary Google Drive permissions. Use minimum OAuth scopes and an application-specific storage area where supported.

### Backup data

Support backup of:

- Family profiles.
- Family membership and permissions.
- Transactions.
- Income.
- Categories.
- Merchants.
- Masked account details.
- Budgets.
- EMIs and loans.
- Shopping lists.
- Chat history.
- Documents.
- Photos.
- Medicine schedules.
- Medical records, subject to consent.
- Tasks.
- Events.
- Settings.

Never back up OTPs, passwords, CVVs, PINs or banking credentials.

### Backup options

- Automatic daily backup.
- Weekly backup.
- Manual backup.
- Wi-Fi-only option.
- Charging-only option.
- Backup status.
- Last successful backup.
- Failed backup alerts.
- Backup history.

### Restore

After login and identity verification:

- Detect available backups.
- Display backup date and version.
- Show backup contents and record counts.
- Allow full restore.
- Allow selective module/record restore.
- Detect duplicates.
- Preserve user permissions.
- Restore attachment references.
- Maintain recovery history.

Before restoring, create a recovery snapshot of current data.

Never silently overwrite newer records.

Provide preview and explicit confirmation before restoring.

Support family-level and personal backups. Do not make the entire family dependent on one member's Google account.

---

# 24. RECORD EDITING, ARCHIVING, DELETION AND ADMIN CONTROLS

Implement a complete record lifecycle and audit system.

### Regular member permissions

According to permissions, members can:

- Add records.
- Edit and correct records.
- Change category.
- Change merchant.
- Change payment source.
- Add or replace attachments.
- Mark items completed.
- Mark records not required.
- Exclude incorrect transactions.
- Archive records.
- Restore authorized archived records.

### Admin permissions

Only the Family Admin or explicitly delegated authorized administrator can:

- Permanently delete shared family records.
- Manage family permissions.
- Remove members.
- Perform full family restore.
- Delete the family workspace.

Personal records remain owner-controlled according to the privacy and retention policy.

### Archive and recycle bin

Provide an Archive section containing:

- Expenses.
- Income.
- Shopping items.
- Tasks.
- Documents.
- Other supported records.

Display:

- Record name.
- Record type.
- Archived by.
- Archive date.
- Original category.
- Amount, where relevant.

Allow authorized restoration.

Implement soft deletion and a configurable recycle-bin retention period, subject to applicable legal and compliance requirements.

### Audit history

Maintain:

- Created by/date.
- Modified by/date.
- Old and new values.
- Reason for correction, where supplied.
- Excluded by.
- Archived by.
- Restored by.
- Deleted by.
- Restore details.

Critical administrative actions must require confirmation and reauthentication or OTP where appropriate.

---

# 25. APP UPDATES AND VERSION MANAGEMENT

Implement a complete app update management feature.

### User-facing features

Add an **App Updates** option under Settings.

Display:

- Installed app version.
- Build number.
- Latest available version.
- Update status.
- Release notes.

Provide:

- Check for Updates.
- Update Now.
- Remind Me Later for optional updates.
- Update notifications.
- Progress indication where supported.

Release notes should include:

- New features.
- Improvements.
- Bug fixes.
- Security updates.

### Android

- Use Google Play's official in-app update mechanism where supported.
- Provide an option to open the Play Store listing.
- Do not bypass Android security or silently install unauthorized APK files.

### iOS

- Use official Apple App Store update mechanisms.
- Provide an option to open the FamilyHub App Store listing.

### Developer-controlled version management

Create a secure backend-controlled version management system.

Authorized developers can configure:

- Latest Android version.
- Latest iOS version.
- Minimum supported version.
- Latest build number.
- Mandatory/optional update.
- Release date.
- Release notes.
- Official store URL.
- Maintenance notifications.

Support staged rollouts and the ability to pause a rollout if a critical issue is detected.

### Compatibility and safety

- Preserve user data and login sessions during updates.
- Maintain API and database compatibility.
- Test migrations and backward compatibility.
- Do not delete local data during an update.
- Clearly explain mandatory security updates.
- Do not unnecessarily block access to emergency information or essential data.

Use official Google Play and Apple App Store distribution channels for production updates.

---

# 26. NOTIFICATIONS AND ALERT MANAGEMENT

Build a centralized notification system.

Support notifications for:

- New expenses.
- Transactions requiring review.
- Budget thresholds.
- Projected overspending.
- Shopping list changes.
- Assigned tasks.
- Chat messages.
- EMI due dates.
- Credit card bills.
- Utility bills.
- Subscription renewals.
- Document expiry.
- Medicine reminders.
- Medicine stock.
- Doctor appointments.
- Family events.
- Savings goals.
- Backup success/failure.
- App updates.
- Maintenance announcements.

Allow users to configure notification preferences by category.

Support in-app notifications, push notifications and local notifications as appropriate.

Prevent duplicate notifications and respect user settings and device permissions.

---

# 27. SECURITY, PRIVACY AND DATA PROTECTION

Security is a mandatory requirement.

Implement:

- Secure authentication.
- OTP verification and rate limiting.
- Secure token management.
- Encrypted network communication.
- Encryption at rest.
- Secure object storage.
- Server-side authorization.
- Database Row Level Security.
- Family-level data isolation.
- Personal record isolation.
- Audit logs.
- Secure document access.
- Secure backup encryption.
- Session management.
- Account recovery.
- Data export.
- Account deletion.
- Consent management.
- Privacy controls.

Never expose private family records through insecure APIs.

Never store full payment card numbers, CVV, ATM PIN, OTP or bank passwords.

Use minimum permissions for device access and external integrations.

Sensitive health and identity information must have additional access controls.

Design privacy and retention policies appropriate to applicable Indian data protection requirements and relevant platform rules.

---

# 28. DATABASE DESIGN

Design a normalized PostgreSQL database.

Include appropriate entities, relationships, indexes, constraints, timestamps, audit history and migration scripts.

At minimum, consider:

### Users and families
- Users
- Families
- FamilyMembers
- Invitations
- Roles
- Permissions
- Sessions

### Finance
- Transactions
- TransactionSplits
- Income
- ExpenseCategories
- IncomeCategories
- Merchants
- BankAccounts
- CreditCards
- PaymentMethods
- Refunds
- Loans
- EMISchedules
- EMITransactions

### Budgets
- Budgets
- BudgetPeriods
- BudgetAllocations
- BudgetCategories
- ExpectedExpenses
- Forecasts
- BudgetAlerts
- SavingsGoals
- SavingsContributions

### Shopping
- ShoppingLists
- ShoppingItems
- ShoppingPurchases
- ShoppingCategories
- ExpenseSettlements

### Communication
- ChatConversations
- ChatParticipants
- ChatMessages
- MessageAttachments
- MessageReactions

### Documents and media
- FamilyDocuments
- DocumentCategories
- Folders
- Attachments
- Photos
- DocumentPermissions

### Health
- HealthProfiles
- Medicines
- MedicineSchedules
- MedicineLogs
- MedicineInventory
- MedicalRecords
- Prescriptions
- DoctorAppointments
- Vaccinations

### Household
- Tasks
- Reminders
- CalendarEvents
- Bills
- RecurringPayments
- HouseholdInventory
- Recipes
- MealPlans
- Vehicles
- Properties
- TravelPlans

### System
- Notifications
- EmailConnections
- SMSProcessingLogs
- TransactionReviewLogs
- AuditLogs
- BackupRecords
- RestoreHistory
- AppVersions
- ReleaseNotes
- SystemSettings

Add or modify entities as required after validating the complete application workflows.

Do not store sensitive credentials in ordinary application tables.

---

# 29. REPORTS AND ANALYTICS

Create useful dashboards and reports.

### Finance reports
- Daily expenses.
- Weekly expenses.
- Monthly expenses.
- Annual expenses.
- Income vs expenses.
- Savings.
- Category-wise expenses.
- Merchant-wise expenses.
- Member-wise expenses.
- Payment-source-wise expenses.
- Account-wise spending.
- Credit card spending.
- EMI obligations.
- Recurring expenses.

### Budget reports
- Budget vs actual.
- Category utilization.
- Month-end forecast.
- Overspending.
- Savings performance.
- Historical comparisons.

### Shopping reports
- Shopping history.
- Merchant comparison.
- Previous purchase prices.
- Member-wise purchases.
- Monthly grocery spending.

### Health reports
- Medicine adherence history.
- Medical expenses.
- Appointment history.
- Medicine inventory.

Support date filters, member filters, categories and downloadable reports where appropriate.

All reports must use real database data and consistent accounting rules.

---

# 30. DEVELOPMENT PHASES

Do not attempt to build all modules simultaneously without a tested foundation.

Develop the application in phases while maintaining one unified architecture.

### Phase 1 – Foundation and Core Family System

- Project setup.
- Authentication.
- OTP login.
- User profiles.
- Family creation.
- Family invitations.
- Family roles and permissions.
- Home dashboard.
- Navigation.
- Database and backend foundation.

### Phase 2 – Core Finance

- Expense management.
- Manual transactions.
- Income.
- Categories.
- Merchants.
- Bank accounts.
- Cards.
- UPI.
- Payment methods.
- Transaction correction and exclusion.
- Finance reports.

### Phase 3 – Budget and Financial Planning

- Monthly budgets.
- Category budgets.
- Individual and family budgets.
- Forecasting.
- Budget alerts.
- Credit card dashboard.
- EMI and loans.
- Savings goals.

### Phase 4 – Shopping and Family Collaboration

- Shopping lists.
- Shopping items.
- Photos.
- Purchase tracking.
- Expense creation workflow.
- Family expense splitting.
- Settlement tracking.
- Family chat.

### Phase 5 – Vault and Backup

- Family Vault.
- Document categories.
- Document permissions.
- Photo and document uploads.
- OCR.
- Expiry reminders.
- Backup.
- Restore.
- Archive and recycle bin.
- Audit history.

### Phase 6 – Health and Household

- Health profiles.
- Medicine management.
- Medicine reminders.
- Medicine inventory.
- Medical records.
- Doctor appointments.
- Health expenses.
- Tasks.
- Calendar.
- Bills.
- Subscriptions.

### Phase 7 – Additional Family Modules

- Meal planning.
- Recipes.
- Household inventory.
- Vehicles.
- Property.
- Travel.
- Advanced savings features.

### Phase 8 – Intelligence and Production Readiness

- AI Family Assistant.
- Advanced forecasting.
- Receipt OCR.
- Smart recommendations.
- Email integrations.
- Supported Android transaction detection.
- App update management.
- Security testing.
- Performance optimization.
- Production deployment.

The phases are development priorities, not separate applications. All modules must integrate into the same FamilyHub ecosystem.

---

# 31. TESTING AND QUALITY ASSURANCE

Implement proper testing before declaring any module complete.

### Functional testing

Test:

- OTP registration.
- Login and logout.
- Family creation.
- Invitations.
- Member removal.
- Permission enforcement.
- Expense entry.
- Income entry.
- Transaction correction.
- Category changes.
- Account and card selection.
- Budget calculations.
- Forecasting.
- EMI calculations.
- Shopping workflows.
- Expense splitting.
- Document uploads.
- Medicine reminders.
- Chat.
- Backup and restore.
- App updates.

### Financial calculation testing

Specifically test:

- Credit card purchases versus bill payments.
- Own-account transfers.
- Refunds.
- EMI accounting.
- Split transactions.
- Excluded transactions.
- Archived transactions.
- Personal versus shared budgets.
- Forecasts versus actuals.

### Security testing

Test:

- Unauthorized API access.
- Family data isolation.
- Personal data privacy.
- Role permissions.
- Document access.
- Session security.
- Backup security.
- Account recovery.

### Cross-platform testing

Test on Android and iOS.

Verify:
- Camera and gallery.
- File picker.
- Push notifications.
- Local notifications.
- App background behavior.
- Offline behavior.
- Synchronization.
- Network interruption.
- App upgrades.
- Data migration.

Do not mark a phase complete until its core workflows and tests pass.

---

# 32. UI/UX DESIGN REQUIREMENTS

The application should feel like a polished commercial product.

Design principles:

- Modern.
- Clean.
- Premium.
- Family-friendly.
- Easy to understand.
- Minimal unnecessary navigation.
- Consistent colors and typography.
- Accessible touch targets.
- Responsive layouts.
- Light and dark themes.
- Clear empty states.
- Loading states.
- Error messages.
- Success confirmations.

Use reusable components.

Provide consistent forms, cards, tables, charts, filters and modal dialogs.

Avoid overcrowding the home screen.

Make financial information easy to read.

Use charts only where they improve understanding.

All screens must support appropriate loading, empty, offline and error states.

---

# 33. IMPLEMENTATION RULES – VERY IMPORTANT

Follow these rules throughout development:

1. Build a complete and working application, not a static prototype.
2. Do not create dummy buttons or pretend functionality.
3. Do not hardcode financial dashboard values.
4. Use real backend APIs and persistent database storage.
5. Use proper authentication and authorization.
6. Maintain family and personal data separation.
7. Implement all financial calculations consistently.
8. Use reusable components and modular code.
9. Keep Android and iOS compatibility in mind.
10. Do not request unnecessary device permissions.
11. Follow Google Play and Apple App Store policies.
12. Handle errors and network interruptions.
13. Provide database migrations.
14. Provide API documentation.
15. Provide automated tests.
16. Never expose secrets or API keys in frontend code.
17. Never silently delete or overwrite user data.
18. Ask for confirmation before important financial or administrative actions.
19. Do not implement a feature in a way that compromises security.
20. Keep all modules integrated into one application.

If a feature requires an external API, paid service, provider account or special platform permission, explain the dependency and implement the supported parts without pretending the integration is active.

Do not leave unfinished features disguised as completed features.

---

# 34. FIRST TASK – START THE PROJECT CORRECTLY

Before writing large amounts of code, complete the following:

**Step 1:** Review this entire specification.

**Step 2:** Identify technical dependencies, feasibility issues and platform restrictions.

**Step 3:** Propose the complete architecture.

**Step 4:** Design the database schema and entity relationships.

**Step 5:** Prepare the application navigation and UI/UX structure.

**Step 6:** Prepare the API specification.

**Step 7:** Prepare a phase-wise development plan with acceptance criteria.

**Step 8:** Identify required external services, accounts, API keys and costs.

**Step 9:** Start Phase 1 implementation.

**Step 10:** Run tests and provide a working build before moving to the next phase.

At the end of every phase, provide:

- Features completed.
- Screens implemented.
- APIs implemented.
- Database tables created.
- Tests performed.
- Known limitations.
- Pending tasks.
- Instructions to run the application.
- Instructions to test the completed features.

Maintain a project README and development progress tracker.

Do not restart the architecture or replace completed working modules unnecessarily when moving to subsequent phases.

## FINAL EXPECTATION

I want FamilyHub to become a complete, reliable, secure and scalable family management application.

It should allow a family to manage almost every important aspect of daily life from one application, while keeping personal information private and shared family information accessible to authorized members.

Prioritize correctness, security, usability, reliable synchronization and real functionality over simply completing screens quickly.

**Start by presenting the complete architecture, database design, UI/UX structure and phased execution plan. Then begin Phase 1.**
