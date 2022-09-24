import {Stash} from "../inventories/stash"
import { Archetype, CharacterFlags, InnateStats, Misc, Stats, Status } from "./character_parts";
import { PerksTable, SkillList } from "./skills";
import { Equip } from "../inventories/equip";
import { Savings} from "../inventories/savings";
import { cell_id, char_id, money, TEMP_USER_ID, user_id } from "../../types";

let dp = [[0, 1], [0 ,-1] ,[1, 0] ,[-1 ,0],[1 ,1],[-1 ,-1]]


export class Character {
    id: char_id;
    battle_id: number;
    battle_unit_id: number;
    user_id: user_id|TEMP_USER_ID;
    cell_id: cell_id;

    name: string;

    equip: Equip;

    stash: Stash;
    trade_stash: Stash;

    savings: Savings;
    trade_savings: Savings;

    status: Status;

    skills: SkillList;
    perks: PerksTable;
    stats: InnateStats;

    archetype: Archetype
    explored: boolean[];

    model_variation: any;

    constructor(id: number, battle_id: number, battle_unit_id: number, user_id: user_id|TEMP_USER_ID, cell_id: cell_id,
                 name: string, archetype: Archetype, 
                 stats: Stats, max_hp: number) {
        
        this.id = id as char_id
        this.battle_id = battle_id
        this.battle_unit_id = battle_unit_id
        this.user_id = user_id
        this.cell_id = cell_id

        this.name = name

        this.archetype = archetype

        this.equip = new Equip()
        this.stash = new Stash()
        this.trade_stash = new Stash()
        this.savings = new Savings()
        this.trade_savings = new Savings()
        
        this.status = new Status()
        this.status.blood = 0
        this.status.fatigue = 0
        this.status.rage = 0
        this.status.hp = max_hp
        this.status.stress = 0

        this.skills = new SkillList()
        this.perks = {}
        this.stats = new InnateStats(stats.movement_speed, stats.phys_power, stats.magic_power, max_hp)

        this.explored = []
    }

    set_model_variation(data:any) {
        this.model_variation = data
    }
}


// export class CharacterOld {
//     equip: Equip;

//     stash: Stash;
//     trade_stash: Stash;

//     savings: Savings;
//     trade_savings: Savings;

//     status: Status;

//     skills: SkillList;
//     perks: PerksTable;
    
//     stats: InnateStats;
//     misc: Misc;
//     flags: CharacterFlags;
//     changed: boolean;
//     status_changed: boolean;
//     deleted: boolean

//     id: number
//     name: string;
//     user_id: user_id|TEMP_USER_ID;
//     cell_id: number;
//     faction_id: number;

//     action_progress: number;
//     action_duration: number;
//     action_started: boolean;
//     current_action: undefined|CharacterAction
//     action_target: any

//     constructor() {
//         this.equip = new Equip();

//         this.stash = new Stash();
//         this.trade_stash = new Stash();

//         this.savings = new Savings();
//         this.trade_savings = new Savings();

//         this.status = new Status()
//         this.status.hp = 100

//         this.skills = new SkillList()

//         this.stats = new InnateStats()

//         this.stats.max.hp = 100;
//         this.stats.max.rage = 100;
//         this.stats.max.blood = 100;
//         this.stats.max.stress = 100;
//         this.stats.max.fatigue = 100;
//         this.stats.movement_speed = 1;
//         this.stats.phys_power = 10;
//         this.stats.magic_power = 10;

//         this.misc = new Misc;
//         this.misc.model = 'test'
//         this.misc.ai_tag = 'dummy'
//         // this.misc.tactic = {s0: this.world.constants.default_tactic_slot}

//         this.flags = new CharacterFlags()

//         this.changed = false;
//         this.status_changed = false;
//         this.deleted = false;

//         this.id = -1;
//         this.name = 'unknown'
//         this.user_id = '#'
//         this.cell_id = -1
//         this.faction_id = -1

