/**
 * Runtime environment detection.
 *
 * This used to be an inline <script> in index.html that set a bare `_mobile`
 * global; keeping it here makes the dependency explicit and lets the page ship
 * without inline script.
 */

/** Mobile layout is forced on with ?mobile=1 and forced off with ?mobile=0. */
function detectMobile() {
	try {
		const href = window.location.href;
		const looksMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(
				navigator.userAgent,
			) || href.includes("mobile=1");
		return looksMobile && !href.includes("mobile=0");
	} catch (error) {
		console.error("Failed to detect the mobile environment:", error);
		return false;
	}
}

export const isMobile = detectMobile();

if (isMobile) {
	const viewport = document.querySelector("meta[name='viewport']");
	if (viewport) {
		viewport.setAttribute(
			"content",
			"width=device-width, height=device-height, initial-scale=1, maximum-scale=1",
		);
	}
}
