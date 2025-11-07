# Patient CRM - Codebase Exploration Index

This index documents a complete exploration of the Patient CRM codebase, focusing on patient data models, storage architecture, and mock data strategies.

## Documentation Files

Three comprehensive documents have been created to guide development:

### 1. DATA_STRUCTURE_REPORT.md
**Purpose**: Complete reference for all data models and storage architecture
**Size**: 465 lines | 13 KB
**Audience**: Developers, architects

**Contents**:
- Executive summary
- Patient data models (core + 6 health data types)
- Storage architecture (localStorage keys, abstraction layer)
- Available health data fields
- Existing scripts and utilities
- API endpoints and services
- Best approaches for adding mock patients
- Recommended mock data structure
- Implementation steps

**Key Sections**:
- 1. Patient Data Models & Schemas
- 2. Data Storage Architecture
- 3. Available Health Data Fields
- 4. Existing Scripts & Database Utilities
- 5. API Endpoints & Services
- 6. Best Approach for Adding Mock Patients
- 7. Recommended Mock Data Structure
- 8. Implementation Steps
- 9. Quick Reference: ID Generation

**Read this when**: You need detailed understanding of data models, want to create complex mock data, or need to implement new data types.

---

### 2. FILE_LOCATIONS_OVERVIEW.txt
**Purpose**: Map of all relevant files and their purposes
**Size**: 217 lines | 5.6 KB
**Audience**: Developers working with the codebase

**Contents**:
- Data models locations
- Storage layer components
- UI components and pages
- Data persistence files
- Scripts and utilities
- Authentication modules
- Configuration files
- Key integration points
- Dependency graphs

**Key Sections**:
- DATA MODELS & TYPES
- STORAGE LAYER
- UI COMPONENTS & PAGES
- DATA STORAGE (PERSISTENT)
- SCRIPTS & UTILITIES
- CONFIGURATION & BUILD
- KEY INTEGRATION POINTS
- DEPENDENCY GRAPH

**Read this when**: You need to find a specific file, understand code organization, or trace data flow through the system.

---

### 3. QUICK_REFERENCE.md
**Purpose**: Fast lookup guide for common tasks
**Size**: 304 lines | 7.3 KB
**Audience**: Developers implementing features

**Contents**:
- Patient data fields at a glance
- Storage architecture overview
- Key storage functions (all CRUD operations)
- File location quick map
- Code examples for creating mock patients
- Health data ranges for reference
- Common npm scripts
- Debugging tips in browser
- Routes reference
- ID generation conventions

**Key Sections**:
- Patient Data at a Glance
- Storage Architecture
- Key Storage Functions
- File Locations - Quick Map
- Creating a Mock Patient (Manual & Via Code)
- Adding Health Records to Patient
- Common NPM Scripts
- Debugging Data in Browser
- Routes
- Health Data Ranges

**Read this when**: You need quick examples, function signatures, debugging tips, or file locations.

---

## Quick Navigation

### I need to...

**Understand the patient data model**
- Start: QUICK_REFERENCE.md - "Patient Data at a Glance"
- Deep dive: DATA_STRUCTURE_REPORT.md - "Patient Data Models & Schemas"

**Find a specific file**
- Use: FILE_LOCATIONS_OVERVIEW.txt
- Or: QUICK_REFERENCE.md - "File Locations - Quick Map"

**Create a mock patient programmatically**
- Start: QUICK_REFERENCE.md - "Creating a Mock Patient"
- Examples: DATA_STRUCTURE_REPORT.md - "Recommended Mock Data Structure"

**Add health records to a patient**
- Use: QUICK_REFERENCE.md - "Adding Health Records to Patient"
- Details: DATA_STRUCTURE_REPORT.md - "Available Health Data Fields"

**Understand storage architecture**
- Overview: QUICK_REFERENCE.md - "Storage Architecture"
- Details: DATA_STRUCTURE_REPORT.md - "Data Storage Architecture"

**Create a seed script for mock data**
- Strategy: DATA_STRUCTURE_REPORT.md - "Best Approach for Adding Mock Patients"
- Code examples: QUICK_REFERENCE.md - "Creating a Mock Patient"
- Steps: DATA_STRUCTURE_REPORT.md - "Implementation Steps"

**Debug patient data in browser**
- Tips: QUICK_REFERENCE.md - "Debugging Data in Browser"

**Find all storage functions**
- Reference: QUICK_REFERENCE.md - "Key Storage Functions"
- Code: See /src/lib/storage.ts (446 lines)

---

## Key Findings Summary

### Data Models
- **Patient**: Core record with demographics, contact, health info
- **BodyCompositionRecord**: Weight, body fat, muscle mass, BMI, etc. (9 fields)
- **VitalSignsRecord**: Blood pressure, heart rate, temperature, glucose, etc. (7 fields)
- **Appointment**: With recurring support and reminders
- **PatientGoal**: Goals with progress tracking (0-100%)
- **InitialAssessment**: Baseline measurements and activity level
- **Tag & PatientGroup**: Organizational structures

