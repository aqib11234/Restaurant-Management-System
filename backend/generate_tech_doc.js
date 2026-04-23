const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });

const outputPath = 'RMS_Technology_Stack_Report.pdf';
doc.pipe(fs.createWriteStream(outputPath));

// Title
doc
  .fontSize(24)
  .font('Helvetica-Bold')
  .text('Restaurant Management System (RMS)', { align: 'center' })
  .moveDown(0.5);

doc
  .fontSize(16)
  .font('Helvetica')
  .text('Technology Stack & Architecture Report', { align: 'center', color: '#555555' })
  .moveDown(2);

// Introduction
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('1. Overview')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica')
  .text(
    'The Restaurant Management System (RMS) is a multi-tenant SaaS platform built to handle core restaurant operations including dashboard analytics, table management, food item management, order placement and tracking, and sales history reporting. The application enforces strict data isolation for each restaurant entity.',
    { align: 'justify' }
  )
  .moveDown(1.5);

// Architecture
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('2. Architecture Pattern')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica')
  .text(
    'The system follows a standard Client-Server architecture utilizing the MERN stack (MongoDB, Express.js, React, Node.js). It implements a Single Page Application (SPA) frontend that communicates with a RESTful backend API. Multi-tenancy is achieved through a "Shared Database + Tenant ID" pattern, where every data entity is scoped by a unique restaurantId.',
    { align: 'justify' }
  )
  .moveDown(1.5);

// Frontend
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('3. Frontend Environment')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica-Bold')
  .text('Core Framework:')
  .font('Helvetica')
  .text('- React 19: The latest version of the React library for building user interfaces.')
  .moveDown(0.5)
  .font('Helvetica-Bold')
  .text('Styling & UI:')
  .font('Helvetica')
  .text('- Tailwind CSS (v2.x compat): Utility-first CSS framework for rapid and highly customizable UI development.')
  .text('- Lucide-React: Icon library for modern, consistent UI iconography.')
  .text('- React-Datepicker & Date-Fns: For premium, customizable date range selection components in reports.')
  .moveDown(0.5)
  .font('Helvetica-Bold')
  .text('Export & Reporting Tools:')
  .font('Helvetica')
  .text('- jsPDF & jsPDF-AutoTable: Client-side PDF generation for sales reports.')
  .text('- XLSX (SheetJS): Client-side Excel document generation for data exports.')
  .moveDown(1.5);

// Backend
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('4. Backend Environment')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica-Bold')
  .text('Core Framework:')
  .font('Helvetica')
  .text('- Node.js & Express.js: Fast, unopinionated, minimalist web framework for building the RESTful API routing layer.')
  .moveDown(0.5)
  .font('Helvetica-Bold')
  .text('Security & Authentication:')
  .font('Helvetica')
  .text('- JSON Web Tokens (JWT): Stateless authentication providing secure, encoded user sessions.')
  .text('- bcryptjs: Cryptographic hashing for secure password storage.')
  .text('- CORS: Configured for safe Cross-Origin Resource Sharing between frontend and backend.')
  .moveDown(1.5);

// Database
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('5. Database Layer')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica-Bold')
  .text('Database Engine:')
  .font('Helvetica')
  .text('- MongoDB: NoSQL document database providing flexible, JSON-like document structures.')
  .moveDown(0.5)
  .font('Helvetica-Bold')
  .text('ODM (Object Data Modeling):')
  .font('Helvetica')
  .text('- Mongoose: Elegant MongoDB object modeling for Node.js. It provides schema validation, business logic hooks, and query abstractions.')
  .moveDown(0.5)
  .font('Helvetica-Bold')
  .text('Key Collections:')
  .font('Helvetica')
  .text('- Users, Restaurants, FoodItems, Categories, Orders, and SalesHistory.')
  .text('- Every entity utilizes the restaurantId index to strictly prevent cross-tenant data leakage.')
  .moveDown(1.5);

// APIs
doc
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('6. API Design')
  .moveDown(0.5);

doc
  .fontSize(12)
  .font('Helvetica')
  .text('The API adheres to RESTful principles. Key features include:', { align: 'justify' })
  .moveDown(0.3)
  .text('- Protected Endpoints: All operational routes pass through a custom authentication middleware that verifies the JWT and automatically enforces the restaurantId scope on all subsequent database queries.')
  .moveDown(0.3)
  .text('- Dynamic Aggregations: Endpoints like the dashboard and sales history leverage powerful MongoDB aggregation pipelines to filter and group data dynamically based on user-selected date ranges.')
  .moveDown(0.3)
  .text('- Transactional Safety: Operations (e.g. signup) are atomic, with automatic rollbacks applied if subsequent entity creations fail.')
  .moveDown(2);

// Footer
doc
  .fontSize(10)
  .font('Helvetica-Oblique')
  .text('Generated by Agency Document Generator Agent', { align: 'center', color: 'gray' });

doc.end();
console.log('PDF Generated successfully at ' + outputPath);
