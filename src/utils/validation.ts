export const ValidationError = {
  REQUIRED: 'Поле обязательно для заполнения',
  INVALID_NUMBER: 'Введите корректное число',
  POSITIVE_NUMBER: 'Число должно быть положительным',
  INVALID_DATE: 'Введите корректную дату',
  MIN_LENGTH: (min: number) => `Минимальная длина: ${min} символов`,
  MAX_LENGTH: (max: number) => `Максимальная длина: ${max} символов`,
};

export const validateRequired = (value: string | number | undefined): string | null => {
  if (value === undefined || value === null || value === '') {
    return ValidationError.REQUIRED;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return ValidationError.REQUIRED;
  }
  return null;
};

export const validateNumber = (value: string | number): string | null => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return ValidationError.INVALID_NUMBER;
  }
  return null;
};

export const validatePositiveNumber = (value: string | number): string | null => {
  const numError = validateNumber(value);
  if (numError) return numError;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num <= 0) {
    return ValidationError.POSITIVE_NUMBER;
  }
  return null;
};

export const validateDate = (value: string | number): string | null => {
  try {
    const date =
      typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    if (isNaN(date.getTime())) {
      return ValidationError.INVALID_DATE;
    }
    return null;
  } catch {
    return ValidationError.INVALID_DATE;
  }
};

export const validateArea = (area: number): string | null => {
  if (area <= 0) {
    return 'Площадь должна быть больше 0';
  }
  if (area > 10000) {
    return 'Площадь слишком большая (максимум 10000 га)';
  }
  return null;
};

export const validateDosage = (dosage: number, min: number, max: number): string | null => {
  if (dosage < min) {
    return `Дозировка должна быть не менее ${min}`;
  }
  if (dosage > max) {
    return `Дозировка должна быть не более ${max}`;
  }
  return null;
};

export const validateTemperature = (temp: number): string | null => {
  if (temp < -50 || temp > 50) {
    return 'Температура должна быть в диапазоне от -50°C до 50°C';
  }
  return null;
};

export const validateHumidity = (humidity: number): string | null => {
  if (humidity < 0 || humidity > 100) {
    return 'Влажность должна быть в диапазоне от 0% до 100%';
  }
  return null;
};

