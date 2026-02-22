import DOMPurify from 'dompurify';

/**
 * Sanitizes SVG content to prevent XSS attacks.
 * Removes script tags, event handlers, and other dangerous content.
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent) return '';
  
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use', 'symbol', 'defs', 'clipPath', 'mask', 'pattern', 'marker', 'linearGradient', 'radialGradient', 'stop', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode', 'feBlend', 'feColorMatrix', 'feComposite', 'feFlood', 'feMorphology', 'feDisplacementMap', 'feTurbulence', 'feImage'],
    ADD_ATTR: ['href', 'xlink:href', 'preserveAspectRatio', 'clip-path'],
    ADD_DATA_URI_TAGS: ['image'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'foreignObject'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onkeydown', 'onkeyup', 'onkeypress', 'ontouchstart', 'ontouchend', 'ontouchmove'],
  });
}

/**
 * Prepares SVG for display by sanitizing and adjusting dimensions.
 */
export function prepareSvgForDisplay(svgContent: string, widthReplacement = '100%', heightReplacement = '100%'): string {
  const sanitized = sanitizeSvg(svgContent);
  return sanitized
    .replace(/width="[^"]*"/, `width="${widthReplacement}"`)
    .replace(/height="[^"]*"/, `height="${heightReplacement}"`);
}
