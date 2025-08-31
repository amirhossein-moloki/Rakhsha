const PADDING_TARGET_BYTES = 4096;

/**
 * Pads a JSON object to a specific byte length.
 * @param data The JSON object to pad.
 * @returns A string representation of the padded object.
 */
export function padRequest(data: object): string {
  const jsonString = JSON.stringify(data);
  const currentBytes = new TextEncoder().encode(jsonString).length;

  if (currentBytes > PADDING_TARGET_BYTES) {
    throw new Error(`Request body is larger than the target padding size of ${PADDING_TARGET_BYTES} bytes.`);
  }

  const paddingNeeded = PADDING_TARGET_BYTES - currentBytes;
  const padding = ' '.repeat(paddingNeeded);

  return jsonString + padding;
}

/**
 * A version of padRequest that returns a Blob, which might be necessary for some HTTP clients
 * or to set the Content-Type correctly.
 * @param data The JSON object to pad.
 * @returns A Blob containing the padded data with 'application/json' type.
 */
export function padRequestAsBlob(data: object): Blob {
    const paddedString = padRequest(data);
    return new Blob([paddedString], { type: 'application/json' });
}
