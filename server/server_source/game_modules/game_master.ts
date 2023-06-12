import { LandPlotType } from "./DATA_LAYOUT_BUILDING";
import { Data } from "./data";
import { Effect } from "./events/effects";
import { Event } from "./events/events";
import { RAT_SKIN } from "./manager_classes/materials_manager";
import { Cell } from "./map/DATA_LAYOUT_CELL";
import { Template } from "./templates";
import { cell_id, money } from "./types";

// steppe_humans 9 9
// city 2 6
// rats 12 16
// graci 17 13
// elodino_free 24 20
// big_humans 10 28
const LUMP_OF_MONEY = 1000 as money
const TONS_OF_MONEY = 30000 as money

export namespace GameMaster {
    export function spawn_faction(cell_id: cell_id, faction: string) {
        console.log('spawn ' + faction)
        const [x, y] = Data.World.id_to_coordinate(cell_id)
        if (faction == 'city') {
            // creation of mayor
            const mayor = Template.Character.HumanCity(x, y, 'Mayor')
            mayor.savings.inc(TONS_OF_MONEY)
            Data.World.set_faction_leader(faction, mayor.id)

            const mayor_house = Effect.new_building(cell_id, LandPlotType.HumanHouse, 200)
            Data.Buildings.set_ownership(mayor.id, mayor_house)

            // creation of first colonists
            const cook = Template.Character.HumanCook(x, y, "Cook", 'city')
            const shoemaker = Template.Character.HumanCity(x, y, "Bootmaker")
            shoemaker.skills.clothier = 100
            shoemaker.perks.shoemaker = true
            shoemaker.stash.inc(RAT_SKIN, 50)
            shoemaker.savings.inc(LUMP_OF_MONEY)
            const fletcher = Template.Character.HumanFletcher(x, y, "Fletcher", 'city')
            const armourer = Template.Character.HumanCity(x, y, "Armourer")
            armourer.skills.clothier = 100
            armourer.perks.shoemaker = true
            armourer.stash.inc(RAT_SKIN, 50)
            armourer.savings.inc(LUMP_OF_MONEY)
            const hunter_1 = Template.Character.HumanRatHunter(x, y, "Hunter 1")
            const hunter_2 = Template.Character.HumanRatHunter(x, y, "Hunter 2")

            // innkeeper
            const innkeeper = Template.Character.HumanCity(x, y, "Innkeeper")
            const inn = Effect.new_building(cell_id, LandPlotType.Inn, 200)
            Data.Buildings.set_ownership(innkeeper.id, inn)
        }

        if (faction == 'rats') {
            const rat_lair = Effect.new_building(cell_id, LandPlotType.RatLair, 400)
        }
    }

    export function update(dt: number) {
        let rats = 0
        for (const character of Data.CharacterDB.list()) {
            if (character.race() == 'rat') {
                rats += 1
            }
        }

        for (const cell of Data.Cells.list_ids()) {
            const buildings = Data.Buildings.from_cell_id(cell)
            if (buildings == undefined) continue
            for (const item of buildings) {
                const building = Data.Buildings.from_id(item)
                if (building.type == LandPlotType.RatLair) {
                    let cell_object = Data.Cells.from_id(cell)
                    cell_object.rat_scent = 50
                    cell_object.rat_scent += 5 * dt / 100
                    spawn_rat(rats, cell_object)
                }
            }
        }
    }

    export function spawn_rat(rats_number: number, cell: Cell) {        
        if (rats_number < 50) {
            let dice_spawn = Math.random()
            if (dice_spawn > 0.4) return            
            let dice = Math.random()
            if (dice < 0.6) {
                Template.Character.GenericRat(cell.x, cell.y, undefined)
            } else if (dice < 0.8) {
                Template.Character.BigRat(cell.x, cell.y, undefined)
            } else if (dice < 1) {
                Template.Character.MageRat(cell.x, cell.y, undefined)
            }                
        }
    }
}