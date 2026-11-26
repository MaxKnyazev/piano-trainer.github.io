import type { Score, State } from './storage';

export const MINECRAFT_CATALOG_VERSION = 'minecraft-c418-v1';
export const minecraftEditions = {
  easy: { title: 'Easy Piano Collection', url: 'https://www.halleonard.com/product/369016/music-from-minecraft', label: 'Простая версия' },
  advanced: { title: 'Piano Solo Collection', url: 'https://www.halleonard.com/product/369014/music-from-minecraft', label: 'Версия сложнее' },
} as const;

// Both publisher song lists include these titles. This catalog contains metadata
// and links only; it does not reproduce or distribute the copyrighted scores.
const tracks = [
  { id: 'sweden', title: 'Sweden', album: 'Volume Alpha', focus: 'Спокойный пульс и связные смены гармонии.' },
  { id: 'minecraft', title: 'Minecraft', album: 'Volume Alpha', focus: 'Певучая мелодия и мягкое сопровождение.' },
  { id: 'wet-hands', title: 'Wet Hands', album: 'Volume Alpha', focus: 'Связность фраз и баланс двух рук.' },
  { id: 'dry-hands', title: 'Dry Hands', album: 'Volume Alpha', focus: 'Точное чтение и спокойное окончание фраз.' },
  { id: 'subwoofer-lullaby', title: 'Subwoofer Lullaby', album: 'Volume Alpha', focus: 'Ровность сопровождения и ясная мелодия.' },
  { id: 'mice-on-venus', title: 'Mice on Venus', album: 'Volume Alpha', focus: 'Работа короткими фрагментами и соединение разделов.' },
  { id: 'haggstrom', title: 'Haggstrom', album: 'Volume Alpha', focus: 'Общий пульс и аккуратная координация рук.' },
  { id: 'aria-math', title: 'Aria Math', album: 'Volume Beta', focus: 'Ровные повторяющиеся рисунки и распределение внимания.' },
];

export function createMinecraftScores(): Score[] {
  return tracks.flatMap(track => (['easy', 'advanced'] as const).map(difficulty => ({
    id: `minecraft:${track.id}:${difficulty}`,
    title: track.title,
    author: 'C418 · Daniel Rosenfeld',
    status: 'Хочу выучить',
    notes: '',
    collection: 'minecraft',
    difficulty,
    source: { url: minecraftEditions[difficulty].url, title: `Hal Leonard · ${minecraftEditions[difficulty].title}` },
    description: `${track.album}. ${track.focus}`,
  })));
}

export function withMinecraftCatalog(state: State): State {
  if (state.catalogs?.includes(MINECRAFT_CATALOG_VERSION)) return state;
  const existing = new Set(state.scores.map(s => s.id));
  return {
    ...state,
    scores: [...state.scores, ...createMinecraftScores().filter(score => !existing.has(score.id))],
    catalogs: [...(state.catalogs ?? []), MINECRAFT_CATALOG_VERSION],
  };
}
