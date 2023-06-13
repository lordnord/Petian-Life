"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraderRoutine = void 0;
const data_1 = require("../data");
const market_1 = require("../events/market");
const system_1 = require("../map/system");
const systems_communication_1 = require("../systems_communication");
// import { money } from "../types";
const AI_SCRIPTED_VALUES_1 = require("./AI_SCRIPTED_VALUES");
const actions_1 = require("./actions");
const triggers_1 = require("./triggers");
function TraderRoutine(character) {
    // console.log("???")
    if (character.in_battle())
        return;
    if (character.action != undefined)
        return;
    if (character.is_player())
        return;
    if (character.current_building != undefined)
        return;
    if ((0, triggers_1.tired)(character)) {
        let responce = (0, actions_1.rest_building)(character, character.savings.get());
        if (!responce) {
            (0, actions_1.rest_outside)(character);
            return;
        }
        return;
    }
    if (character.ai_state == 0 /* AIstate.Idle */) {
        // console.log('start')
        character.ai_state = 5 /* AIstate.PatrolPrices */;
    }
    if (character.ai_state == 4 /* AIstate.GoToMarket */) {
        // console.log('going to market')
        if (system_1.MapSystem.has_market(character.cell_id)) {
            (0, actions_1.sell_all_stash)(character);
            character.ai_state = 1 /* AIstate.WaitSale */;
        }
        else {
            (0, actions_1.market_walk)(character);
        }
    }
    // wait until you earn enough money or sell out
    if (character.ai_state == 1 /* AIstate.WaitSale */) {
        // console.log('wait for sales')
        if ((character.savings.get() > 1000) || character.trade_stash.is_empty()) {
            character.ai_state = 3 /* AIstate.Patrol */;
        }
        else
            return;
    }
    if (character.ai_state == 5 /* AIstate.PatrolPrices */) {
        if (Math.random() < 0.1) {
            // console.log('switch to buying')
            character.ai_state = 3 /* AIstate.Patrol */;
        }
        (0, actions_1.update_price_beliefs)(character);
        (0, actions_1.urban_walk)(character);
    }
    //wander aimlessly and buy random stuff
    if (character.ai_state == 3 /* AIstate.Patrol */) {
        // if we had spent most of our money -> go back to market and sell stuff
        if ((character.savings.get() < 100)) {
            character.ai_state = 4 /* AIstate.GoToMarket */;
            return;
        }
        //sometimes switch to checking prices again
        if ((Math.random() < 0.1)) {
            character.ai_state = 5 /* AIstate.PatrolPrices */;
            return;
        }
        let orders = systems_communication_1.Convert.cell_id_to_bulk_orders(character.cell_id);
        let best_profit = 0;
        let target = undefined;
        // buying stuff according to price beliefs
        for (let item of orders) {
            let order = data_1.Data.BulkOrders.from_id(item);
            let profit = AI_SCRIPTED_VALUES_1.AItrade.sell_price_bulk(character, order.tag) - order.price;
            if ((profit > best_profit) && (order.price < character.savings.get())) {
                best_profit = profit;
                target = order;
            }
        }
        if (target == undefined) {
            // console.log("searching for best deals")
            (0, actions_1.urban_walk)(character);
        }
        else {
            // console.log(`buy ${materials.index_to_material(target.tag).string_tag} for ${target.price} with intention to make ${best_profit} profit`)
            market_1.EventMarket.execute_sell_order(character, target.id, 1);
            return;
        }
    }
}
exports.TraderRoutine = TraderRoutine;
