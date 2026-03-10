-- Add connection_type column to mind_map_edges for semantic meaning
ALTER TABLE public.mind_map_edges
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50) DEFAULT 'relates_to';

-- Add comment explaining connection types
COMMENT ON COLUMN public.mind_map_edges.connection_type IS
'Type of connection: relates_to, blocks, supports, depends_on, references, contradicts';

-- Create index for faster queries filtering by connection type
CREATE INDEX IF NOT EXISTS idx_mind_map_edges_type ON public.mind_map_edges(connection_type);
