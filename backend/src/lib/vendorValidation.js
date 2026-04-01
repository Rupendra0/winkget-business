const GSTIN_REGEX = /^[0-9A-Z]{15}$/i;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const DOCUMENT_DATA_URL_REGEX =
  /^data:(image\/(png|jpe?g|webp)|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document);base64,/i;
const MAX_DOCUMENT_DATA_LENGTH = 10 * 1024 * 1024;

const isValidEstablishmentYear = (value) => {
  if (value === undefined || value === null || value === "") return true;
  const numericYear = Number(value);
  const currentYear = new Date().getFullYear();
  return Number.isFinite(numericYear) && numericYear >= 1900 && numericYear <= currentYear;
};

module.exports = {
  GSTIN_REGEX,
  AADHAAR_REGEX,
  DOCUMENT_DATA_URL_REGEX,
  MAX_DOCUMENT_DATA_LENGTH,
  isValidEstablishmentYear,
};
