# VEYORA JEWELS — AI Create Your Own (CYO) Database Architecture

## 1. Schema Overview

The CYO database structures were introduced in versioned migration `migrations/024_cyo_jewellery_studio.js`.

The schema supports customer quotas, design iterations, multi-angle images, multi-turn conversational transcripts, formal workshop quotations, AI cost tracking, and administrative audit logs.

```
                    +---------------------------+
                    |         customers         |
                    +---------------------------+
                    | id (PK)                   |
                    | cyo_image_generations_cnt |
                    | cyo_image_generations_lim |
                    +-------------+-------------+
                                  | 1
                                  |
                                  | *
                    +-------------v-------------+
                    |        cyo_designs        |
                    +---------------------------+
                    | id (PK)                   |
                    | customer_id (FK)          |
                    | title                     |
                    | category                  |
                    | initial_prompt            |
                    | current_version_id        |
                    | status                    |
                    +---+--------+----------+---+
                        | 1      | 1        | 1
                        |        |          |
            +-----------+        |          +--------------------+
            | *                  | *                             | 1
+-----------v------------+  +----v--------------------+  +-------v-------------------+
|   cyo_design_versions  |  |     cyo_quotations      |  |     cyo_conversations     |
+------------------------+  +-------------------------+  +---------------------------+
| id (PK)                |  | id (PK)                 |  | id (PK)                   |
| design_id (FK)         |  | design_id (FK)          |  | design_id (FK)            |
| version_number         |  | customer_id (FK)        |  | customer_id (FK)          |
| prompt                 |  | quoted_amount           |  +-------------+-------------+
| attributes (JSON)      |  | estimated_weight_g      |                | 1
+-----------+------------+  | specifications (JSON)   |                |
            | 1             | status                  |                | *
            |               +-------------------------+  +-------------v-------------+
            | *                                          |       cyo_messages        |
+-----------v------------+                               +---------------------------+
|    cyo_design_images   |                               | id (PK)                   |
+------------------------+                               | conversation_id (FK)      |
| id (PK)                |                               | role (user/assistant)     |
| design_id (FK)         |                               | content                   |
| version_id (FK)        |                               | attachments (JSON)        |
| view_type (front/side) |                               +---------------------------+
| image_url              |
+------------------------+
```

---

## 2. Table Definitions

### 2.1 Table: `customers` (Extended Columns)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `cyo_image_generations_count` | INTEGER | NOT NULL DEFAULT 0, INDEX | Number of AI image generation batches successfully performed. |
| `cyo_image_generations_limit` | INTEGER | NOT NULL DEFAULT 3 | Authorized maximum image generation batches. |

### 2.2 Table: `cyo_designs`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique design ID. |
| `customer_id` | INTEGER | NOT NULL REFERENCES customers(id) | Owning customer ID. |
| `title` | VARCHAR(255) | NOT NULL | Design title / concept headline. |
| `category` | VARCHAR(100) | NOT NULL DEFAULT 'Necklace' | Target category (Necklace, Earrings, Ring, etc.). |
| `initial_prompt` | TEXT | NOT NULL | Initial natural language customer prompt. |
| `current_version_id` | INTEGER | NULLABLE | ID of the active/latest design version. |
| `status` | VARCHAR(50) | NOT NULL DEFAULT 'Draft', INDEX | Current workflow status. |
| `created_at` | VARCHAR | NOT NULL | ISO timestamp. |
| `updated_at` | VARCHAR | NOT NULL | ISO timestamp. |

### 2.3 Table: `cyo_design_versions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique version ID. |
| `design_id` | INTEGER | NOT NULL REFERENCES cyo_designs(id) | Parent design ID. |
| `version_number` | INTEGER | NOT NULL DEFAULT 1 | Iteration counter (1, 2, 3...). |
| `prompt` | TEXT | NOT NULL | Detailed prompt text used for this version. |
| `attributes` | TEXT | NULLABLE | JSON object storing metal, craftsmanship, finish, gemstones, motifs. |
| `ai_provider` | VARCHAR(100) | NULLABLE | Provider used for generation. |
| `ai_model` | VARCHAR(100) | NULLABLE | Model identifier. |
| `generation_status` | VARCHAR(50) | NOT NULL DEFAULT 'completed' | 'pending', 'completed', 'failed'. |
| `created_at` | VARCHAR | NOT NULL | ISO timestamp. |

### 2.4 Table: `cyo_design_images`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique image ID. |
| `design_id` | INTEGER | NOT NULL REFERENCES cyo_designs(id) | Parent design ID. |
| `version_id` | INTEGER | NULLABLE REFERENCES cyo_design_versions(id) | Associated version ID. |
| `view_type` | VARCHAR(50) | NOT NULL DEFAULT 'front' | 'front', 'side', 'detail', 'showcase'. |
| `image_url` | VARCHAR(1000) | NOT NULL | Public relative path (e.g. `/uploads/cyo_...webp`). |
| `reference_image_url`| VARCHAR(1000) | NULLABLE | Associated reference image URL if applicable. |
| `prompt` | TEXT | NULLABLE | Angle-specific image synthesis prompt. |
| `status` | VARCHAR(50) | NOT NULL DEFAULT 'active' | Image status. |
| `created_at` | VARCHAR | NOT NULL | ISO timestamp. |

### 2.5 Table: `cyo_conversations` & `cyo_messages`
Stores multi-turn conversational interactions between the client and the AI design assistant.

### 2.6 Table: `cyo_quotations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique quotation ID. |
| `design_id` | INTEGER | NOT NULL REFERENCES cyo_designs(id) | Associated bespoke design ID. |
| `customer_id` | INTEGER | NOT NULL REFERENCES customers(id) | Customer recipient ID. |
| `quoted_amount` | DECIMAL(12,2) | NOT NULL | Total quoted price in INR. |
| `estimated_weight_g` | DECIMAL(8,3) | NULLABLE | Estimated precious metal weight in grams. |
| `material_cost` | DECIMAL(12,2) | NULLABLE | Raw metal bullion cost in INR. |
| `gemstone_cost` | DECIMAL(12,2) | NULLABLE | Precious stone / pearl cost in INR. |
| `making_cost` | DECIMAL(12,2) | NULLABLE | Artisanal craftsmanship / labour charge in INR. |
| `tax_cost` | DECIMAL(12,2) | NULLABLE | Applicable GST tax in INR. |
| `specifications` | TEXT | NULLABLE | JSON snapshot of metal purity, stone caratage, and dimensions. |
| `admin_notes` | TEXT | NULLABLE | Notes from master craftsman to client. |
| `status` | VARCHAR(50) | NOT NULL DEFAULT 'quotation_sent' | 'pending', 'quotation_sent', 'quotation_accepted', 'quotation_rejected'. |
| `valid_until` | VARCHAR | NULLABLE | Quotation expiration date. |
| `created_at` | VARCHAR | NOT NULL | ISO timestamp. |
| `updated_at` | VARCHAR | NOT NULL | ISO timestamp. |

### 2.7 Table: `cyo_ai_usage` & `cyo_audit_logs`
Provides complete observability into tokens, model calls, cost estimates, and administrative overrides.
