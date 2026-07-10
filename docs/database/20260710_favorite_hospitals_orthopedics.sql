-- Existing member_saved_hospitals is the canonical favorite_hospitals relation.
-- Keep existing data while extending the supported hospital categories.
ALTER TABLE public.hospitals DROP CONSTRAINT IF EXISTS hospitals_category_check;
ALTER TABLE public.hospitals ADD CONSTRAINT hospitals_category_check
  CHECK (category IN ('dermatology', 'ophthalmology', 'dentistry', 'orthopedics'));
