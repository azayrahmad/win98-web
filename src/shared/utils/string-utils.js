export function truncateName(name, maxLength = 20) {
  if (name.length <= maxLength) {
    return name;
  }

  const lastDotIndex = name.lastIndexOf('.');
  const hasExtension = lastDotIndex !== -1 && lastDotIndex < name.length - 1;

  if (!hasExtension) {
    return `${name.substring(0, maxLength - 3)}...`;
  }

  const baseName = name.substring(0, lastDotIndex);
  const extension = name.substring(lastDotIndex);

  if (extension.length >= maxLength - 4) { // ... + at least one char for basename
      return `${name.substring(0, maxLength-3)}...`;
  }

  const availableLengthForBaseName = maxLength - extension.length - 3;
  const truncatedBaseName = baseName.substring(0, availableLengthForBaseName);

  return `${truncatedBaseName}...${extension}`;
}