//         this.action_started = false
//         this.action_progress = 0
//         this.action_duration = 0
//     }

//     async init(pool: PgPool, name: string, cell_id: number, user_id = -1) {
//         this.init_base_values(name, cell_id, user_id);
//         this.id = await this.load_to_db(pool);
//         await this.save_to_db(pool);
//         return this.id;
//     } 

//     init_base_values(name: string, cell_id: number, user_id = -1) {
//         this.name = name;
//         if (user_id != -1) {
//             this.flags.player = true;
//         }   
//         this.user_id = user_id;
//         this.cell_id = cell_id;

//         let cell = this.get_cell()
//         if (cell != undefined) {
//             this.misc.explored[cell.id] = true
//             for (let direction of dp) {
//                 let x = cell.i + direction[0]
//                 let y = cell.j + direction[1]
//                 let border_cell = this.world.get_cell(x, y)
//                 if (border_cell != undefined) {
//                     this.misc.explored[border_cell.id] = true
//                 }
//             }
//         }
//         this.faction_id = -1;
//     }

//     async update(pool: PgPool, dt: number) {
//         await this.status_check(pool);

//         if (this.flags.dead) {
//             return
//         }
        
//         if (!this.in_battle()) {
//             this.out_of_battle_update(dt)
//             this.update_action_progress(dt);
//             this.update_visited()
//         } else {
//             this.battle_update()      
//         }
//         let cell = this.get_cell()
//         if (cell != undefined) {
//             cell.visit()
            
//         }

//         this.flags_handling_update();        
//         await this.save_to_db(pool, this.changed || this.stash.changed || this.savings.changed);
//         this.changed = false;
//     }

//     update_action_progress(dt: number) {
//         if (this.action_started) {
//             this.action_progress += dt
//         } else {
//             return
//         }
//         if ((this.current_action != undefined) && (this.action_progress >= this.action_duration)) {
//             this.world.action_manager.action(this.current_action, this, this.action_target)
//         }
//     }

//     flags_handling_update() {
//         let sm = this.world.socket_manager;
//         if (this.status_changed) {
//             if (this.is_player()) {
//                 sm.send_status_update(this);
//             }            
//             this.status_changed = false;
//             this.changed = true
//         }
//         if (this.savings.changed) {
//             if (this.is_player()) {
//                 sm.send_savings_update(this);
//             }            
//             this.savings.changed = false;
//             this.changed = true
//         }
//         if (this.stash.changed) {
//             if (this.is_player()) {
//                 sm.send_stash_update_to_character(this);
//             }
            
//             this.stash.changed = false;
//             this.changed = true
//         }
//     }


//     //some stuff defined per concrete character class

//     async status_check(pool: PgPool) {
//         if (this.status.hp <= 0) {
//             this.status.hp = 0;

//             await this.world.entity_manager.remove_orders(pool, this)
//             await AuctionManagement.cancel_all_orders(pool, this.world.entity_manager, this.world.socket_manager, this)
//             await this.world.kill(pool, this.id);
//         }
//     }

//     out_of_battle_update(dt: number) {
//         this.change_rage(-1)
//     }   

//     battle_update() {
//         this.change_stress(1)
//     }

//     async on_move(pool: PgPool) {
//         return undefined
//     }

//     get_user():User {
//         return this.world.user_manager.get_user(this.user_id)
//     }

//     get_item_lvl() {
//         return 1;
//     }

//     get_tag() {
//         return this.misc.tag
//     }
//     get_hp() {
//         return this.status.hp
//     }
//     get_blood() {
//         return this.status.blood
//     }
//     get_rage() {
//         return this.status.rage
//     }
//     get_fatigue() {
//         return this.status.fatigue
//     }
//     get_stress() {
//         return this.status.stress
//     }

//     get_hp_change() {
//         return 0
//     }

