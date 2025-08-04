# 3NF Analysis for Pactwise Database

## Overview

This document provides an analysis of the Pactwise database schema to determine its compliance with Third Normal Form (3NF). The analysis is based on the SQL migration files located in `backend/supabase/migrations`.

## Summary of Findings

The database schema is generally well-designed and adheres to normalization principles in most areas. However, there are a few tables that exhibit transitive dependencies, which are violations of 3NF.

## Tables with Potential 3NF Violations

### 1. `users` Table

- **Transitive Dependency:** The `department` and `title` attributes may be transitively dependent on the `role` attribute. If a user's role determines their department and title, these attributes are not directly dependent on the primary key (`id`).

- **Recommendation:**
    - Create a new `roles` table with columns such as `role_name`, `department`, and `title`.
    - In the `users` table, replace the `department` and `title` columns with a `role_id` foreign key that references the new `roles` table.

### 2. `vendors` Table

- **Transitive Dependency:** The `contact_name`, `contact_email`, and `contact_phone` attributes are dependent on the vendor, not the primary key (`id`). This structure assumes that each vendor has only one contact.

- **Recommendation:**
    - Create a new `contacts` table with columns for `vendor_id`, `name`, `email`, and `phone`.
    - This would allow for multiple contacts per vendor and would better adhere to 3NF.
    - Remove `contact_name`, `contact_email`, and `contact_phone` from the `vendors` table.

### 3. `contracts` Table

- **Transitive Dependency:** The `extracted_` fields (e.g., `extracted_parties`, `extracted_address`, `extracted_start_date`) are dependent on the content of the contract file, not on the primary key (`id`).

- **Recommendation:**
    - Create a new `contract_extractions` table with a foreign key that references the `contracts` table.
    - Move all `extracted_` fields from the `contracts` table to this new table. This would improve data organization and ensure that the `contracts` table only contains attributes that are directly dependent on the primary key.

## Conclusion

While the Pactwise database schema is largely normalized, the identified transitive dependencies in the `users`, `vendors`, and `contracts` tables should be addressed to achieve full compliance with 3NF. Resolving these issues will lead to a more robust and scalable database design.