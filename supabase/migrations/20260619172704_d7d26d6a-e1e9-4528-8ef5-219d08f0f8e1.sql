
INSERT INTO public.pelada_members (pelada_id, user_id, role, status)
SELECT p.id, p.created_by, 'admin', 'confirmado'
FROM public.peladas p
WHERE NOT EXISTS (
  SELECT 1 FROM public.pelada_members pm
  WHERE pm.pelada_id = p.id AND pm.role = 'admin'
)
AND p.created_by IS NOT NULL
ON CONFLICT DO NOTHING;