//     get_rage_change() {
//         if (!this.flags.in_battle) {
//             return -1
//         } else {
//             return 1
//         }
//     }

//     get_stress_change() {
//         let d_stress = (this.get_stress_target() - this.status.stress);
//         if (d_stress != 0) {
//             if ((d_stress / 30 > 1)||(d_stress / 30 < -1)) {
//                 return Math.floor(d_stress/30)
//             } else {
//                 return Math.sign(d_stress)
//             }
//         }
//         return 0
//     }

//     get_stress_target() {
//         return 0
//     }

//     get_max_hp() {
//         return this.stats.max.hp
//     }

//     get_max_rage() {
//         return this.stats.max.rage
//     }

//     get_max_stress() {
//         return this.stats.max.stress
//     }

//     get_max_blood() {
//         return this.stats.max.blood
//     }

//     get_max_fatigue() {
//         return this.stats.max.fatigue
//     }

//     get_cell() {
//         return this.world.get_cell_by_id(this.cell_id);
//     }

//     get_faction() {
//         // if (this.faction_id != -1) {
//         //     return this.world.get_faction_from_id(this.faction_id)
//         // }
//         return undefined
//     }

//     change_hp(x: number) {
//         let tmp = this.status.hp;
//         this.status.hp = Math.max(0, Math.min(this.get_max_hp(), this.status.hp + x));
//         if (this.status.hp != tmp) {
//             this.changed = true;
//             this.status_changed = true;
//             this.send_status_update()
//         }
//         if (this.get_hp() == 0) {
//             this.flags.dead = true
//         }
//     }

//     change_rage(x: number) {
//         let tmp = this.status.rage;
//         this.status.rage = Math.max(0, Math.min(this.get_max_rage(), this.status.rage + x));
//         if (tmp != this.status.rage) {
//             this.changed = true;
//             this.status_changed = true;
//             this.send_status_update()
//         }
//     }

//     change_blood(x: number) {
//         let tmp = this.status.blood;
//         this.status.blood = Math.max(0, Math.min(this.get_max_blood(), this.status.blood + x));
//         if (tmp != this.status.blood) {
//             this.changed = true
//             this.status_changed = true;
//             this.send_status_update()
//         }
//     }

//     change_stress(x: number) {
//         let tmp = this.status.stress;
//         this.status.stress = Math.max(0, Math.min(this.get_max_stress(), this.status.stress + x));
//         if (tmp != this.status.stress) {
//             this.changed = true
//             this.status_changed = true;
//             this.send_status_update()
//         }
//     }

//     change_fatigue(x: number) {
//         let tmp = this.status.fatigue;
//         this.status.fatigue = Math.max(0, Math.min(this.get_max_fatigue(), this.status.fatigue + x));
//         if (tmp != this.status.fatigue) {
//             this.changed = true
//             this.status_changed = true;
//             this.send_status_update()
//         }
//     }

//     set_fatigue(x: number) {
//         let tmp = this.status.fatigue
//         this.status.fatigue = Math.max(0, x)
//         if (x != tmp) {
//             this.changed = true
//             this.status_changed = true;
//             this.send_status_update()
//         } 
//     }

//     change_status(dstatus: Status) {
//         this.change_hp(dstatus.hp)
//         this.change_rage(dstatus.rage);
//         this.change_stress(dstatus.stress);
//         this.change_blood(dstatus.blood);
//     }


//     //equip and stash interactions

//     equip_armour(index:number) {
//         this.equip.equip_armour(index);
//         this.changed = true;
//     }

//     equip_weapon(index:number) {
//         this.equip.equip_weapon(index);
//         this.changed = true;
//     }

//     unequip_weapon() {
//         this.equip.unequip_weapon()
//     }

//     unequip_secondary() {
//         this.equip.unequip_secondary()
//     }

//     switch_weapon() {
//         // console.log(this.name + ' switch_weapon')
//         this.equip.switch_weapon()
//         this.send_equip_update()
//     }

