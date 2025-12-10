
import { createClient } from '@supabase/supabase-js';

// CẤU HÌNH SUPABASE
// Bạn có thể lấy các thông tin này tại Supabase Dashboard -> Project Settings -> API
// Cách 1: Tạo file .env tại thư mục gốc và thêm:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
//
// Cách 2: Nhập trực tiếp vào 2 biến dưới đây (không khuyến khích nếu deploy public)

// Safely access env to avoid "Cannot read properties of undefined"
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://uchaksgqpfmzwyosript.supabase.co'; 
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaGFrc2dxcGZtend5b3NyaXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTg1MjUsImV4cCI6MjA4MDg5NDUyNX0.xNZE7VW9dJ4zq2QbkJ4UKLurFIIZAQe6T73Cji3q6KA';

export const supabase = createClient(supabaseUrl, supabaseKey);
