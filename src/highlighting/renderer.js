export const EXCLUDED = 'script,style,noscript,textarea,input,select,option,button,[contenteditable]:not([contenteditable="false"]),[hidden],[aria-hidden="true"]';
export function eligible(node) {
  return Boolean(node.nodeValue?.trim() && node.parentElement && !node.parentElement.closest(EXCLUDED) && node.parentElement.namespaceURI === 'http://www.w3.org/1999/xhtml');
}
export function createRenderer(document, registry, HighlightClass) {
  const positive = new HighlightClass(), negative = new HighlightClass();
  negative.priority = 1;
  const style = document.createElement('style');
  style.dataset.plugInu = 'highlights';
  return {
    configure(preferences) {
      if (!style.isConnected) document.documentElement.append(style);
      style.textContent = `::highlight(plug-inu-positive){background-color:${preferences.positiveColor};color:#171717}::highlight(plug-inu-negative){background-color:${preferences.negativeColor};color:#171717;text-decoration:underline}`;
      registry.set('plug-inu-positive', positive); registry.set('plug-inu-negative', negative);
    },
    add(node, matches) {
      for (const match of matches) {
        const range = document.createRange();
        range.setStart(node, match.start); range.setEnd(node, match.end);
        (match.kind === 'negative' ? negative : positive).add(range);
      }
    },
    clear() { positive.clear(); negative.clear(); registry.delete('plug-inu-positive'); registry.delete('plug-inu-negative'); style.remove(); },
  };
}
