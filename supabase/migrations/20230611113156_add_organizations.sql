create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "discord_guild_id" bigint,
    "discord_channel_id" bigint,
    "created_at" timestamp with time zone default now()
);


alter table "public"."organizations" enable row level security;

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);
CREATE UNIQUE INDEX organizations_discord_guild_id_key ON public.organizations USING btree (discord_guild_id);

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";


