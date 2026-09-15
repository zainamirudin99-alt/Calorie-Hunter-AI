-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0002: SPECIALIZED PROGRAM TYPES
-- Adds: weight_loss, loss_fat, loss_fat_build_muscle, gain_mass, gain_mass_build_muscle, lean_mass
-- ==============================================================================

-- Drop existing check constraint if present
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_program_type_check;

-- Add updated check constraint with all 9 program types
ALTER TABLE public.programs ADD CONSTRAINT programs_program_type_check 
CHECK (program_type IN (
  'cutting', 
  'bulking', 
  'maintenance', 
  'weight_loss', 
  'loss_fat', 
  'loss_fat_build_muscle', 
  'gain_mass', 
  'gain_mass_build_muscle', 
  'lean_mass'
));
