/* ==========================================================================
   CV ASSET

   One place for the CV's path, filename and size.

   These were previously written out in two components, and the size was a
   hand-typed string in both. It happened to be right, but a fact duplicated
   across files is a fact that drifts the moment the PDF is regenerated —
   and a download button advertising the wrong size is a small, avoidable
   credibility leak on a site that otherwise attributes every number.
   ========================================================================== */

export const CV_FILE_NAME = 'Emmanuel_Moghalu_CV.pdf';
export const CV_PATH = `/${CV_FILE_NAME}`;

/** Keep in step with public/Emmanuel_Moghalu_CV.pdf when the file is replaced. */
export const CV_FILE_SIZE = '208 KB';

/**
 * Triggers a download of the CV.
 *
 * Shared so the terminal's `resume` command, the palette entry and the
 * download button cannot drift apart on filename or path.
 */
export function downloadCV(): void {
  const anchor = document.createElement('a');
  anchor.href = CV_PATH;
  anchor.download = CV_FILE_NAME;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
