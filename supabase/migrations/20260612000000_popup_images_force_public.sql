-- Self-heal: the original popups migration created popup-images with
-- `on conflict (id) do nothing`, so if the bucket pre-existed as PRIVATE the
-- public flag was never applied and /storage/v1/object/public/... returns 401
-- (broken header logo + popup images). This forces it idempotently.
update storage.buckets
set public = true
where id = 'popup-images';
