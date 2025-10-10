# Fix for RLS Recursion Error

This documents the fix for the 500 Internal Server Error caused by an infinite recursion in the `profiles` table's Row-Level Security (RLS) policies.

## Problem

The error was caused by the `is_admin()` function, which was called by an RLS policy on the `profiles` table. This function itself performed a `SELECT` on the `profiles` table, creating a recursive loop that resulted in a 500 error.

## Solution

A new migration file, `20251006130000_fix_rls_recursion.sql`, has been created to replace the faulty `is_admin()` function with a version that uses `EXISTS (SELECT 1 ...)` and is marked with `SECURITY DEFINER`. This prevents the recursive loop.

### Action

To apply the fix, run the following command:

```
supabase db push
```
