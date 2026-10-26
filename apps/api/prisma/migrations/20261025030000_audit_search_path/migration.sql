-- Recomendación del linter de Supabase (function_search_path_mutable): la función del trigger
-- de AuditLog no debe depender del search_path de quien la ejecute.
ALTER FUNCTION public."audit_log_append_only"() SET search_path = '';
