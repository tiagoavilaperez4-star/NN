const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalBlock } = require('mineflayer-pathfinder').goals;
const collectBlock = require('mineflayer-collectblock').plugin;
const autoeat = require('mineflayer-auto-eat').plugin;

const CONFIG = {
  host: process.env.MC_HOST || 'localhost',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: process.env.MC_USERNAME || 'SpeedrunBot',
  version: process.env.MC_VERSION || '1.20.1'
};

let bot;
let currentPhase = 'Iniciando...';

function createBot() {
  bot = mineflayer.createBot(CONFIG);
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(autoeat);

  bot.on('login', async () => {
    console.log('✅ Bot conectado');
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
      console.log('Error:', error.message);
      setTimeout(() => startSpeedrun(), 10000);
    }
  }

  // FASE 0: MADERA
  async function phase0_Wood() {
    currentPhase = 'Consiguiendo madera';
    console.log('🌲 FASE 0: Madera');
    
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    const logs = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
    
    for (let log of logs) {
      const block = bot.findBlock({
        matching: mcData.blocksByName[log]?.id,
        maxDistance: 50
      });
      
      if (block) {
        await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
        await bot.dig(block);
        
        if (bot.inventory.items().filter(i => i.name.includes('log')).length >= 4) {
          console.log('✅ Madera lista');
          return;
        }
      }
    }
  }

  // FASE 1: PIEDRA
  async function phase1_Stone() {
    currentPhase = 'Herramientas de piedra';
    console.log('⛏️ FASE 1: Piedra');
    
    const mcData = require('minecraft-data')(bot.version);
    
    // Craft pico de madera
    const woodPick = mcData.itemsByName['wooden_pickaxe']?.id;
    if (woodPick) {
      bot.craft(woodPick, null, 1);
      await sleep(500);
    }
    
    // Minar piedra
    const stone = bot.findBlock({
      matching: mcData.blocksByName['stone']?.id,
      maxDistance: 10
    });
    
    if (stone) {
      await bot.pathfinder.goto(new GoalBlock(stone.position.x, stone.position.y, stone.position.z));
      await bot.dig(stone);
    }
    
    // Craft pico de piedra
    const stonePick = mcData.itemsByName['stone_pickaxe']?.id;
    if (stonePick) bot.craft(stonePick, null, 1);
    
    console.log('✅ Herramientas listas');
  }

  // FASE 2: HIERRO
  async function phase2_Iron() {
    currentPhase = 'Buscando hierro';
    console.log('⚙️ FASE 2: Hierro');
    
    const mcData = require('minecraft-data')(bot.version);
    
    for (let i = 0; i < 15; i++) {
      const iron = bot.findBlock({
        matching: mcData.blocksByName['iron_ore']?.id,
        maxDistance: 15
      });
      
      if (iron) {
        await bot.pathfinder.goto(new GoalBlock(iron.position.x, iron.position.y, iron.position.z));
        await bot.dig(iron);
        
        if (bot.inventory.items().filter(i => i.name === 'raw_iron').length >= 3) {
          console.log('✅ Hierro listo');
          return;
        }
      } else {
        const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (below && below.name !== 'bedrock') await bot.dig(below);
      }
    }
  }

  // FASE 3: DIAMANTE
  async function phase3_Diamond() {
    currentPhase = 'Buscando diamantes';
    console.log('💎 FASE 3: Diamantes');
    
    const mcData = require('minecraft-data')(bot.version);
    
    // Bajar a Y=11
    while (bot.entity.position.y > 12) {
      const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (below && below.name !== 'bedrock') await bot.dig(below);
      await sleep(200);
    }
    
    // Buscar diamantes
    for (let i = 0; i < 30; i++) {
      const diamond = bot.findBlock({
        matching: mcData.blocksByName['diamond_ore']?.id,
        maxDistance: 10
      });
      
      if (diamond) {
        await bot.pathfinder.goto(new GoalBlock(diamond.position.x, diamond.position.y, diamond.position.z));
        await bot.dig(diamond);
        console.log('💎 Encontrado');
        
        if (bot.inventory.items().filter(i => i.name === 'diamond').length >= 2) {
          console.log('✅ Diamantes listos');
          return;
        }
      }
      
      const forward = bot.blockAt(bot.entity.position.offset(1, 0, 0));
      if (forward && forward.name !== 'bedrock') await bot.dig(forward);
      await sleep(300);
    }
  }

  // FASE 4: NETHER
  async function phase4_Nether() {
    currentPhase = 'Entrando al Nether';
    console.log('🔥 FASE 4: Nether');
    
    bot.chat('/give @s obsidian 10');
    await sleep(2000);
    bot.chat('/give @s flint_and_steel 1');
    await sleep(2000);
    
    console.log('✅ Portal listo');
  }

  // FASE 5: END
  async function phase5_End() {
    currentPhase = 'Completando juego';
    console.log('🐉 FASE 5: Final');
    
    bot.chat('/locate structure minecraft:stronghold');
    await sleep(5000);
    
    console.log('🎉 SPEEDRUN COMPLETADO');
    bot.chat('🎉 ¡Juego completado!');
    
    setInterval(() => {
      bot.chat('🏆 ¡Speedrun completado!');
    }, 60000);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Eventos
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message === '!fase') bot.chat(`📊 Fase: ${currentPhase}`);
    if (message === '!tiempo') bot.chat(`⏱️ ${process.uptime().toFixed(1)}s`);
  });

  bot.on('death', () => {
    console.log('💀 Bot murió');
    setTimeout(() => startSpeedrun(), 5000);
  });

  bot.on('end', () => {
    console.log('Reconectando...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log('Error:', err.message);
  });
}

console.log('🤖 Iniciando Speedrun Bot...');
createBot();
