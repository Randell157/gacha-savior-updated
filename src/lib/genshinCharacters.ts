/** Playable Genshin roster derived from portrait files (skins, Paimon, Aether/Lumine excluded). */
/**
 * `rarity` is 4 or 5 (the Traveler counts as 5). It's left out for characters
 * whose rarity hasn't been filled in yet; their portraits get no rarity colour.
 */
export const GENSHIN_CHARACTERS: { key: string; iconFile: string; rarity?: 4 | 5 }[] = [
  { key: "Aino", iconFile: "Aino_Icon.png", rarity: 4 },
  { key: "Albedo", iconFile: "Albedo_Icon.png", rarity: 5 },
  { key: "Alhaitham", iconFile: "Alhaitham_Icon.png", rarity: 5 },
  { key: "Aloy", iconFile: "Aloy_Icon.png", rarity: 5 },
  { key: "Alyosha", iconFile: "Alyosha_Icon.png" },
  { key: "Amber", iconFile: "Amber_Icon.png", rarity: 4 },
  { key: "AratakiItto", iconFile: "Arataki_Itto_Icon.png", rarity: 5 },
  { key: "Arlecchino", iconFile: "Arlecchino_Icon.png", rarity: 5 },
  { key: "Baizhu", iconFile: "Baizhu_Icon.png", rarity: 5 },
  { key: "Barbara", iconFile: "Barbara_Icon.png", rarity: 4 },
  { key: "Beidou", iconFile: "Beidou_Icon.png", rarity: 4 },
  { key: "Bennett", iconFile: "Bennett_Icon.png", rarity: 4 },
  { key: "Candace", iconFile: "Candace_Icon.png", rarity: 4 },
  { key: "Charlotte", iconFile: "Charlotte_Icon.png", rarity: 4 },
  { key: "Chasca", iconFile: "Chasca_Icon.png", rarity: 5 },
  { key: "Chevreuse", iconFile: "Chevreuse_Icon.png", rarity: 4 },
  { key: "Chiori", iconFile: "Chiori_Icon.png", rarity: 5 },
  { key: "Chongyun", iconFile: "Chongyun_Icon.png", rarity: 4 },
  { key: "Citlali", iconFile: "Citlali_Icon.png", rarity: 5 },
  { key: "Clorinde", iconFile: "Clorinde_Icon.png", rarity: 5 },
  { key: "Collei", iconFile: "Collei_Icon.png", rarity: 4 },
  { key: "Columbina", iconFile: "Columbina_Icon.png", rarity: 5 },
  { key: "Cyno", iconFile: "Cyno_Icon.png", rarity: 5 },
  { key: "Dahlia", iconFile: "Dahlia_Icon.png", rarity: 4 },
  { key: "Dehya", iconFile: "Dehya_Icon.png", rarity: 5 },
  { key: "Diluc", iconFile: "Diluc_Icon.png", rarity: 5 },
  { key: "Diona", iconFile: "Diona_Icon.png", rarity: 4 },
  { key: "Dori", iconFile: "Dori_Icon.png", rarity: 4 },
  { key: "Durin", iconFile: "Durin_Icon.png", rarity: 5 },
  { key: "Emilie", iconFile: "Emilie_Icon.png", rarity: 5 },
  { key: "Escoffier", iconFile: "Escoffier_Icon.png", rarity: 5 },
  { key: "Eula", iconFile: "Eula_Icon.png", rarity: 5 },
  { key: "Faruzan", iconFile: "Faruzan_Icon.png", rarity: 4 },
  { key: "Fischl", iconFile: "Fischl_Icon.png", rarity: 4 },
  { key: "Flins", iconFile: "Flins_Icon.png", rarity: 5 },
  { key: "Freminet", iconFile: "Freminet_Icon.png", rarity: 4 },
  { key: "Furina", iconFile: "Furina_Icon.png", rarity: 5 },
  { key: "Gaming", iconFile: "Gaming_Icon.png", rarity: 4 },
  { key: "Ganyu", iconFile: "Ganyu_Icon.png", rarity: 5 },
  { key: "Gorou", iconFile: "Gorou_Icon.png", rarity: 4 },
  { key: "HuTao", iconFile: "Hu_Tao_Icon.png", rarity: 5 },
  { key: "Iansan", iconFile: "Iansan_Icon.png", rarity: 4 },
  { key: "Ifa", iconFile: "Ifa_Icon.png", rarity: 4 },
  { key: "Illuga", iconFile: "Illuga_Icon.png", rarity: 4 },
  { key: "Ineffa", iconFile: "Ineffa_Icon.png", rarity: 5 },
  { key: "Jahoda", iconFile: "Jahoda_Icon.png", rarity: 4 },
  { key: "Jean", iconFile: "Jean_Icon.png", rarity: 5 },
  { key: "Kachina", iconFile: "Kachina_Icon.png", rarity: 4 },
  { key: "KaedeharaKazuha", iconFile: "Kaedehara_Kazuha_Icon.png", rarity: 5 },
  { key: "Kaeya", iconFile: "Kaeya_Icon.png", rarity: 4 },
  { key: "KamisatoAyaka", iconFile: "Kamisato_Ayaka_Icon.png", rarity: 5 },
  { key: "KamisatoAyato", iconFile: "Kamisato_Ayato_Icon.png", rarity: 5 },
  { key: "Kaveh", iconFile: "Kaveh_Icon.png", rarity: 4 },
  { key: "Keqing", iconFile: "Keqing_Icon.png", rarity: 5 },
  { key: "Kinich", iconFile: "Kinich_Icon.png", rarity: 5 },
  { key: "Kirara", iconFile: "Kirara_Icon.png", rarity: 4 },
  { key: "Klee", iconFile: "Klee_Icon.png", rarity: 5 },
  { key: "KujouSara", iconFile: "Kujou_Sara_Icon.png", rarity: 4 },
  { key: "KukiShinobu", iconFile: "Kuki_Shinobu_Icon.png", rarity: 4 },
  { key: "LanYan", iconFile: "Lan_Yan_Icon.png", rarity: 4 },
  { key: "Lauma", iconFile: "Lauma_Icon.png", rarity: 5 },
  { key: "Layla", iconFile: "Layla_Icon.png", rarity: 4 },
  { key: "Linnea", iconFile: "Linnea_Icon.png" },
  { key: "Lisa", iconFile: "Lisa_Icon.png", rarity: 4 },
  { key: "Lohen", iconFile: "Lohen_Icon.png" },
  { key: "Lynette", iconFile: "Lynette_Icon.png", rarity: 4 },
  { key: "Lyney", iconFile: "Lyney_Icon.png", rarity: 5 },
  { key: "Mavuika", iconFile: "Mavuika_Icon.png", rarity: 5 },
  { key: "Mika", iconFile: "Mika_Icon.png", rarity: 4 },
  { key: "Mona", iconFile: "Mona_Icon.png", rarity: 5 },
  { key: "Mualani", iconFile: "Mualani_Icon.png", rarity: 5 },
  { key: "Nahida", iconFile: "Nahida_Icon.png", rarity: 5 },
  { key: "Navia", iconFile: "Navia_Icon.png", rarity: 5 },
  { key: "Nefer", iconFile: "Nefer_Icon.png", rarity: 5 },
  { key: "Neuvillette", iconFile: "Neuvillette_Icon.png", rarity: 5 },
  { key: "Nicole", iconFile: "Nicole_Icon.png" },
  { key: "Nilou", iconFile: "Nilou_Icon.png", rarity: 5 },
  { key: "Ningguang", iconFile: "Ningguang_Icon.png", rarity: 4 },
  { key: "Noelle", iconFile: "Noelle_Icon.png", rarity: 4 },
  { key: "Odette", iconFile: "Odette_Icon.png" },
  { key: "Ororon", iconFile: "Ororon_Icon.png", rarity: 4 },
  { key: "Prune", iconFile: "Prune_Icon.png" },
  { key: "Qiqi", iconFile: "Qiqi_Icon.png", rarity: 5 },
  { key: "RaidenShogun", iconFile: "Raiden_Shogun_Icon.png", rarity: 5 },
  { key: "Razor", iconFile: "Razor_Icon.png", rarity: 4 },
  { key: "Rosaria", iconFile: "Rosaria_Icon.png", rarity: 4 },
  { key: "Sandrone", iconFile: "Sandrone_Icon.png" },
  { key: "SangonomiyaKokomi", iconFile: "Sangonomiya_Kokomi_Icon.png", rarity: 5 },
  { key: "Sayu", iconFile: "Sayu_Icon.png", rarity: 4 },
  { key: "Sethos", iconFile: "Sethos_Icon.png", rarity: 4 },
  { key: "Shenhe", iconFile: "Shenhe_Icon.png", rarity: 5 },
  { key: "ShikanoinHeizou", iconFile: "Shikanoin_Heizou_Icon.png", rarity: 4 },
  { key: "Sigewinne", iconFile: "Sigewinne_Icon.png", rarity: 5 },
  { key: "Skirk", iconFile: "Skirk_Icon.png", rarity: 5 },
  { key: "Sucrose", iconFile: "Sucrose_Icon.png", rarity: 4 },
  { key: "Tartaglia", iconFile: "Tartaglia_Icon.png", rarity: 5 },
  { key: "Thoma", iconFile: "Thoma_Icon.png", rarity: 4 },
  { key: "Tighnari", iconFile: "Tighnari_Icon.png", rarity: 5 },
  { key: "Traveler", iconFile: "Traveler_Icon.png", rarity: 5 },
  { key: "Varesa", iconFile: "Varesa_Icon.png", rarity: 5 },
  { key: "Varka", iconFile: "Varka_Icon.png", rarity: 5 },
  { key: "Venti", iconFile: "Venti_Icon.png", rarity: 5 },
  { key: "Wanderer", iconFile: "Wanderer_Icon.png", rarity: 5 },
  { key: "WonderlandManekin", iconFile: "Wonderland_Manekin_Icon.png" },
  { key: "Wriothesley", iconFile: "Wriothesley_Icon.png", rarity: 5 },
  { key: "Xiangling", iconFile: "Xiangling_Icon.png", rarity: 4 },
  { key: "Xianyun", iconFile: "Xianyun_Icon.png", rarity: 5 },
  { key: "Xiao", iconFile: "Xiao_Icon.png", rarity: 5 },
  { key: "Xilonen", iconFile: "Xilonen_Icon.png", rarity: 5 },
  { key: "Xingqiu", iconFile: "Xingqiu_Icon.png", rarity: 4 },
  { key: "Xinyan", iconFile: "Xinyan_Icon.png", rarity: 4 },
  { key: "YaeMiko", iconFile: "Yae_Miko_Icon.png", rarity: 5 },
  { key: "Yanfei", iconFile: "Yanfei_Icon.png", rarity: 4 },
  { key: "Yaoyao", iconFile: "Yaoyao_Icon.png", rarity: 4 },
  { key: "Yelan", iconFile: "Yelan_Icon.png", rarity: 5 },
  { key: "Yoimiya", iconFile: "Yoimiya_Icon.png", rarity: 5 },
  { key: "YumemizukiMizuki", iconFile: "Yumemizuki_Mizuki_Icon.png", rarity: 5 },
  { key: "YunJin", iconFile: "Yun_Jin_Icon.png", rarity: 4 },
  { key: "Zhongli", iconFile: "Zhongli_Icon.png", rarity: 5 },
  { key: "Zibai", iconFile: "Zibai_Icon.png" },
];

export function normalizeCharacterKey(key: string): string {
  return key.toLowerCase().replace(/[\s_'-]/g, "");
}

const RARITY_BY_KEY = new Map(
  GENSHIN_CHARACTERS.map((c) => [normalizeCharacterKey(c.key), c.rarity])
);

/** Rarity of a roster or GOOD character key; any Traveler variant counts as the Traveler. */
export function getCharacterRarity(key: string): 4 | 5 | undefined {
  const normalized = normalizeCharacterKey(key);
  return RARITY_BY_KEY.get(normalized.startsWith("traveler") ? "traveler" : normalized);
}

/**
 * Background behind a character portrait: the in-game gold (5★) or purple
 * (4★) gradient, or the plain indigo tint when the rarity isn't known.
 */
export function rarityBackground(rarity: 4 | 5 | undefined): string {
  if (rarity === 5) return "bg-gradient-to-b from-[#9c6a3c] to-[#d6a35a]";
  if (rarity === 4) return "bg-gradient-to-b from-[#5e4a8c] to-[#9c7fd1]";
  return "bg-indigo-50 dark:bg-slate-800";
}
