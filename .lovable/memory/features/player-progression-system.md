---
name: Player Progression System
description: XP/level system based on goals and assists milestones, with visual progression in profile
type: feature
---
Players earn XP by reaching cumulative stat milestones (goals/assists).

Tables:
- `player_xp`: user_id, total_xp, level
- `player_milestones`: user_id, stat_type, threshold, xp_reward, achieved_at

Milestones: 10/20/50/100/200/500 for both goals and assists.
XP rewards scale: 50/75/150/300/500/1000.

Levels: 13 tiers from 0 to 13000 XP.

Auto-check runs on profile load via `useAutoMilestoneCheck()`.
Toast notification fires when milestone achieved.

Profile shows: Level badge (header), XP bar, stat progress cards, achieved milestones list.

Future: XP/level may influence card rarity/visual evolution.
