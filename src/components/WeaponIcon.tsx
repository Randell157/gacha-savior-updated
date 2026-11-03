import RarityIcon from "@/components/RarityIcon";
import { getWeapon, weaponIcon } from "@/lib/genshin/weapons";

const SIZES = { sm: 36, md: 56, lg: 72 };

/** A weapon's icon on its rarity colour: `sm` for table rows, `md` for cards, `lg` on the character page. */
export default function WeaponIcon({
  weaponKey,
  size = "md",
}: {
  weaponKey: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <RarityIcon src={weaponIcon(weaponKey)} rarity={getWeapon(weaponKey)?.rarity} size={SIZES[size]} />
  );
}
