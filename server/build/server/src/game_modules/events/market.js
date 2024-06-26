"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventMarket = void 0;
const ACTIONS_BASIC_1 = require("../AI/ACTIONS_BASIC");
const basic_functions_1 = require("../calculations/basic_functions");
const user_manager_1 = require("../client_communication/user_manager");
const system_1 = require("../market/system");
const effects_1 = require("../effects/effects");
const data_objects_1 = require("../data/data_objects");
const data_id_1 = require("../data/data_id");
var EventMarket;
(function (EventMarket) {
    function buy(character, material, amount, price) {
        const response = system_1.MarketOrders.new_buy_order(material, amount, price, character);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.BELONGINGS */);
        effects_1.Effect.Update.cell_market(character.cell_id);
        return response;
    }
    EventMarket.buy = buy;
    function sell(character, material, amount, price) {
        // console.log('sell ' + material + ' ' + amount + ' ' + price)
        const response = system_1.MarketOrders.new_sell_order(material, amount, price, character);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.BELONGINGS */);
        effects_1.Effect.Update.cell_market(character.cell_id);
        return response;
    }
    EventMarket.sell = sell;
    function sell_item(character, index, price) {
        // console.log('sell item index ' + index)
        const response = system_1.ItemOrders.sell(character, index, price);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.BELONGINGS */);
        effects_1.Effect.Update.cell_market(character.cell_id);
        return response;
    }
    EventMarket.sell_item = sell_item;
    function execute_sell_order(buyer, order_id, amount) {
        let result = system_1.MarketOrders.execute_sell_order(order_id, amount, buyer);
        const order = data_objects_1.Data.MarketOrders.from_id(order_id);
        const seller = data_objects_1.Data.Characters.from_id(order.owner_id);
        if ((seller.user_id == undefined) && (result == 'ok')) {
            (0, ACTIONS_BASIC_1.roll_price_belief_sell_increase)(seller, order.material, (0, basic_functions_1.trim)(Math.min(amount, order.amount), 1, 100) / 50);
        }
        user_manager_1.UserManagement.add_user_to_update_queue(buyer.user_id, 8 /* UI_Part.STASH */);
        user_manager_1.UserManagement.add_user_to_update_queue(buyer.user_id, 9 /* UI_Part.SAVINGS */);
        user_manager_1.UserManagement.add_user_to_update_queue(seller.user_id, 9 /* UI_Part.SAVINGS */);
        user_manager_1.UserManagement.add_user_to_update_queue(seller.user_id, 8 /* UI_Part.STASH */);
        effects_1.Effect.Update.cell_market(buyer.cell_id);
    }
    EventMarket.execute_sell_order = execute_sell_order;
    function execute_buy_order(seller, order_id, amount) {
        const result = system_1.MarketOrders.execute_buy_order(order_id, amount, seller);
        const order = data_objects_1.Data.MarketOrders.from_id(order_id);
        const buyer = data_objects_1.Data.Characters.from_id(order.owner_id);
        if ((seller.user_id == undefined) && (result == 'ok')) {
            (0, ACTIONS_BASIC_1.roll_price_belief_sell_decrease)(seller, order.material, (0, basic_functions_1.trim)(Math.min(amount, order.amount), 1, 100) / 50);
        }
        user_manager_1.UserManagement.add_user_to_update_queue(buyer.user_id, 8 /* UI_Part.STASH */);
        user_manager_1.UserManagement.add_user_to_update_queue(buyer.user_id, 9 /* UI_Part.SAVINGS */);
        user_manager_1.UserManagement.add_user_to_update_queue(seller.user_id, 9 /* UI_Part.SAVINGS */);
        user_manager_1.UserManagement.add_user_to_update_queue(seller.user_id, 8 /* UI_Part.STASH */);
        effects_1.Effect.Update.cell_market(seller.cell_id);
    }
    EventMarket.execute_buy_order = execute_buy_order;
    function buyout_item(seller, buyer, item_index) {
        system_1.ItemOrders.buy(item_index, buyer, seller);
        user_manager_1.UserManagement.add_user_to_update_queue(buyer.user_id, 7 /* UI_Part.BELONGINGS */);
        user_manager_1.UserManagement.add_user_to_update_queue(seller.user_id, 7 /* UI_Part.BELONGINGS */);
        effects_1.Effect.Update.cell_market(buyer.cell_id);
    }
    EventMarket.buyout_item = buyout_item;
    /**
     * Clears all character orders.
     * @param character
     */
    function clear_orders(character) {
        // console.log('clear all orders of ' + character.get_name())
        remove_bulk_orders(character);
        remove_item_orders(character);
        character.trade_savings.transfer_all(character.savings);
        character.trade_stash.transfer_all(character.stash);
    }
    EventMarket.clear_orders = clear_orders;
    function remove_item_orders(character) {
        system_1.ItemOrders.remove_all_character(character);
        effects_1.Effect.Update.cell_market(character.cell_id);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.BELONGINGS */);
    }
    EventMarket.remove_item_orders = remove_item_orders;
    function remove_bulk_orders(character) {
        let temporary_list = data_id_1.DataID.Character.market_orders_list(character.id);
        remove_orders_list(temporary_list);
    }
    EventMarket.remove_bulk_orders = remove_bulk_orders;
    function remove_orders_list(list) {
        for (let id of list) {
            remove_bulk_order(id);
        }
    }
    function remove_bulk_order(order_id) {
        const order = data_objects_1.Data.MarketOrders.from_id(order_id);
        system_1.MarketOrders.remove(order_id);
        const character = data_objects_1.Data.Characters.from_id(order.owner_id);
        effects_1.Effect.Update.cell_market(character.cell_id);
        user_manager_1.UserManagement.add_user_to_update_queue(character.user_id, 7 /* UI_Part.BELONGINGS */);
    }
    EventMarket.remove_bulk_order = remove_bulk_order;
})(EventMarket || (exports.EventMarket = EventMarket = {}));
