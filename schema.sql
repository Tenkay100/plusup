-- Aqua Cargo Supabase Database Schema

-- 1. admin_users Table
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. shipments Table
CREATE TABLE public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(100) NOT NULL,
    estimated_delivery_date DATE,
    sender_details TEXT,
    receiver_details TEXT,
    origin_country VARCHAR(100),
    destination_country VARCHAR(100),
    weight_kg DECIMAL(10,2),
    dimensions VARCHAR(100),
    package_details TEXT,
    current_location VARCHAR(200),
    progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. shipment_history Table
CREATE TABLE public.shipment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    update_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL,
    description TEXT
);

-- Note: In a production environment, implement RLS (Row Level Security) 
-- ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
