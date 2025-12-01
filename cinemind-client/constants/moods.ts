export type Mood = {
  name: string;
  emoji: string;
  keywords: string[];
};

export const moods: Mood[] = [
  { name: '신나는', emoji: '😄', keywords: ['액션', '모험'] },
  { name: '감성적인', emoji: '😢', keywords: ['드라마', '로맨스'] },
  { name: '설레는', emoji: '💖', keywords: ['로맨스', '코미디'] },
  { name: '긴장감 넘치는', emoji: '😨', keywords: ['스릴러', '미스터리', '공포'] },
  { name: '웃고 싶은', emoji: '😂', keywords: ['코미디'] },
  { name: '생각에 잠기는', emoji: '🤔', keywords: ['다큐멘터리', '역사', '드라마'] },
];