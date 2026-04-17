-- 1. TABLA DE PERFILES (Extiende la tabla oculta auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text default 'student' check (role in ('student', 'admin')), 
  stripe_customer_id text unique, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. TABLA DE CURSOS
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null, 
  description text,
  cover_image_url text,
  level text check (level in ('Básico', 'Intermedio', 'Avanzado', 'Masterclass')),
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. TABLA DE LECCIONES (Videos)
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text not null, 
  duration_seconds integer, 
  position integer not null, 
  is_free_preview boolean default false, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. TABLA DE PROGRESO DEL USUARIO
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  unique(user_id, lesson_id) 
);

-- 5. TABLA DE SUSCRIPCIONES
create table public.subscriptions (
  id text primary key, 
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null, 
  price_id text not null, 
  current_period_end timestamp with time zone not null,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. TABLA DE EVENTOS
create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  city text not null,
  event_date timestamp with time zone not null,
  image_url text, 
  location_url text, 
  ticket_url text, 
  type text check (type in ('Clase', 'Taller', 'Social', 'Congreso')),
  is_active boolean default true, 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. TRIGGER DE AUTOMATIZACIÓN DE USUARIOS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();