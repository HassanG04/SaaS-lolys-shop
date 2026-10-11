# Original SQL sections

These six reference files are split verbatim at the explicit file headers of
the supplied root `accessories_store_schema.sql`. The combined source remains
unchanged. The three introductory comment lines preceding section 01 are in
the combined source only.

These files are not production migrations. In particular, the original SQL
does not enforce MFA and includes `admin_set_role`; the security model and
roadmap require later hardening. Never execute this reference directory against
staging or production. T-1.02 creates local migrations and separates reference
data, development seed data and owner-only instructions.
