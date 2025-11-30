-- Add next_assignee_id to chore_templates for manual override
ALTER TABLE chore_templates
ADD COLUMN next_assignee_id UUID REFERENCES profiles(id);

-- Add comment
COMMENT ON COLUMN chore_templates.next_assignee_id IS 'Manually set assignee for the next chore creation only';
