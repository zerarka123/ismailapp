-- Rename the "cold rooms" guide branch to "غرف تبريد / مسمكة" (the app already shows this name; this keeps the database in sync).
update public.guide_categories
set name_ar = 'غرف تبريد / مسمكة',
    name_fr = 'Chambres froides / Poissonnerie',
    name_en = 'Cold rooms / Fish market'
where slug = 'cold_rooms';
