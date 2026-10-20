export const convertTemperature = (value: number, from: string, to: string): number | null => {
  if (from === to) return value;
  let celsius: number;

  switch (from) {
    case '°C':
      celsius = value;
      break;
    case '°F':
      celsius = (value - 32) * 5 / 9;
      break;
    case 'K':
      celsius = value - 273.15;
      break;
    default:
      return null;
  }

  switch (to) {
    case '°C':
      return celsius;
    case '°F':
      return (celsius * 9 / 5) + 32;
    case 'K':
      return celsius + 273.15;
    default:
      return null;
  }
};