import { Damage } from "../misc/damage_types";
import { Archetype, Stats } from "../character/character_parts";
import { CharacterTemplate } from "../character/templates";
import { gen_from_moraes } from "./generate_name_moraes";

const RatArchetype: Archetype = {
    model: 'rat',
    ai_map: 'steppe_walker_agressive',
    ai_battle: 'basic',
    race: 'rat'
}

const BigRatArchetype: Archetype = {
    model: 'bigrat',
    ai_map: 'steppe_walker_agressive',
    ai_battle: 'basic',
    race: 'rat'
}

const MageRatArchetype: Archetype = {
    model: 'magerat',
    ai_map: 'steppe_walker_agressive',
    ai_battle: 'basic',
    race: 'rat'
}

const RatStats: Stats = {
    phys_power: 15,
    magic_power: 20,
    movement_speed: 2
}

const BigRatStats: Stats = {
    phys_power: 30,
    magic_power: 20,
    movement_speed: 1
}

const RatResists = new Damage(5, 5, 5, 20)

const rat_moraes = ['s', 'shi', "S'", "fu", 'fi']
function generate_name() {
    return gen_from_moraes(rat_moraes, 5)
}

export const RatTemplate = new CharacterTemplate(RatArchetype, generate_name, 50, RatStats, RatResists)
export const BigRatTemplate = new CharacterTemplate(BigRatArchetype, generate_name, 150, BigRatStats, RatResists)
export const MageRatTemplate = new CharacterTemplate(MageRatArchetype, generate_name, 20, RatStats, RatResists)