//     unequip_armour(tag:ARMOUR_TYPE) {
//         this.equip.unequip_armour(tag)
//     }

//     transfer(target:any, tag:material_index, x:number) {
//         this.stash.transfer(target.stash, tag, x);
//     }

//     transfer_all(target: any) {
//         for (var i_tag of this.world.get_stash_tags_list()) {
//             var x = this.stash.get(i_tag);
//             this.transfer(target, i_tag, x);
//         }
//     }

//     transfer_all_inv(target: {stash: Stash, savings: any, equip: any}) {
//         this.transfer_all(target)
//         this.savings.transfer_all(target.savings)
//         this.equip.transfer_all(target)
//     }





//     //market interactions


//     async buy(pool: PgPool, tag:material_index, amount: number, price: money) {
//         if (this.savings.get() >= amount * price) {
//             console.log('buy ' + tag + ' ' + amount + ' ' + price)
//             this.savings.transfer(this.trade_savings, amount * price as money)
//             let order = await this.world.entity_manager.generate_order(pool, 'buy', tag, this, amount, price, this.cell_id)
//             return 'ok'
//         }
//         return 'not_enough_money'        
//     }

//     async sell(pool:any, tag:material_index, amount: number, price: money) {
//         // console.log(this.stash.get(tag), amount)
//         if (this.stash.get(tag) < amount) {
//             return 'not_enough_items'
//         }
//         console.log('sell ' + tag + ' ' + amount + ' ' + price)
//         this.stash.transfer(this.trade_stash, tag, amount)
//         let order = await this.world.entity_manager.generate_order(pool, 'sell', tag, this, amount, price, this.cell_id)
//         return 'ok'
//     }


//     async clear_orders(pool:any) {
//         await this.world.entity_manager.remove_orders(pool, this)
//         await AuctionManagement.cancel_all_orders(pool, this.world.entity_manager, this.world.socket_manager, this)
//     }

//     // network simplification functions
//     send_skills_update() {
//         if (this.is_player()) {
//             this.world.socket_manager.send_skills_info(this)
//         }        
//     }
//     send_status_update() {
//         if (this.is_player()) {
//             this.world.socket_manager.send_status_update(this)
//         }        
//     }
//     send_stash_update() {
//         if (this.is_player()) {
//             this.world.socket_manager.send_stash_update_to_character(this)
//         }
//     }

//     send_equip_update() {
//         if (this.is_player()) {
//             this.world.socket_manager.send_equip_update_to_character(this)
//         }
//     }

//     send_action_ping(duration: number, is_move:boolean) {
//         if (this.is_player()) {
//             this.world.socket_manager.send_action_ping_to_character(this, duration, is_move)
//         }
//     }

//     //rgo
//     rgo_check(character:Character) {
//         generate_loot(character, this.get_tag())
//         character.send_stash_update()
//         character.send_skills_update()
//         character.changed = true
//     }



//     //attack calculations

//     async attack(pool: PgPool, target: Character, mod:'fast'|'heavy'|'usual'|'ranged', dodge_flag: boolean, distance: number) {
//         let result = new AttackResult()


//         result = this.equip.get_weapon_damage(result, (mod == 'ranged'));
//         result = this.mod_attack_damage_with_stats(result, mod);
//         result = this.roll_accuracy(result, mod, distance);
//         result = this.roll_crit(result);
//         result = target.roll_dodge(result, mod, dodge_flag);
//         result = target.roll_block(result);


//         let dice = Math.random()
//         if (dice > this.get_weapon_skill(result.weapon_type) / 50) {
//             this.change_weapon_skill(result.weapon_type, 1)
//         }
//         this.send_skills_update()
        
//         result = await target.take_damage(pool, mod, result);
//         this.change_status(result.attacker_status_change)

//         if (result.flags.killing_strike) {
//             target.transfer_all_inv(this)
//             target.rgo_check(this)
//         }
//         return result;
//     }

