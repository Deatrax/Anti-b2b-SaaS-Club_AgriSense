-- demo.sql — the seeded demo farm/field for the live demo (§C.10 H8+).
-- One user → one farm → one ACTIVE Aman field + one seeded HARVESTED field (read-only).
-- TEMPLATE: fill real ids/values once intake + engines write their own rows; this is the
-- deterministic starting state a judge sees before the demo conversation begins.

-- NOTE: run AFTER 001_init.sql. Uses fixed uuids so re-seeding is idempotent-ish (delete first).

-- delete from users where phone = '8801700000000';  -- uncomment to re-seed clean

insert into users (id, phone, name, lang)
values ('00000000-0000-0000-0000-0000000000a1', '8801700000000', 'হাসান', 'bn')
on conflict (phone) do nothing;

insert into farms (id, user_id, name, district, lat, lon, aez)
values ('00000000-0000-0000-0000-0000000000b1',
        '00000000-0000-0000-0000-0000000000a1',
        'হাসানের খামার', 'Mymensingh', 24.7471, 90.4203, 9)
on conflict (id) do nothing;

-- Active field ("উত্তরের জমি") — the workspace the demo walks through.
insert into fields (id, farm_id, name, area_ha, soil_type, water_source, lat, lon, budget_bdt)
values ('00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-0000000000b1',
        'উত্তরের জমি', 0.40, 'loam', 'shallow_tubewell', 24.7471, 90.4203, 40000)
on conflict (id) do nothing;

-- TODO: seed one HARVESTED historical field ("দক্ষিণের জমি") for crop-history / rotation demo.
-- TODO: seed an empty conversation row for the active field so the chat opens ready.
