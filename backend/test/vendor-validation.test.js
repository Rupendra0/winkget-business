const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GSTIN_REGEX,
  AADHAAR_REGEX,
  DOCUMENT_DATA_URL_REGEX,
  isValidEstablishmentYear,
} = require("../src/lib/vendorValidation");

test("GSTIN validation accepts 15-character alphanumeric values", () => {
  assert.equal(GSTIN_REGEX.test("22AAAAA0000A1Z5"), true);
  assert.equal(GSTIN_REGEX.test("22aaaaa0000a1z5"), true);
  assert.equal(GSTIN_REGEX.test("22AAAAA0000A1Z"), false);
  assert.equal(GSTIN_REGEX.test("22AAAAA0000A1Z55"), false);
});

test("Aadhaar validation requires exactly 12 digits", () => {
  assert.equal(AADHAAR_REGEX.test("123412341234"), true);
  assert.equal(AADHAAR_REGEX.test("12341234123"), false);
  assert.equal(AADHAAR_REGEX.test("1234-1234-1234"), false);
  assert.equal(AADHAAR_REGEX.test("12341234123A"), false);
});

test("Document data URL validation supports image, PDF and Word formats", () => {
  assert.equal(DOCUMENT_DATA_URL_REGEX.test("data:image/png;base64,AAA"), true);
  assert.equal(DOCUMENT_DATA_URL_REGEX.test("data:image/jpeg;base64,AAA"), true);
  assert.equal(DOCUMENT_DATA_URL_REGEX.test("data:application/pdf;base64,AAA"), true);
  assert.equal(DOCUMENT_DATA_URL_REGEX.test("data:application/msword;base64,AAA"), true);
  assert.equal(
    DOCUMENT_DATA_URL_REGEX.test("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,AAA"),
    true
  );
  assert.equal(DOCUMENT_DATA_URL_REGEX.test("data:text/plain;base64,AAA"), false);
});

test("Establishment year validation enforces 1900 to current year range", () => {
  const currentYear = new Date().getFullYear();
  assert.equal(isValidEstablishmentYear(1900), true);
  assert.equal(isValidEstablishmentYear(currentYear), true);
  assert.equal(isValidEstablishmentYear(1899), false);
  assert.equal(isValidEstablishmentYear(currentYear + 1), false);
  assert.equal(isValidEstablishmentYear(""), true);
  assert.equal(isValidEstablishmentYear(undefined), true);
});
