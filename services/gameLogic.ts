import { INPUT_RANGE, LIMIT_MULTIPLIER, generateFoodBatch } from '../constants.ts';
import type { Player, FoodItem } from '../types.ts';

export const MAX_ROUNDS = 15; // V4.0 Entropy Enforcer Limit

export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// V2.0: Dynamic Limits based on N
export const calculateGameLimits = (playerCount: number): [number, number] => {
  return [
    playerCount * LIMIT_MULTIPLIER.MIN,
    playerCount * LIMIT_MULTIPLIER.MAX
  ];
};

export const generateBotBid = (currentLoad: number, limitMin: number): number => {
  const heat = currentLoad / limitMin;
  if (heat < 0.5) return getRandomInt(8, 20);
  else if (heat < 0.8) return getRandomInt(4, 12);
  else {
    const roll = Math.random();
    if (roll < 0.4) return 1;
    if (roll < 0.8) return getRandomInt(2, 5);
    return getRandomInt(15, 20);
  }
};

/**
 * V3.0 结算逻辑
 * X: Scapegoats (最高价，导致崩塌) -> 饭醉分子
 * Y: Survivors (非X)
 * Z: Cowards (Y中出价最低者) -> 小鸟胃
 * W: True Survivors (Y - Z) -> 顶级老饕
 */
