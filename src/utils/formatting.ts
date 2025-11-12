import {format} from 'date-fns';

export const formatDate = (timestamp: number): string => {
  try {
    return format(new Date(timestamp * 1000), 'dd.MM.yyyy');
  } catch {
    return 'Дата не указана';
  }
};

export const formatDateTime = (timestamp: number): string => {
  try {
    return format(new Date(timestamp * 1000), 'dd.MM.yyyy HH:mm');
  } catch {
    return 'Дата не указана';
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};

export const formatArea = (area: number): string => {
  return `${formatNumber(area, 2)} га`;
};

export const formatDosage = (dosage: number, unit: string): string => {
  return `${formatNumber(dosage, 2)} ${unit}`;
};

export const formatPercentage = (value: number): string => {
  return `${formatNumber(value, 1)}%`;
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1000) {
    return `${formatNumber(volume / 1000, 2)} м³`;
  }
  return `${formatNumber(volume, 2)} л`;
};

export const getDaysUntilExpiration = (expirationDate: number): number => {
  const now = Math.floor(Date.now() / 1000);
  const days = Math.floor((expirationDate - now) / (24 * 60 * 60));
  return days;
};

export const formatDaysUntilExpiration = (expirationDate: number): string => {
  const days = getDaysUntilExpiration(expirationDate);
  if (days < 0) {
    return `Просрочено (${Math.abs(days)} дн.)`;
  }
  if (days === 0) {
    return 'Истекает сегодня';
  }
  if (days === 1) {
    return 'Истекает завтра';
  }
  return `Истекает через ${days} дн.`;
};

