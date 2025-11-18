-- Add recurring configuration fields to chore_templates table
-- This allows templates to automatically create chores on a schedule

-- Add recurring configuration columns
ALTER TABLE chore_templates
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_type VARCHAR(20) CHECK (recurring_type IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS recurring_interval INTEGER DEFAULT 1 CHECK (recurring_interval >= 1 AND recurring_interval <= 365),
ADD COLUMN IF NOT EXISTS next_creation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_assign_rotation BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recurring_start_date DATE;

-- Add index for querying active recurring templates
CREATE INDEX IF NOT EXISTS idx_chore_templates_recurring
ON chore_templates(is_recurring, next_creation_date)
WHERE is_recurring = TRUE AND is_active = TRUE;

-- Add index for household recurring templates
CREATE INDEX IF NOT EXISTS idx_chore_templates_household_recurring
ON chore_templates(household_id, is_recurring)
WHERE is_recurring = TRUE AND is_active = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN chore_templates.is_recurring IS 'Whether this template should auto-create chores on a schedule';
COMMENT ON COLUMN chore_templates.recurring_type IS 'Frequency of recurring chore creation: daily, weekly, or monthly';
COMMENT ON COLUMN chore_templates.recurring_interval IS 'Number of days/weeks/months between chore creations (1-365)';
COMMENT ON COLUMN chore_templates.next_creation_date IS 'Next scheduled date for auto-creating a chore from this template';
COMMENT ON COLUMN chore_templates.last_created_at IS 'Timestamp of when a chore was last auto-created from this template';
COMMENT ON COLUMN chore_templates.auto_assign_rotation IS 'Whether to use rotation for assigning users (default: true)';
COMMENT ON COLUMN chore_templates.recurring_start_date IS 'Date when the recurring schedule should start';
