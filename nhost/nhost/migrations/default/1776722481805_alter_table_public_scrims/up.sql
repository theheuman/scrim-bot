ALTER TABLE public.scrims DROP COLUMN IF EXISTS skill;
ALTER TABLE public.scrims ADD prio_type text DEFAULT 'regular' NOT NULL;
