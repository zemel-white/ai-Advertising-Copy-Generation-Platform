import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dbdhc6n9z1yqc5fmzr.database.nocode.cn";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzQ2OTc5MjAwLCJleHAiOjE5MDQ3NDU2MDB9.1iVBtvS8HGPVbQmjL3Otrxxp_inFpCjRlieXd9X6dB4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

