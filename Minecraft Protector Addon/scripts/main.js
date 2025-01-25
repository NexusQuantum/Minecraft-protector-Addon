import { world, system, Player, Entity, ItemStack } from "@minecraft/server";
let cancels = false;
import * as server from "@minecraft/server";
import * as ui from "@minecraft/server-ui";

//時刻取得
function getJapanTime() {
  const now = new Date();

  const JSTOffset = 9 * 60;

  now.setTime(now.getTime() + JSTOffset * 60 * 1000);

  return now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

//ブロック名取得
function getBlockName(position, player) {
  const dimension = world.getDimension("overworld");
  const block = dimension.getBlock(position);

  if (!block) {
    console.log("指定された位置にブロックはありません");
    return;
  }

  const blockName = block.type.id;
  return blockName;
}

//破壊log
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
  if (cancels == true) {
    ev.cancel = true;
  }
  let log = `§4§lIDL break §3§l ｜ §1§l name : ${
    ev.player.name
  } §3§l| §2§lblockname : ${getBlockName(
    ev.block.location
  )} §3§l｜ §1§ldata : ${getJapanTime()} §3§l｜ §6§llocation : ${
    ev.block.location.x
  } ${ev.block.location.y} ${ev.block.location.z}`;
  let pass = `b ${ev.block.location.x} ${ev.block.location.y} ${ev.block.location.z}`;
  server.world.setDynamicProperty(`${pass}`, `${log}`);
});

//設置log
world.afterEvents.playerPlaceBlock.subscribe((ev) => {
  let log = `IDL place ｜ name : ${ev.player.name} | blockname : ${getBlockName(
    ev.block.location
  )} ｜ data : ${getJapanTime()} ｜ location : ${ev.block.location.x} ${
    ev.block.location.y
  } ${ev.block.location.z}`;
  let pass = `p ${ev.block.location.x} ${ev.block.location.y} ${ev.block.location.z}`;
  server.world.setDynamicProperty(`${pass}`, `${log}`);
});

//設定メニュー関数
function setting(player) {
  const form = new ui.ActionFormData();
  form.title(`設定メニュー`);
  form.button("破壊cancel ON");
  form.button("破壊cancel OFF");
  form
    .show(player)
    .then((response) => {
      switch (response.selection) {
        case 0:
          player.sendMessage("ON");
          cancels = true;
          break;
        case 1:
          player.sendMessage("OFF");
          cancels = false;
          break;
        default:
          break;
      }
    })
    .catch((error) =>
      player.sendMessage("An error occurred: " + error.message)
    );
}

function break_search(player) {
  const form = new ui.ModalFormData();
  form.title("break_search");
  form.textField("調べるXを入力", "x");
  form.textField("調べるYを入力", "y");
  form.textField("調べるZを入力", "z");

  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }

      player.sendMessage(
        `§2§lX ${String(response.formValues[0])} ｜ Y ${String(
          response.formValues[1]
        )} ｜ Z ${String(response.formValues[2])}で履歴を検索しています...`
      );

      let search_query_break = `b ${String(response.formValues[0])} ${String(
        response.formValues[1]
      )} ${String(response.formValues[2])}`;

      const search_break = world.getDynamicProperty(search_query_break);
      player.sendMessage(`logが見つかりました! ${search_break}`);
    })
    .catch((error) => {
      player.sendMessage("履歴が見つかりませんでした");
    });
}

//インベントリ制限関数
function inventory_limit(player) {
  const form = new ui.ModalFormData();
  form.textField("禁止アイテムIDを入力してください", "ID");
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }
      player.sendMessage("ID : " + String(response.formValues[0]));
      let item = String(response.formValues[0]);
      server.world.setDynamicProperty(`i ${item}`, item);
    })
    .catch((error) => {
      player.sendMessage("エラーが発生 : " + error.message);
    });
}

function inventory_limit_r(player) {
  const form = new ui.ModalFormData();
  form.textField("削除する禁止アイテムIDを入力してください", "ID");
  form
    .show(player)
    .then((response) => {
      if (response.canceled) {
        return;
      }

      let item = String(response.formValues[0]);
      server.world.setDynamicProperty(`i ${item}`, "null");
    })
    .catch((error) => {
      player.sendMessage("エラーが発生 : " + error.message);
    });
}

//設定表示関数
server.world.afterEvents.itemUse.subscribe((ev) => {
  if (
    ev.itemStack.typeId == "minecraft:book" &&
    ev.itemStack.nameTag == "setting"
  ) {
    let player = ev.source;
    setting(player);
  }
});

//インベントリ制限設定表示関数
server.world.afterEvents.itemUse.subscribe((ev) => {
  if (
    ev.itemStack.typeId == "minecraft:book" &&
    ev.itemStack.nameTag == "ILF A"
  ) {
    let player = ev.source;
    inventory_limit(player);
  }
});

server.world.afterEvents.itemUse.subscribe((ev) => {
  if (
    ev.itemStack.typeId == "minecraft:book" &&
    ev.itemStack.nameTag == "ILF R"
  ) {
    let player = ev.source;
    inventory_limit_r(player);
  }
});

//設置log検索
server.world.beforeEvents.itemUse.subscribe((ev) => {
  if (
    ev.itemStack.typeId == "minecraft:book" &&
    ev.itemStack.nameTag === "place_search"
  ) {
    let player = ev.source;

    if (ev.source.getBlockFromViewDirection().block == undefined) {
      player.sendMessage("ブロックが見つかりません...");
      return;
    }

    let block_location = ev.source.getBlockFromViewDirection().block; //見ているブロックを取得

    if (block_location == undefined) {
      player.sendMessage("ブロックが見つかりませんでした!");
      return;
    }

    player.sendMessage(
      `§2§lx:${String(block_location.x)},y:${String(
        block_location.y
      )},z:${String(block_location.z)}で履歴を検索しています...`
    );

    player.runCommandAsync("playsound random.orb @s");

    let x = String(block_location.x);
    let y = String(block_location.y);
    let z = String(block_location.z);

    let pass_s = `p ${x} ${y} ${z}`;

    let search_query = world.getDynamicProperty(pass_s);

    ev.source.sendMessage(`§2§l検知したlog : ${search_query}`);
  }
});

//ILF
server.system.runInterval(() => {
  for (let player of world.getPlayers()) {
    if (
      player
        .getComponent("inventory")
        .container.getItem(player.selectedSlotIndex) === undefined
    ) {
      return;
    }

    let data = getJapanTime();
    let player_item = player
      .getComponent("inventory")
      .container.getItem(player.selectedSlotIndex).typeId;
    let search_query = `i ${player_item}`;
    let search = `i ${server.world.getDynamicProperty(search_query)}`;
    // player.sendMessage(`${search_query} : ${search}`);
    if (search_query == search) {
      server.world.sendMessage(
        `§4§lILF system §3§l｜ §1§lplayers ${player.name} §3§l: §6§lDetected item ${player_item} §3§l: §2§ldata ${data}`
      );

      player.runCommandAsync("clear @s " + player_item);
      player.runCommandAsync(
        "execute as @a at @s run playsound random.anvil_land @s"
      );
    } else {
      return;
    }
  }
});

server.world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack.nameTag == "break_search") {
    let player = ev.source;
    break_search(player);
  }
});

