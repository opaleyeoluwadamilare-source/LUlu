# ✅ Database Schema Cleanup Complete

## 🎯 Overview

Comprehensive cleanup of redundant database fields to eliminate redundancy and establish clear source of truth for all data fields.

**Date:** November 22, 2025

---

## 🔧 Changes Made

### 1. **Field Consolidation Strategy**

**Source of Truth Fields (New):**
- `extracted_goal` - Primary goal from onboarding flow
- `extracted_insecurity` - Primary challenge/insecurity from onboarding
- `extracted_blocker` - Primary action blocker from onboarding

**Legacy Fields (Kept for Backward Compatibility):**
- `goals` - Synced from `extracted_goal` automatically
- `biggest_insecurity` - Synced from `extracted_insecurity` automatically

**Decision:** Keep legacy fields for backward compatibility but always sync from extracted fields.

---

### 2. **Code Updates**

#### **`app/api/database/submit/route.ts`**
- ✅ Consolidated logic to use `extracted_goal` and `extracted_insecurity` as source of truth
- ✅ Updated SQL to automatically sync legacy fields from extracted fields
- ✅ Uses `COALESCE` to prioritize extracted fields over legacy fields

#### **`lib/call-queue.ts`**
- ✅ Updated to use `extracted_goal` and `extracted_insecurity` as primary source
- ✅ Falls back to legacy fields only if extracted fields are empty
- ✅ Ensures all calls use the most up-to-date data

#### **`lib/db.ts`**
- ✅ Added `consolidateRedundantFields()` migration function
- ✅ Backfills extracted fields from legacy fields where needed
- ✅ Syncs legacy fields from extracted fields for consistency

#### **`app/api/database/migrate/route.ts`**
- ✅ Added consolidation migration to standard migration flow
- ✅ Runs automatically when migrations are executed

---

### 3. **Migration Scripts**

#### **New Script: `scripts/run-consolidation-migration.js`**
- Standalone script to run consolidation migration
- Can be run independently or as part of full migration
- Safe to run multiple times (idempotent)

**Usage:**
```bash
node scripts/run-consolidation-migration.js
```

---

## 📊 Migration Process

The consolidation migration performs 4 steps:

1. **Backfill `extracted_goal`** from `goals` where `extracted_goal` is empty
2. **Backfill `extracted_insecurity`** from `biggest_insecurity` where `extracted_insecurity` is empty
3. **Sync `goals`** from `extracted_goal` (for backward compatibility)
4. **Sync `biggest_insecurity`** from `extracted_insecurity` (for backward compatibility)

**Result:** All existing data is migrated, and legacy fields stay in sync with source of truth.

---

## 🔄 Data Flow

### **Onboarding → Database**
```
User Input → LLM Extraction → extracted_goal, extracted_insecurity, extracted_blocker
                                    ↓
                          Database (source of truth)
                                    ↓
                          Auto-sync to goals, biggest_insecurity (backward compatibility)
```

### **Database → Daily Calls**
```
Database Query → extracted_goal (primary) || goals (fallback)
Database Query → extracted_insecurity (primary) || biggest_insecurity (fallback)
                                    ↓
                          Vapi Call System
```

---

## ✅ Benefits

1. **Single Source of Truth:** `extracted_goal` and `extracted_insecurity` are the authoritative fields
2. **Backward Compatibility:** Legacy fields automatically synced, existing code continues to work
3. **Data Consistency:** All fields stay in sync automatically
4. **No Breaking Changes:** Existing integrations continue to work
5. **Future-Proof:** Easy to deprecate legacy fields later if needed

---

## 🚀 Running the Migration

### **Option 1: Via API Endpoint**
```bash
curl -X POST https://your-domain.com/api/database/migrate \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
```

### **Option 2: Via Script**
```bash
node scripts/run-consolidation-migration.js
```

### **Option 3: Automatic (via migration endpoint)**
The consolidation runs automatically when you call the standard migration endpoint.

---

## 📝 Field Usage Summary

| Field | Status | Source | Used By |
|-------|--------|--------|---------|
| `extracted_goal` | ✅ Source of Truth | Onboarding LLM | Call system, prompts |
| `extracted_insecurity` | ✅ Source of Truth | Onboarding LLM | Call system, prompts |
| `extracted_blocker` | ✅ Source of Truth | Onboarding LLM | Call system, prompts |
| `goals` | 🔄 Synced | Auto-synced from `extracted_goal` | Legacy code, backward compatibility |
| `biggest_insecurity` | 🔄 Synced | Auto-synced from `extracted_insecurity` | Legacy code, backward compatibility |
| `delusion_level` | ✅ Active | User selection (default: "Standard") | Vapi prompts |
| `plan` | ✅ Active | Payment flow | Stripe integration |

---

## 🎯 What's NOT Changed

- ✅ `plan` field - Still needed for Stripe payment processing
- ✅ `delusion_level` field - Still needed for call tone (though learned preferences override it)
- ✅ All other fields remain unchanged
- ✅ No data loss - all existing data preserved and migrated

---

## ✨ Result

**Before:**
- Redundant fields (`goals` vs `extracted_goal`)
- Inconsistent data sources
- Manual sync required

**After:**
- Single source of truth (`extracted_goal`, `extracted_insecurity`)
- Automatic sync to legacy fields
- Clean, maintainable codebase
- Zero breaking changes

---

## 🔍 Verification

To verify the cleanup worked:

```sql
-- Check that extracted fields are populated
SELECT 
  id, 
  name,
  extracted_goal,
  goals,
  extracted_insecurity,
  biggest_insecurity
FROM customers
WHERE extracted_goal IS NOT NULL OR extracted_insecurity IS NOT NULL;

-- Verify sync (goals should match extracted_goal)
SELECT 
  id,
  name,
  CASE 
    WHEN extracted_goal IS NOT NULL AND goals != extracted_goal 
    THEN 'MISMATCH' 
    ELSE 'OK' 
  END as goal_sync_status
FROM customers
WHERE extracted_goal IS NOT NULL;
```

---

## 📚 Related Files

- `lib/db.ts` - Migration functions
- `app/api/database/submit/route.ts` - Data submission (updated)
- `lib/call-queue.ts` - Call processing (updated)
- `app/api/database/migrate/route.ts` - Migration endpoint (updated)
- `scripts/run-consolidation-migration.js` - Standalone migration script

---

**Status:** ✅ **Complete and Production Ready**

