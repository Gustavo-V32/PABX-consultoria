-- OmniSuite Initial Database Setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create text search configuration for Portuguese
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS portuguese_unaccent (COPY = pg_catalog.portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
    ALTER MAPPING FOR hword, hword_part, word
    WITH unaccent, portuguese_stem;
