import { elementById } from "../HTMLwrappers/common.js";
function send_switch_weapon_request(socket) {
    socket.emit('switch-weapon');
}
function generate_toggle(div) {
    return () => { div.classList.toggle('border-yellow'); };
}
export function init_equipment_screen(socket) {
    const destroy_button = elementById('destroy');
    const enchant_button = elementById('enchant');
    const affected_div = elementById('equip_tab');
    destroy_button.onclick = generate_toggle(affected_div);
    elementById('send_switch_weapon_request').onclick = () => send_switch_weapon_request(socket);
}
