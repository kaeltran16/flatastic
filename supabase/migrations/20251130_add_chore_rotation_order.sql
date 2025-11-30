-- Add chore_rotation_order to households for custom user sequence
ALTER TABLE households
ADD COLUMN chore_rotation_order JSONB;

-- Add comment
COMMENT ON COLUMN households.chore_rotation_order IS 'Array of user IDs defining the custom rotation order';
