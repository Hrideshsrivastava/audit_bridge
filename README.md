
# AuditBridge 

**Professional Document Management Platform for Chartered Accountants & Audit Firms**

AuditBridge solves the chaos of tax season by replacing WhatsApp uploads and lost emails with a secure, dedicated portal. It allows CA firms to manage clients, track audit progress, and securely collect documents, while offering clients a simple interface to upload required files.

---

## Key Features

### For CA Firms (The Dashboard)
* **Client Management:** Add new clients and assign specific audit types (GST, Income Tax, ROC).
* **Smart Tracking:** View real-time progress bars for every client's document submission.
* **Secure Review:** View, download, verify, or reject documents with reason comments.
* **Access Control:** Generate unique, secure access keys for clients to log in without complex registration.

### For Clients (The Portal)
* **Simple Login:** No passwords to remember—login securely using the unique Access Key provided by the CA.
* **Clear Requirements:** See exactly which documents are needed for your specific audit type.
* **Status Updates:** Know immediately if a document is **Pending**, **Verified**, or **Rejected**.
* **Mobile Friendly:** Upload PDFs or images directly from any device.

---

##  Tech Stack

* **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+).
* **Backend:** Node.js, Express.js.
* **Database:** PostgreSQL (with Row Level Security).
* **Authentication:** JWT (JSON Web Tokens).
* **File Storage:** Local Storage (Scalable to Firebase/Supabase).

---

##  Installation & Setup

Follow these steps to run the project locally.

### 1. Prerequisites
* **Node.js** (v14 or higher)
* **PostgreSQL** (installed and running)

### 2. Clone the Repository
```bash
git clone [https://github.com/your-username/audit-bridge.git](https://github.com/your-username/audit-bridge.git)
cd audit-bridge

```

### 3. Install Dependencies

```bash
npm install

```

### 4. Database Setup

1. Create a PostgreSQL database named `audit_bridge`.
2. Run the SQL scripts located in `database.sql` to create tables.
3. **Crucial:** Run the INSERT commands to populate audit types (GST, Income Tax) or the dashboard will be empty.

### 5. Configure Environment

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=audit_bridge

# Security
JWT_SECRET=super_secret_key_change_this_in_production

```

### 6. Run the Server

```bash
# Start the backend server
node backend/app.js

```

The server will start on `http://localhost:3000`.

---

## 🗄️ Database Schema

The project uses a relational schema with **Row Level Security (RLS)** to ensure data isolation.

* **Firms:** Stores CA account details.
* **Clients:** Stores client info and access keys.
* **Audit_Types:** Master table (GST, Income Tax, etc.).
* **Client_Audits:** Links a client to a specific audit type for a financial year.
* **Client_Documents:** Stores file URLs, status (Pending/Verified/Rejected), and due dates.

---

## 🧪 How to Test

1. **Register Firm:** Open `firm_auth.html` and sign up.
2. **Add Client:** In the dashboard, click **"+ Add Client"**. Select "GST Audit".
3. **Get Key:** Copy the generated `Access Key`.
4. **Client Login:** Open `client_login.html` in a new window (Incognito recommended) and use the key.
5. **Upload:** As a client, upload a PDF for "GST Returns".
6. **Verify:** Switch back to the Firm Dashboard, click "View" on the client, and Verify the document.

---

## 🛡️ Security Highlights

* **RLS (Row Level Security):** Ensures Firm A can never access Firm B's clients, even if the API is compromised.
* **JWT Auth:** Stateless authentication for secure API requests.
* **Input Validation:** Multer filters restrict uploads to safe file types (PDF, JPG, PNG).

---



```
