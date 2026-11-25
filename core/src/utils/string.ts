export const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for less memory
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const previousRow = new Array(a.length + 1);
  for (let j = 0; j <= a.length; j++) {
    previousRow[j] = j;
  }

  let currentRowValue: number;
  let previousDiagonal: number;

  for (let i = 1; i <= b.length; i++) {
    previousDiagonal = i - 1;
    currentRowValue = i;

    for (let j = 1; j <= a.length; j++) {
      const temp = previousRow[j];
      if (b[i - 1] === a[j - 1]) {
        currentRowValue = previousDiagonal;
      } else {
        currentRowValue = Math.min(
          previousDiagonal + 1,
          previousRow[j] + 1,
          currentRowValue + 1,
        );
      }
      previousRow[j] = currentRowValue;
      previousDiagonal = temp;
    }
  }

  return currentRowValue;
};

export const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '\u0026\u0061\u006D\u0070\u003B')
    .replace(/"/g, '\u0026\u0071\u0075\u006F\u0074\u003B')
    .replace(/'/g, '\u0026\u0023\u0033\u0039\u003B')
    .replace(/</g, '\u0026\u006C\u0074\u003B')
    .replace(/>/g, '\u0026\u0067\u0074\u003B');