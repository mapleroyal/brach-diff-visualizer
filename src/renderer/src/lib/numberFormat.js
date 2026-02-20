const US_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

const formatNumber = (value) => US_NUMBER_FORMATTER.format(Number(value) || 0);

const formatSignedNumber = (value) => {
  const normalized = Number(value) || 0;

  if (normalized > 0) {
    return `+${formatNumber(normalized)}`;
  }

  if (normalized < 0) {
    return `-${formatNumber(Math.abs(normalized))}`;
  }

  return "0";
};

export { formatNumber, formatSignedNumber };
