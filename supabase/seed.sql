-- Seed: the 58 wilayas Algeria operated on before the April 2026 split into
-- 69 (loi 26-06). Confirmed the original 01-58 numbering/names are untouched
-- by the split — the 11 new wilayas are numbered 59-69 as carve-outs from
-- existing ones, still transitioning through end of 2026, and delivery
-- companies haven't caught up yet. The admin can add rows for new wilayas
-- herself from /admin/livraison once carriers support them — no code change
-- needed.
--
-- Prices are 0 placeholders; the shop owner fills in real numbers from the
-- admin panel. Idempotent: safe to re-run, never overwrites a price that's
-- already been edited.

insert into public.delivery_rates (wilaya, domicile_price, stopdesk_price) values
  ('01 Adrar', 0, 0),
  ('02 Chlef', 0, 0),
  ('03 Laghouat', 0, 0),
  ('04 Oum El Bouaghi', 0, 0),
  ('05 Batna', 0, 0),
  ('06 Béjaïa', 0, 0),
  ('07 Biskra', 0, 0),
  ('08 Béchar', 0, 0),
  ('09 Blida', 0, 0),
  ('10 Bouira', 0, 0),
  ('11 Tamanrasset', 0, 0),
  ('12 Tébessa', 0, 0),
  ('13 Tlemcen', 0, 0),
  ('14 Tiaret', 0, 0),
  ('15 Tizi Ouzou', 0, 0),
  ('16 Alger', 0, 0),
  ('17 Djelfa', 0, 0),
  ('18 Jijel', 0, 0),
  ('19 Sétif', 0, 0),
  ('20 Saïda', 0, 0),
  ('21 Skikda', 0, 0),
  ('22 Sidi Bel Abbès', 0, 0),
  ('23 Annaba', 0, 0),
  ('24 Guelma', 0, 0),
  ('25 Constantine', 0, 0),
  ('26 Médéa', 0, 0),
  ('27 Mostaganem', 0, 0),
  ('28 M''Sila', 0, 0),
  ('29 Mascara', 0, 0),
  ('30 Ouargla', 0, 0),
  ('31 Oran', 0, 0),
  ('32 El Bayadh', 0, 0),
  ('33 Illizi', 0, 0),
  ('34 Bordj Bou Arréridj', 0, 0),
  ('35 Boumerdès', 0, 0),
  ('36 El Tarf', 0, 0),
  ('37 Tindouf', 0, 0),
  ('38 Tissemsilt', 0, 0),
  ('39 El Oued', 0, 0),
  ('40 Khenchela', 0, 0),
  ('41 Souk Ahras', 0, 0),
  ('42 Tipaza', 0, 0),
  ('43 Mila', 0, 0),
  ('44 Aïn Defla', 0, 0),
  ('45 Naâma', 0, 0),
  ('46 Aïn Témouchent', 0, 0),
  ('47 Ghardaïa', 0, 0),
  ('48 Relizane', 0, 0),
  ('49 Timimoun', 0, 0),
  ('50 Bordj Badji Mokhtar', 0, 0),
  ('51 Ouled Djellal', 0, 0),
  ('52 Béni Abbès', 0, 0),
  ('53 In Salah', 0, 0),
  ('54 In Guezzam', 0, 0),
  ('55 Touggourt', 0, 0),
  ('56 Djanet', 0, 0),
  ('57 El M''Ghair', 0, 0),
  ('58 El Meniaa', 0, 0)
on conflict (wilaya) do nothing;
