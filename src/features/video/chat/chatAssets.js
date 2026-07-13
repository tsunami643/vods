const CHEERMOTE_NAMES = [
  'cheer', 'doodlecheer', 'biblethump', 'cheerwhal', 'corgo', 'scoops', 'uni',
  'showlove', 'party', 'seemsgood', 'pride', 'kappa', 'frankerz', 'heyguys',
  'dansgame', 'elegiggle', 'trihard', 'kreygasm', '4head', 'swiftrage',
  'notlikethis', 'failfish', 'vohiyo', 'pjsalt', 'mrdestructoid', 'bday',
  'ripcheer', 'shamrock', 'bitboss', 'streamlabs', 'muxy', 'holidaycheer',
  'goal', 'anon', 'charity'
];

const CHEERMOTE_PATTERN = `(?<!\\w)(${CHEERMOTE_NAMES.join('|')})(\\d+)(?!\\w)`;

export function createCheermoteRegex() {
  return new RegExp(CHEERMOTE_PATTERN, 'gi');
}

export function findCheermotes(message) {
  const matches = [];
  const regex = createCheermoteRegex();
  let match;

  while ((match = regex.exec(message)) !== null) {
    matches.push({ name: match[1], amount: parseInt(match[2], 10) });
  }

  return matches;
}

export function getAssetSizeForDpr(devicePixelRatio = 1) {
  const scale = Math.min(3, Math.max(1, Math.ceil(devicePixelRatio)));
  return `${scale}x`;
}

export function getEmoteUrl(emote, size = '1x') {
  switch (emote.source) {
    case 'BetterTTV Global':
    case 'BetterTTV Channel':
      return `https://cdn.betterttv.net/emote/${emote.id}/${size}`;
    case 'FrankerFaceZ Global':
    case 'FrankerFaceZ Channel':
      return `https://cdn.frankerfacez.com/emote/${emote.id}/${size === '1x' ? '1' : size === '2x' ? '2' : '4'}`;
    case '7TV Global':
    case '7TV Channel':
      return `https://cdn.7tv.app/emote/${emote.id}/${size}`;
    case 'Twitch':
    default:
      return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${size === '1x' ? '1.0' : size === '2x' ? '2.0' : '3.0'}`;
  }
}

export function getBadgeUrl(badge, size = '1x') {
  const scale = size === '3x' ? '3' : size === '2x' ? '2' : '1';
  return `https://static-cdn.jtvnw.net/badges/v1/${badge.url}/${scale}`;
}

export function getCheermoteTier(amount) {
  if (amount >= 10000) return { tier: '10000', color: '#f43021' };
  if (amount >= 5000) return { tier: '5000', color: '#0099fe' };
  if (amount >= 1000) return { tier: '1000', color: '#1db2a5' };
  if (amount >= 100) return { tier: '100', color: '#9c3ee8' };
  return { tier: '1', color: '#979797' };
}

export function getCheermoteUrl(name, tier, size = '1x') {
  const file = size === '3x' ? '4.gif' : size === '2x' ? '2.gif' : '1.gif';
  return `https://d3aqoihi2n8ty8.cloudfront.net/actions/${name.toLowerCase()}/dark/animated/${tier}/${file}`;
}