//     async spell_attack(pool: PgPool, target: Character, tag: spell_tags) {
//         let result = new AttackResult()

//         if (tag == 'bolt') {
//             let bolt_difficulty = 30
//             let dice = Math.random() * bolt_difficulty
//             let skill = this.skills.magic_mastery.practice
//             if (skill < dice) {
//                 this.skills.magic_mastery.practice += 1
//             }
//         }

//         result = spells[tag](result);
//         result = this.mod_spell_damage_with_stats(result, tag);

//         this.change_status(result.attacker_status_change)

//         result = await target.take_damage(pool, 'ranged', result);
//         return result;
//     }

//     async take_damage(pool: PgPool, mod:'fast'|'heavy'|'usual'|'ranged', result: AttackResult): Promise<AttackResult> {
//         let res:any = this.get_resists();
        
//         if (!result.flags.evade && !result.flags.miss) {
//             for (let i of damage_types) {
//                 if (result.damage[i] > 0) {
//                     let curr_damage = Math.max(0, result.damage[i] - res[i]);
//                     if ((curr_damage > 0) && ((i == 'slice') || (i == 'pierce')) && !(mod == 'ranged')) {
//                         result.attacker_status_change.blood += Math.floor(curr_damage / 10)
//                         result.defender_status_change.blood += Math.floor(curr_damage / 10)
//                     }
//                     result.total_damage += curr_damage;
//                     this.change_hp(-curr_damage);
//                     if (this.get_hp() == 0) {
//                         await this.world.entity_manager.remove_orders(pool, this)
//                         await AuctionManagement.cancel_all_orders(pool, this.world.entity_manager, this.world.socket_manager, this)
//                         result.flags.killing_strike = true
//                     }
//                 }
//             }
//             this.change_status(result.defender_status_change)
//         }
//         await this.save_to_db(pool)
//         return result;
//     }    

//     mod_attack_damage_with_stats(result: AttackResult, mod:'fast'|'usual'|'heavy'|'ranged') {
//         let phys_power = this.get_phys_power() / 10
        
//         switch(mod) {
//             case 'usual': {phys_power = phys_power * 2; break}
//             case 'heavy': {phys_power = phys_power * 5; break}
//             case 'ranged': {phys_power = phys_power * 2; break}
//         }
        
//         let magic_power = this.get_magic_power() / 10

//         if (this.skills.perks.claws) {
//             if (result.weapon_type == 'noweapon') {
//                 result.damage.pierce += 10
//             }
//         }

//         if (this.skills.perks.advanced_unarmed) {
//             if (result.weapon_type == 'noweapon') {
//                 result.damage.blunt += 10
//             }
//         }

//         if (mod != 'ranged') {
//             result.attacker_status_change.rage = 5
//         }
        
//         result.attacker_status_change.fatigue = 1

//         result.damage['blunt'] = Math.floor(Math.max(1, result.damage['blunt'] * phys_power));
//         result.damage['pierce'] = Math.floor(Math.max(0, result.damage['pierce'] * phys_power));
//         result.damage['slice'] = Math.floor(Math.max(0, result.damage['slice'] * phys_power));
//         result.damage['fire'] = Math.floor(Math.max(0, result.damage['fire'] * magic_power));

//         return result
//     }

//     mod_spell_damage_with_stats(result: AttackResult, tag:spell_tags) {
//         let power_mod = this.get_magic_power() / 10
//         let skill_mod = this.skills.magic_mastery.practice / 10
//         let damage_mod = power_mod * (skill_mod + 1)

//         if (this.skills.perks.magic_bolt) {
//             damage_mod = damage_mod * 1.5
//         }

//         if (this.skills.perks.mage_initiation) {
//             damage_mod = damage_mod * 1.5
//         }

//         damage_mod = Math.floor(damage_mod)

