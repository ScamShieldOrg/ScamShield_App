-- Import the 50 URL records supplied by the user. No schema changes or deletions.
-- The source timestamps have no timezone; preserve them as local timestamp values.
WITH source_data (normalized_value, display_value, source_created_at) AS (
    VALUES
    ('formulary-hype-squad-event.com', 'http://formulary-hype-squad-event.com', '2026-10-30T12:36:04.616208'),
    ('23.94.136.170', 'https://23.94.136.170', '2026-10-30T12:36:24.728818'),
    ('id9828.shop', 'https://id9828.shop', '2026-10-30T06:04:20.056137'),
    ('biuvca.top', 'http://biuvca.top', '2026-10-30T09:02:50.500653'),
    ('1.20.150.71', 'https://1.20.150.71', '2026-10-30T12:43:01.478159'),
    ('fq8bgcyp3t.suijidaohxl.top', 'https://fq8bgcyp3t.suijidaohxl.top', '2026-10-30T17:36:28.007160'),
    ('juzhen202601.com', 'https://juzhen202601.com', '2026-10-30T00:54:15.483993'),
    ('327012.xyz', 'https://327012.xyz', '2026-10-30T07:57:45.182729'),
    ('ka7edrsxzm.suijidaohxl.top', 'https://ka7edrsxzm.suijidaohxl.top', '2026-10-30T05:41:11.956587'),
    ('ggptt.biz', 'https://ggptt.biz', '2026-10-30T08:32:36.786801'),
    ('777t87u8.weebly.com', 'http://777t87u8.weebly.com', '2026-10-30T04:24:34.869650'),
    ('yhhld.gpjfuh.info', 'http://yhhld.gpjfuh.info', '2026-10-30T13:12:28.172399'),
    ('mail.calvarylight.com', 'https://mail.calvarylight.com', '2026-10-30T15:43:15.220558'),
    ('xgtnkehtzn.suijidaohxl.top', 'https://xgtnkehtzn.suijidaohxl.top', '2026-10-30T09:15:13.334365'),
    ('15.181.16.225', 'http://15.181.16.225', '2026-10-30T15:40:09.711871'),
    ('dros-spaz-vlin-145-krum-zlantex-vub-680.pages.dev', 'http://dros-spaz-vlin-145-krum-zlantex-vub-680.pages.dev', '2026-10-30T16:22:19.486451'),
    ('padgnwtnm4.suijidaohxl.top', 'http://padgnwtnm4.suijidaohxl.top', '2026-10-30T09:13:25.490353'),
    ('netflixnet.webmailsegurancasempreltda.store', 'https://netflixnet.webmailsegurancasempreltda.store', '2026-10-30T11:48:40.414509'),
    ('ntdy8m8yac.3355799com-dh.top', 'http://ntdy8m8yac.3355799com-dh.top', '2026-10-30T11:21:03.315340'),
    ('kcdxh8n5hd.suijidaohxl.top', 'https://kcdxh8n5hd.suijidaohxl.top', '2026-10-30T06:04:27.276699'),
    ('mebh4hbwyy.suijidaohxl.top', 'http://mebh4hbwyy.suijidaohxl.top', '2026-10-30T12:04:08.474174'),
    ('revollutbonus.cfd', 'http://revollutbonus.cfd', '2026-10-30T13:13:08.300768'),
    ('uhsvdcnvvvd.cfd', 'http://uhsvdcnvvvd.cfd', '2026-10-30T17:23:27.421381'),
    ('rtryfx.blogspot.gr', 'http://rtryfx.blogspot.gr', '2026-10-30T03:33:33.370457'),
    ('24onlinetradecity.live', 'https://24onlinetradecity.live', '2026-10-30T02:57:21.192455'),
    ('t3w8yf5ji2.suijidaohxl.top', 'https://t3w8yf5ji2.suijidaohxl.top', '2026-10-30T11:54:13.211672'),
    ('sso-ledgr-com-strt.square.site', 'https://sso-ledgr-com-strt.square.site', '2026-10-30T02:54:02.813645'),
    ('atualizacao-mais-seguro-cliente-empresa.000webhostapp.com', 'https://atualizacao-mais-seguro-cliente-empresa.000webhostapp.com', '2026-10-30T04:00:34.218689'),
    ('mailsyncsss.weebly.com', 'https://mailsyncsss.weebly.com', '2026-10-30T11:44:25.232083'),
    ('authorityphire.weebly.com', 'https://authorityphire.weebly.com', '2026-10-30T01:41:05.350659'),
    ('jhophiqnkjbbntyjvwn.com', 'http://jhophiqnkjbbntyjvwn.com', '2026-10-30T01:32:32.343148'),
    ('com-trackesven.top', 'http://com-trackesven.top', '2026-10-30T08:42:22.357694'),
    ('sk3ecncejy.suijidaohxl.top', 'https://sk3ecncejy.suijidaohxl.top', '2026-10-30T06:06:40.659054'),
    ('8fbwgu.dzwiekuje.pl', 'http://8fbwgu.dzwiekuje.pl', '2026-10-30T10:50:08.499923'),
    ('t-mobile.ztrskf.top', 'http://t-mobile.ztrskf.top', '2026-10-30T08:36:32.095723'),
    ('myhammockvacations.worldofpowerfulyouth.org', 'http://myhammockvacations.worldofpowerfulyouth.org', '2026-10-30T13:12:54.871059'),
    ('wwuwwwiki2.aomngbr.cc', 'https://wwuwwwiki2.aomngbr.cc', '2026-10-30T08:33:15.150952'),
    ('6g1adz4wfw.622629dhxl.top', 'https://6g1adz4wfw.622629dhxl.top', '2026-10-30T18:15:10.662594'),
    ('teaezorapp.webflow.io', 'http://teaezorapp.webflow.io', '2026-10-30T21:29:18.025024'),
    ('officialpostship.top', 'http://officialpostship.top', '2026-10-30T03:27:09.211588'),
    ('haodage.cc', 'http://haodage.cc', '2026-10-30T09:27:09.187602'),
    ('222.149.49.160', 'http://222.149.49.160', '2026-10-30T02:22:14.907119'),
    ('thebergsignal-gpt.com', 'http://thebergsignal-gpt.com', '2026-10-30T01:53:17.472520'),
    ('tseswfz.blogspot.am', 'http://tseswfz.blogspot.am', '2026-10-30T11:21:29.063229'),
    ('mentyxrx4y.3355799com-dh.top', 'https://mentyxrx4y.3355799com-dh.top', '2026-10-30T10:34:00.929465'),
    ('iph5sayjxx.suijidaohxl.top', 'http://iph5sayjxx.suijidaohxl.top', '2026-10-30T06:42:54.364857'),
    ('1kxykd5bga.622629dhxl.top', 'http://1kxykd5bga.622629dhxl.top', '2026-10-30T01:32:08.402252'),
    ('bakermeekins.com', 'https://bakermeekins.com', '2026-10-30T16:08:15.103403'),
    ('rpkfxtr7jk.suijidaohxl.top', 'http://rpkfxtr7jk.suijidaohxl.top', '2026-10-30T07:51:08.090586'),
    ('ww17.uhdmovies.foo', 'https://ww17.uhdmovies.foo', '2026-10-30T16:05:11.721363')
)
INSERT INTO indicators
    (type, normalized_value, display_value, first_seen_at, last_seen_at, created_at, updated_at)
SELECT
    'URL', source_data.normalized_value, source_data.display_value,
    source_data.source_created_at::timestamp,
    source_data.source_created_at::timestamp,
    source_data.source_created_at::timestamp,
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM source_data
WHERE NOT EXISTS (
    SELECT 1 FROM indicators existing
    WHERE existing.type = 'URL'
      AND existing.normalized_value = source_data.normalized_value
);
