import { ARMOUR, EQUIP_SLOT, MATERIAL, WEAPON, equip_slot_string_id } from "../game_content/src/content.js"

export interface SkillListInterface {
    clothier: number;
    cooking: number;
    onehand: number;
    polearms: number;
    noweapon: number;
    twohanded: number
    skinning: number;
    magic_mastery: number;
    blocking: number;
    evasion: number;
    woodwork: number;
    hunt: number;
    ranged: number;
    bone_carving: number;
    travelling: number;
    fishing: number;
    smith: number;
    tanning: number,
}

export type skill = keyof SkillListInterface

export interface damageSocket {
    fire: number
    blunt: number
    pierce: number
    slice: number
}

export type backpack = {
    items: ItemBackpackData[]
}

export type equip = Partial<Record<equip_slot_string_id, ItemData>>

export type EquipSocket = {
    equip: equip
    backpack: backpack;
}

export interface ItemData {
    name: string,
    id: number,
    prototype_id: string
    affixes: number,
    damage: damageSocket,
    ranged_damage: number,
    resists: damageSocket,
    affixes_list: affix[],
    item_type: EQUIP_SLOT
    durability: number
    is_weapon: boolean
    price?: number
    backpack_index?: number,
}

export interface EquipSlotData {
    equip_slot: equip_slot_string_id
    item: ItemData
}

export interface ItemBackpackData extends ItemData {
    backpack_index: number
}

export interface ItemOrderData extends ItemData {
    price: number
    seller: string
    seller_id: number
    is_weapon: boolean
}

export type affix_tag = 'of_heat'|'layered'|'sharp'|'heavy'|'hot'|'precise'|'of_power'|'of_madness'|'calm'|'daemonic'|'notched'|'thick'|'hard'|'of_elodino_pleasure'|'of_graci_beauty'|'of_elder_beast'|'of_protection'|'of_painful_protection'

export interface affix{
    tag: affix_tag;
}


// export type equip_slot = armour_slot|'weapon'
// export type armour_slot = 'skirt'|'amulet'|'mail'|'greaves'|'left_pauldron'|'right_pauldron'|'left_gauntlet'|'right_gauntlet'|'boots'|'helmet'|'belt'|'robe'
// export type secondary_slot = 'secondary'
// export type slot = secondary_slot | equip_slot

export type damage_type = 'blunt'|'pierce'|'slice'|'fire'
export interface box {
    material: MATERIAL;
    amount: number;
}
export interface skill_check {
    skill: skill;
    difficulty: number;
}
export interface CraftBulkTemplate {
    id: string;
    input: box[];
    output: box[];
    difficulty: skill_check[];
}
export interface CraftItemTemplate {
    id: string;
    input: box[];
    output: EQUIPMENT_PIECE;
    output_affixes: affix[];
    difficulty: skill_check[];
}
export interface ItemJson {
    durability: number
    affixes: affix[]
    model_tag: string
}
export interface TaggedCraftBulk {
    tag: string,
    value: CraftBulkTemplate
}
export interface TaggedCraftItem {
    tag: string,
    value: CraftItemTemplate
}export type EQUIPMENT_PIECE = { value: WEAPON; tag: "weapon"}  | { value: ARMOUR; tag: "armour"}