//         result.damage['blunt']  = Math.floor(Math.max(1, result.damage['blunt']     * damage_mod));
//         result.damage['pierce'] = Math.floor(Math.max(0, result.damage['pierce']    * damage_mod));
//         result.damage['slice']  = Math.floor(Math.max(0, result.damage['slice']     * damage_mod));
//         result.damage['fire']   = Math.floor(Math.max(0, result.damage['fire']      * damage_mod));

//         return result
//     }

//     roll_accuracy(result: AttackResult, mod: 'fast'|'heavy'|'usual'|'ranged', distance?: number) {
//         let dice = Math.random();

//         result.chance_to_hit = this.get_accuracy(result, mod, distance)
        
//         if (dice > result.chance_to_hit) {
//             result.flags.miss = true;
//         }

//         return result
//     }

//     roll_crit(result: AttackResult) {
//         let dice = Math.random()

//         let crit_chance = this.get_crit_chance("attack");
//         let mult = this.get_crit_mult();

//         if (dice < crit_chance) {
//             result.damage['blunt'] = result.damage['blunt'] * mult;
//             result.damage['pierce'] = result.damage['pierce'] * mult;
//             result.damage['slice'] = result.damage['slice'] * mult;
//             result.flags.crit = true;
//         }

//         return result
//     }

//     roll_dodge(result: AttackResult, mod: 'fast'|'heavy'|'usual'|'ranged', dodge_flag: boolean) {
//         let dice = Math.random()

//         let base_evade_chance = this.get_evasion_chance();
//         let attack_specific_dodge = 0;

//         if (dodge_flag) switch(mod){
//             case 'fast': {attack_specific_dodge = 0.2; break}
//             case 'usual': {attack_specific_dodge = 0.5; break}
//             case 'heavy': {attack_specific_dodge = 1; break}
//             case 'ranged': {attack_specific_dodge = 0.2;break}
//         }

//         let evade_chance = base_evade_chance + attack_specific_dodge

//         if (dice < evade_chance) {
//             result.flags.evade = true
//             result.flags.crit = false
//         }

//         return result
//     }

//     roll_block(result: AttackResult) {
//         let dice = Math.random()

//         let block_chance = this.get_block_chance();

//         if (dice < block_chance) {
//             result.flags.blocked = true;
//         }

//         return result;
//     }

//     get_magic_power() {
//         let power = this.stats.magic_power * this.equip.get_magic_power_modifier();

//         return power;
//     }

//     get_enchant_rating() {
//         let power = this.get_magic_power()
//         let skill = this.skills.magic_mastery.practice
//         return (power / 10 * skill)
//     }

//     get_phys_power() {
//         let power = this.stats.phys_power * this.equip.get_phys_power_modifier();

//         return power;
//     }

//     get_resists() {
//         let res = new DamageByTypeObject()
//         return res.add_object(this.equip.get_resists())
//     }    

//     get_evasion_chance() {
//         return character_defines.evasion + this.skills.evasion.practice * 0.01
//     }

//     get_weapon_skill(weapon_type:WEAPON_TYPE):number {
//         switch(weapon_type) {
//             case WEAPON_TYPE.NOWEAPON:  return this.skills.noweapon.practice;
//             case WEAPON_TYPE.ONEHAND:   return this.skills.onehand.practice;
//             case WEAPON_TYPE.POLEARMS:  return this.skills.polearms.practice;
//             case WEAPON_TYPE.TWOHANDED: return this.skills.twohanded.practice;
//             case WEAPON_TYPE.RANGED:    return this.skills.ranged.practice;
//         }
//     }

//     change_weapon_skill(weapon_type:WEAPON_TYPE, x: number) {
//         switch(weapon_type) {
//             case WEAPON_TYPE.NOWEAPON:  this.skills.noweapon.practice       += x;break;
//             case WEAPON_TYPE.ONEHAND:   this.skills.onehand.practice        += x;break;
//             case WEAPON_TYPE.POLEARMS:  this.skills.polearms.practice       += x;break;
//             case WEAPON_TYPE.TWOHANDED: this.skills.twohanded.practice      += x;break;
//             case WEAPON_TYPE.RANGED:    this.skills.ranged.practice         += x;break;
//         }
//     }



