-- This migration adds new columns for tax rate, tax inclusion, and additional charges to the 'orders' table.

-- Add tax_rate column
ALTER TABLE public.orders
ADD COLUMN tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.00; -- e.g., 0.05 for 5%

-- Add is_tax_inclusive column
ALTER TABLE public.orders
ADD COLUMN is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE;

-- Add additional_charges column (JSONB to store an array of objects)
ALTER TABLE public.orders
ADD COLUMN additional_charges JSONB;

-- Optional: Add comments for clarity
COMMENT ON COLUMN public.orders.tax_rate IS 'The tax rate applied to the order (e.g., 0.05 for 5%).';
COMMENT ON COLUMN public.orders.is_tax_inclusive IS 'Indicates if the tax is included in the item prices (TRUE) or added on top (FALSE).';
COMMENT ON COLUMN public.orders.additional_charges IS 'JSONB array of custom additional charges or services for the order.';

-- You might want to update existing rows with default values if needed,
-- but the DEFAULT clauses handle new inserts.
-- For existing rows, the new columns will be populated with their default values.