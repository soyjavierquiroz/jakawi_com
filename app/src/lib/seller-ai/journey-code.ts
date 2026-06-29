const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function codeSuffix(length = 4) {
  let suffix = "";
  for (let index = 0; index < length; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return suffix;
}

export function generateJourneyCode(prefix = "JNY") {
  return `${prefix}-${codeSuffix()}`;
}

export function generateSnapshotCode(prefix = "SNP") {
  return `${prefix}-${codeSuffix(5)}`;
}
