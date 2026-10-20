export const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '\u0026\u0061\u006D\u0070\u003B')
    .replace(/"/g, '\u0026\u0071\u0075\u006F\u0074\u003B')
    .replace(/'/g, '\u0026\u0023\u0033\u0039\u003B')
    .replace(/</g, '\u0026\u006C\u0074\u003B')
    .replace(/>/g, '\u0026\u0067\u0074\u003B');