//     get_block_chance() {
//         let tmp = character_defines.block + this.skills.blocking.practice * character_defines.skill_blocking_modifier;

//         return tmp;
//     }

//     get_crit_chance(tag: "attack"|"spell") {
//         let base_crit_chance = character_defines.crit_chance

//         if (tag == 'attack') {
//             return base_crit_chance;
//         }
        
//         if (tag == 'spell') {
//             return base_crit_chance;
//         }
//     }

//     get_crit_mult(){
//         return character_defines.crit_mult
//     }


//     // some getters

//     get_actions() {
//         let tmp:any[] = []
//         return tmp
//     }
    
//     get_range() {
//         let base_range = 0.6
//         if (this.misc.tag == 'graci') base_range = 1.3;
//         return this.equip.get_weapon_range(base_range);
//     }

//     get_model() {
//         return this.misc.model
//     }

//     get_local_market() {
//         var cell = this.world.get_cell_by_id(this.cell_id);
//         // return cell.market;
//     }

//     get_action_points() {
//         return 10
//     }

//     get_initiative() {
//         return 10
//     }

//     get_speed() {
//         return 5
//     }



//     // craft related

//     calculate_gained_failed_craft_stress(tag:any) {
//         let total = 10;
//         return total;
//     }

//     get_craft_food_chance() {
//         let chance = 0.0;
//         chance += this.skills.cooking.practice * 0.05
//         return chance
//     } 
    

    
    
//     // flag checking functions

//     is_player() {
//         return this.flags.player;
//     }

//     in_battle() {
//         return this.flags.in_battle;
//     }

//     is_dead() {
//         return this.flags.dead
//     }



//     // factions interactions

//     set_faction(faction:any) {
//         this.changed = true
//         this.faction_id = faction.id
//     }


//     // exploration

//     add_explored(tag:any) {
//         // this.misc.explored[tag] = true;
//         // this.changed = true
//     }
    

//     update_visited() {
//         let cell = this.get_cell()
//         if (cell != undefined) {
//             let visited: {x: number, y: number}[] = []
//             for (let direction of dp) {
//                 let x = cell.i + direction[0]
//                 let y = cell.j + direction[1]
//                 let border_cell = this.world.get_cell(x, y)
//                 if ((border_cell != undefined) && border_cell.visited_recently) {
//                     visited.push({x: x, y: y})
//                 }
//                 if (border_cell != undefined && this.misc.explored[border_cell.id] != true) {
//                     this.misc.explored[border_cell.id] = true
//                     let data: any = this.world.constants.development
//                     let res1: any = {}
//                     res1[x + '_' + y] = data[x + '_' + y]
//                     if (data[x + '_' + y] != undefined) {
//                         this.world.socket_manager.send_to_character_user(this, 'map-data-cells', res1)
//                     }                   

//                     if (this.world.constants.terrain[x] != undefined && this.world.constants.terrain[x][y] != undefined) {
//                         let res2 = {x: x, y: y, ter: this.world.constants.terrain[x][y]}
//                         this.world.socket_manager.send_to_character_user(this, 'map-data-terrain', res2)
//                     }
                    
                    
                    
//                 }
//             }
//             this.world.socket_manager.send_to_character_user(this, 'cell-visited', visited)
//         }
//     }

//     async on_move_default(pool:any, data:any) {
//         let tmp = this.world.get_territory(data.x, data.y)
//         if (tmp == undefined) {
//             return 2
//         }
//         this.add_explored(this.world.get_id_from_territory(tmp));
//         this.world.socket_manager.send_explored(this);
//         this.update_visited()

//         let res = await this.on_move(pool)
//         if (res != undefined) {
//             return 2
//         } 
//         return 1
//     }