export const calculateScores = (
  players: Player[],
  roundBids: Record<string, number>,
  isCollapse: boolean,
  isPerfectFit: boolean = false
): { updatedPlayers: Player[], bounty: number, scapegoats: string[], cowards: string[] } => {

  // 1. 基础数据准备
  let maxBid = -1;
  players.forEach(p => {
    const bid = roundBids[p.id] || 0;
    if (bid > maxBid) maxBid = bid;
  });

  // 临时玩家状态副本
  let tempPlayers = players.map(p => ({
    ...p,
    isCoward: false, // 重置状态
    lastAction: ''   // 重置上轮标签
  }));

  // 🏆 特殊彩蛋：完美契合 (Perfect Fit)
  if (isPerfectFit) {
    tempPlayers.forEach(p => {
      const bid = roundBids[p.id] || 0;
      p.stash += bid;
      p.status = 'alive';
      p.lastAction = '🏆 完美契合大师';
      // 视觉：加菜
      const newItems = generateFoodBatch(Math.min(bid, 3));
      p.plateFood = [...p.plateFood, ...newItems];
    });
    return { updatedPlayers: tempPlayers, bounty: 0, scapegoats: [], cowards: [] };
  }

  // 如果没有炸锅，逻辑很简单：大家都是赢家，都在积累
  if (!isCollapse) {
    tempPlayers.forEach(p => {
      const bid = roundBids[p.id] || 0;
      p.stash += bid;
      p.status = 'alive';
      // 视觉：加菜
      const newItems = generateFoodBatch(Math.min(bid, 3));
      p.plateFood = [...p.plateFood, ...newItems];
    });
    return { updatedPlayers: tempPlayers, bounty: 0, scapegoats: [], cowards: [] };
  }

  // === 炸锅逻辑 (Collapse Logic V3.0) ===

  // 2. 集合划分
  // 集合 X (Scapegoats): 本轮出价最高的人 -> 饭醉分子
  const setX_ids = tempPlayers
    .filter(p => (roundBids[p.id] || 0) === maxBid)
    .map(p => p.id);

  // 集合 Y (All Survivors): 只要不是 X
  const setY_players = tempPlayers.filter(p => !setX_ids.includes(p.id));

  let setZ_ids: string[] = []; // Cowards -> 小鸟胃
  let setW_ids: string[] = []; // True Survivors -> 顶级老饕

  if (setY_players.length > 0) {
    // 找出 Y 中的最低出价
    let minSurvivorBid = 10000;
    setY_players.forEach(p => {
      const bid = roundBids[p.id] || 0;
      if (bid < minSurvivorBid) minSurvivorBid = bid;
    });

    // 集合 Z (Cowards): Y 中出价最低的人
    setZ_ids = setY_players
      .filter(p => (roundBids[p.id] || 0) === minSurvivorBid)
      .map(p => p.id);

    // 集合 W (True Survivors): Y 中 排除掉 Z
    setW_ids = setY_players
      .filter(p => !setZ_ids.includes(p.id))
      .map(p => p.id);
  }

  // 3. 判定结局模式
  // 模式 A/B: 存在中间派 (True Survivors)。此时 X 和 Z 都要死。
  // 模式 C: 不存在中间派 (Total Cowardice)。此时只有 X 死，Z 苟活（平分赏金）。
  const hasTrueSurvivors = setW_ids.length > 0;

  let bounty = 0;

  // 4. 执行处决与赏金收集
  tempPlayers.forEach(p => {
    const bid = roundBids[p.id] || 0;
    const isScapegoat = setX_ids.includes(p.id);
    const isCoward = setZ_ids.includes(p.id);

    // 标记懦夫属性（用于UI展示，即使他可能活下来）
    if (isCoward) p.isCoward = true;

    if (isScapegoat) {
      // [X] 饭醉分子：必死，充公
      bounty += p.stash + bid;
      p.stash = 0;
      p.plateFood = [];
      p.status = 'dead';
      p.lastAction = '🥵 饭醉';
    } else if (isCoward && hasTrueSurvivors) {
      // [Z] 小鸟胃 (存在中间派时)：处决，充公
      bounty += p.stash + bid;
      p.stash = 0;
      p.plateFood = [];
      p.status = 'dead'; // 死去的小鸟胃
      p.lastAction = '🐤 小鸟胃';
    } else if (isCoward && !hasTrueSurvivors) {
      // [Z] 拾荒者/幸存的小鸟胃 (不存在中间派时)：苟活，不充公，准备分钱
      // 注意：本轮下注先入袋
      p.stash += bid;
      p.status = 'alive';
      p.lastAction = '🐤 小鸟胃';
      // 视觉加菜
      p.plateFood = [...p.plateFood, ...generateFoodBatch(Math.min(bid, 3))];
    } else {
      // [W] 顶级老饕：存活，不充公，准备分大钱
      p.stash += bid;
      p.status = 'alive';
      p.lastAction = '😋 老饕';
      // 视觉加菜
      p.plateFood = [...p.plateFood, ...generateFoodBatch(Math.min(bid, 3))];
    }
  });

  // 5. 瓜分赏金 (Distribute Bounty)
  if (bounty > 0) {
    if (hasTrueSurvivors) {
      // === 模式 A/B: 顶级老饕按风险权重瓜分 ===
      const trueSurvivors = tempPlayers.filter(p => setW_ids.includes(p.id));
      const totalRisk = trueSurvivors.reduce((sum, p) => sum + (roundBids[p.id] || 0), 0);

      trueSurvivors.forEach(p => {
        const myBid = roundBids[p.id] || 0;
        const share = totalRisk > 0 ? bounty * (myBid / totalRisk) : 0;
        p.stash += share;
        if (share > 0) {
          p.plateFood = [...p.plateFood, ...generateFoodBatch(2)];
        }
      });
    } else {
      // === 模式 C: 小鸟胃平分 (全员苟活) ===
      const scavengers = tempPlayers.filter(p => setZ_ids.includes(p.id));
      if (scavengers.length > 0) {
        const share = bounty / scavengers.length;
        scavengers.forEach(p => {
          p.stash += share;
          p.plateFood = [...p.plateFood, ...generateFoodBatch(1)]; // 只能捡一点点
        });
      }
    }
  }

  // 返回用于 UI 展示的名单
  // 死去的小鸟胃才算在 cowards 列表里用于通报
  const deadCowards = hasTrueSurvivors ? setZ_ids : [];

  return {
    updatedPlayers: tempPlayers,
    bounty,
    scapegoats: setX_ids,
    cowards: deadCowards
  };
};