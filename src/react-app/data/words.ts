const WORD_BANK = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us", "great", "between", "need",
  "large", "often", "hand", "high", "place", "hold", "turn", "where", "much",
  "before", "move", "right", "boy", "old", "too", "same", "tell", "does",
  "set", "three", "want", "air", "play", "small", "end", "put", "home",
  "read", "hand", "port", "large", "spell", "add", "even", "land", "here",
  "must", "big", "high", "such", "follow", "act", "why", "ask", "men",
  "change", "went", "light", "kind", "off", "need", "house", "picture",
  "try", "us", "again", "animal", "point", "mother", "world", "near",
  "build", "self", "earth", "father", "head", "stand", "own", "page",
  "should", "country", "found", "answer", "school", "grow", "study",
  "still", "learn", "plant", "cover", "food", "sun", "four", "between",
  "state", "keep", "eye", "never", "last", "let", "thought", "city",
];

export function generateWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return words;
}