//     verify_move(dx: number, dy: number) {
//         return ((dx == 0 && dy == 1) || (dx == 0 && dy == -1) || (dx == 1 && dy == 0) || (dx == -1 && dy == 0) || (dx == 1 && dy == 1) || (dx == -1 && dy == -1))
//     }

//     set_flag(flag: 'in_battle'|'trainer'|'player'|'dead', value: boolean) {
//         this.flags[flag] = value
//         this.changed = true
//     }

//     set_battle_id(x: number) {
//         this.misc.battle_id = x
//         this.changed = true
//     }
//     get_battle_id() {
//         return this.misc.battle_id
//     }

//     set_in_battle_id(x: number) {
//         this.misc.in_battle_id = x
//         this.changed = true
//     }
//     get_in_battle_id() {
//         return this.misc.in_battle_id
//     }

//     get_tactic() {
//         return [this.world.constants.default_tactic_slot]
//     }

//     learn_perk(tag: Perks) {
//         this.skills.perks[tag] = true
//         this.changed = true
//     }


//     //db interactions

//     async save_status_to_db(pool:any, save = true) {
//         if (save) {
//             // await common.send_query(pool, constants.set_status_query, [this.status, this.id]);
//         }
//     }

//     async load_from_json(data:any) {
//         this.id = data.id;
//         this.name = data.name;
//         this.user_id = data.user_id;
//         this.cell_id = data.cell_id;
//         this.faction_id = data.faction_id

//         this.status = data.status;
//         this.skills = data.skills;
//         this.stats = data.stats;
//         this.misc = data.misc

//         this.flags = data.flags;

//         this.savings = new Savings();        
//         this.savings.load_from_json(data.savings);     
//         this.trade_savings = new Savings()
//         this.trade_savings.load_from_json(data.trade_savings)

//         this.stash = new Stash();
//         this.stash.load_from_json(data.stash);
//         this.trade_stash = new Stash()
//         this.trade_stash.load_from_json(data.trade_stash)

//         this.equip = new Equip();
//         this.equip.load_from_json(data.equip);        
//     }

//     get_json() {
//         return {
//             name: this.name,

//             status: this.status,
//             skills: this.skills,
//             stats: this.stats,
//             misc: this.misc,

//             flags: this.flags,

//             savings: this.savings.get_json(),
//             stash: this.stash.get_json(),
//             equip: this.equip.get_json(),
//         };
//     }

//     async load_to_db(pool:any) {
//         // @ts-ignore: Unreachable code error
//         if (global.flag_nodb) {
//             // @ts-ignore: Unreachable code error
//             global.last_id += 1
//             // @ts-ignore: Unreachable code error
//             return global.last_id
//         }
//         let result = await common.send_query(pool, constants.new_char_query, [
//             this.user_id,
//             this.cell_id, 
//             this.faction_id,
//             this.name, 
//             this.status,
//             this.skills,
//             this.stats,
//             this.misc,
//             this.flags,
//             this.savings.get_json(), 
//             this.trade_savings.get_json(),
//             this.stash.get_json(), 
//             this.trade_stash.get_json(),
//             this.equip.get_json()]);
//         return result.rows[0].id;
//     }

//     async save_to_db(pool:any, save = true) {
        
//         if (save) {
//             await common.send_query(pool, constants.update_char_query, [
//                 this.id,
//                 this.cell_id,
//                 this.faction_id,
//                 this.status,
//                 this.skills,
//                 this.stats,
//                 this.misc,
//                 this.flags,
//                 this.savings.get_json(),
//                 this.trade_savings.get_json(),
//                 this.stash.get_json(),
//                 this.trade_stash.get_json(),
//                 this.equip.get_json()]);
//             this.changed = false;
//         }
//     }

//     async delete_from_db(pool:any) {
//         await common.send_query(pool, constants.delete_char_query, [this.id]);
//     }
// }