### Storage
- Uses localStorage (web) or Electron file system (desktop)
- 9 localStorage keys (hospital_crm_* prefix)
- Abstraction layer: /src/lib/storage.ts
- Async API for all operations
- JSON-based storage format

### Files to Focus On
1. `/src/types/patient.ts` - All TypeScript interfaces
2. `/src/lib/storage.ts` - All storage operations
3. `/src/pages/PatientForm.tsx` - Patient creation UI
4. `/src/pages/PatientList.tsx` - Patient listing
5. `/scripts/createSuperAdmin.js` - Example of data creation script

### Best Practice for Mock Data
- Create `/scripts/seedPatients.js`
- Generate 5-10 patients with 3-6 months history
- Create related health records, appointments, goals
- Add npm script: `npm run seed-data`

---

## Recommended Reading Order

### For Complete Understanding (60 minutes)
1. QUICK_REFERENCE.md - Overview (10 min)
2. DATA_STRUCTURE_REPORT.md - Full reading (40 min)
3. FILE_LOCATIONS_OVERVIEW.txt - Browse (10 min)

### For Quick Lookup (5-10 minutes)
1. QUICK_REFERENCE.md - Find what you need
2. Reference deeper docs as needed

### For Implementation (varies)
1. QUICK_REFERENCE.md - Get examples
2. DATA_STRUCTURE_REPORT.md - Understand architecture
3. FILE_LOCATIONS_OVERVIEW.txt - Find relevant files
4. Review actual source files

---

## Exploration Scope

This exploration covers:

- Data Models (7 types): Patient, BodyComposition, VitalSigns, Appointment, Goal, Assessment, Tag, PatientGroup
- Storage Architecture: localStorage keys, abstraction layer, CRUD operations
- UI Components: Forms, lists, detail views for all data types
- Health Data Fields: 30+ fields across body composition and vital signs
- Scripts & Utilities: Admin creation, database management
- Best Practices: Mock data creation, ID generation, data persistence

This exploration does NOT cover:
- Authentication internals
- Electron-specific features (currently disabled)
- UI styling and components library
- Build and deployment configuration
- Testing and quality assurance

---

## File Reference Summary

| File | Purpose | Lines |
|------|---------|-------|
| DATA_STRUCTURE_REPORT.md | Complete data model and storage reference | 465 |
| FILE_LOCATIONS_OVERVIEW.txt | File location and organization map | 217 |
| QUICK_REFERENCE.md | Quick lookup guide with examples | 304 |

**Total Documentation**: 986 lines, 26 KB of detailed guidance

---

## Related Documents in Project

- `/README.md` - Project overview
- `/DEPLOYMENT_GUIDE.md` - Deployment instructions
- `/PROJECT_SUMMARY.md` - Project summary
- `/AUTH_README.md` - Authentication documentation
- `/scripts/README.md` - Script documentation
- `系統更新說明.md` - Chinese system updates
- `快速開始指南.md` - Chinese quick start

---

## Source Code Locations

### Critical Files
- `/src/types/patient.ts` - All data interfaces
- `/src/lib/storage.ts` - All storage operations
- `/src/lib/auth.ts` - Authentication utilities
- `/electron/main.js` - Electron entry
- `/electron/preload.js` - Electron preload

### UI Entry Points
- `/src/pages/PatientForm.tsx` - Patient CRUD
- `/src/pages/PatientList.tsx` - Patient listing
- `/src/pages/PatientDetail.tsx` - Patient details
- `/src/pages/HealthAnalytics.tsx` - Analytics
- `/src/pages/Appointments.tsx` - Appointments

### Forms & Components
- `/src/components/BodyCompositionForm.tsx`
- `/src/components/VitalSignsForm.tsx`
- `/src/components/AppointmentForm.tsx`
- `/src/components/GoalForm.tsx`
- `/src/components/InitialAssessmentForm.tsx`
- `/src/components/TagGroupManagement.tsx`

### Scripts
- `/scripts/createSuperAdmin.js` - Admin creation
- `/scripts/seedPatients.js` - TO BE CREATED

---

## Getting Started

1. **Read QUICK_REFERENCE.md first** (5-10 minutes)
   - Get oriented with the system
   - Learn key file locations
   - See code examples

2. **Review DATA_STRUCTURE_REPORT.md** (20-30 minutes)
   - Understand data models deeply
   - Learn storage architecture
   - See implementation strategies

3. **Use FILE_LOCATIONS_OVERVIEW.txt as a map**
   - Find specific files
   - Understand code organization
   - Trace dependencies

4. **Refer back to QUICK_REFERENCE.md**
   - Copy code examples
   - Get function signatures
   - Find debugging tips

---

## Document Metadata

- **Exploration Date**: 2025-11-05
- **System**: Patient CRM v1.0.0
- **Project Location**: /Users/audi1/Documents/Patient_CRM
- **Framework**: React 18 + TypeScript + Vite
- **Storage**: localStorage (web) / Electron FS (desktop)
- **Documentation Language**: English
- **Code Examples**: TypeScript

---

**Total Exploration Time**: Complete codebase analysis with 986 lines of comprehensive documentation.

For questions or updates, refer to the main documentation files listed above.
