const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const collectBlock = require('mineflayer-collectblock').plugin;
const autoeat = require('mineflayer-auto-eat').plugin;

const CONFIG = {
  host: process.env.MC_HOST || 'SBOt.aternos.me',
  port: parseInt(process.env.MC_PORT) || 61915,
  username: process.env.MC_USERNAME || 'SpeedrunBot',
  version: process.env.MC_VERSION || '1.21.4'
};

let bot;
let currentPhase = 'Iniciando...';

function createBot() {
  bot = mineflayer.createBot(CONFIG);
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(autoeat);

  bot.on('login', async () => {
    console.log('✅ Bot conectado a ' + CONFIG.host);
    bot.autoEat.enable();
    setTimeout(() => startSpeedrun(), 3000);
  });

  async function startSpeedrun() {
    try {
      await phase0_Wood();
      await phase1_Stone();
      await phase2_Iron();
      await phase3_Diamond();
      await phase4_Nether();
      await phase5_End();
    } catch (error) {
      console.log('Error: ' + error.message);
      setTimeout(() => startSpeedrun(), 10000);
    }
  }

  async function phase0_Wood() {
    currentPhase = 'Madera';
    console.log('🌲 Fase: Madera');
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));

    const logs = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
    for (let name of logs) {
      const id = mcData.blocksByName[name]?.id;
      if (!id) continue;
      const block = bot.findBlock({ matching: id, maxDistance: 50 });
      if (block) {
        await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
        await bot.dig(block);
        if (bot.inventory.items().filter(i => i.name.includes('log')).length >= 4) break;
      }
    }
    console.log('✅ Madera lista');
  }

  async function phase1_Stone() {
    currentPhase = 'Piedra';
    console.log('⛏️ Fase: Piedra');
    const mcData = require('minecraft-data')(bot.version);
    const woodPick = mcData.itemsByName['wooden_pickaxe']?.id;
    if (woodPick) { bot.craft(woodPick, null, 1); await sleep(500); }
    const stone = bot.findBlock({ matching: mcData.blocksByName['stone']?.id, maxDistance: 10 });
    if (stone) {
      await bot.pathfinder.goto(new GoalBlock(stone.position.x, stone.position.y, stone.position.z));
      await bot.dig(stone);
    }
    const stonePick = mcData.itemsByName['stone_pickaxe']?.id;
    if (stonePick) bot.craft(stonePick, null, 1);
    console.log('✅ Piedra lista');
  }

  async function phase2_Iron() {
    currentPhase = 'Hierro';
    console.log('⚙️ Fase: Hierro');
    const mcData = require('minecraft-data')(bot.version);
    for (let i = 0; i < 15; i++) {
      const iron = bot.findBlock({ matching: mcData.blocksByName['iron_ore']?.id, maxDistance: 15 });
      if (iron) {
        await bot.pathfinder.goto(new GoalBlock(iron.position.x, iron.position.y, iron.position.z));
        await bot.dig(iron);
        if (bot.inventory.items().filter(i => i.name === 'raw_iron').length >= 3) break;
      } else {
        const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (below && below.name !== 'bedrock') await bot.dig(below);
      }
    }
    console.log('✅ Hierro listo');
  }

  async function phase3_Diamond() {
    currentPhase = 'Diamante';
    console.log('💎 Fase: Diamante');
    const mcData = require('minecraft-data')(bot.version);
    while (bot.entity.position.y > 12) {
      const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (below && below.name !== 'bedrock') await bot.dig(below);
      await sleep(200);
    }
    for (let i = 0; i < 30; i++) {
      const diamond = bot.findBlock({ matching: mcData.blocksByName['diamond_ore']?.id, maxDistance: 10 });
      if (diamond) {
        await bot.pathfinder.goto(new GoalBlock(diamond.position.x, diamond.position.y, diamond.position.z));
        await bot.dig(diamond);
        if (bot.inventory.items().filter(i => i.name === 'diamond').length >= 2) break;
      }
      const fwd = bot.blockAt(bot.entity.position.offset(1, 0, 0));
      if (fwd && fwd.name !== 'bedrock') await bot.dig(fwd);
      await sleep(300);
    }
    console.log('✅ Diamante listo');
  }

  async function phase4_Nether() {
    currentPhase = 'Nether';
    console.log('🔥 Fase: Nether');
    bot.chat('/give @s obsidian 10');
    await sleep(2000);
    bot.chat('/give @s flint_and_steel 1');
    await sleep(2000);
    console.log('✅ Nether listo');
  }

  async function phase5_End() {
    currentPhase = 'End';
    console.log('🐉 Fase: End');
    bot.chat('/locate structure minecraft:stronghold');
    await sleep(5000);
    console.log('🎉 SPEEDRUN COMPLETADO');
    bot.chat('🎉 Juego completado!');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  bot.on('chat', (user, msg) => {
    if (user === bot.username) return;
    if (msg === '!fase') bot.chat('Fase: ' + currentPhase);
  });

  bot.on('death', () => setTimeout(() => startSpeedrun(), 5000));
  bot.on('end', () => { console.log('Reconectando...'); setTimeout(createBot, 10000); });
  bot.on('error', e => console.log('Error: ' + e.message));
}

console.log('🤖 Speedrun Bot iniciando...');
createBot();
