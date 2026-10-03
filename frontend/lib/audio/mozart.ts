/** Musopen Symphony, Wikimedia Commons Public Domain Mark recordings (2012). */
export const listeningLimit = 40 * 60;
export const mozartTracks = [
  { movement: "I. Molto allegro", hash: "a/a8" },
  { movement: "II. Andante", hash: "4/43" },
  { movement: "III. Menuetto. Allegretto", hash: "e/ed" },
  { movement: "IV. Finale. Allegro assai", hash: "3/3e" },
].map(({ movement, hash }) => {
  const file = encodeURIComponent(`Mozart - Symphony No. 40 in G minor, K550 - ${movement} (Musopen Symphony).flac`.replaceAll(" ", "_"));
  return { title: movement, src: `https://upload.wikimedia.org/wikipedia/commons/transcoded/${hash}/${file}/${file}.mp3`, source: `https://commons.wikimedia.org/wiki/File:${file}` };
});
