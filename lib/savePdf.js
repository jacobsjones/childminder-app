/**
 * Save a PDF to the device.
 *
 * Phones (especially the home-screen app on iOS) ignore <a download>, and
 * navigating to a PDF there replaces the app with a viewer that has no way
 * back. So on touch devices the file goes to the native share sheet instead:
 * Save to Files, Print, Mail…
 *
 * @param {File} file
 * @returns {Promise<boolean>} false when the share sheet was refused because
 *   the tap that started this is too old — call again from a fresh tap.
 */
export async function savePdfFile(file) {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: file.name });
            return true;
        } catch (error) {
            if (error.name === 'AbortError') return true; // user closed the share sheet
            if (error.name === 'NotAllowedError') return false;
            console.error('Error sharing PDF:', error);
        }
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
}
