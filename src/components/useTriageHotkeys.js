import { useEffect } from 'react';

export function useTriageHotkeys({
  onNext,
  onPrev,
  onDoing,
  onPromote,
  onDone,
  onSelectCurrent,
  onFocusSearch,
  onUndo
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Avoid capturing hotkeys when typing in input fields, textareas, or contenteditables
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if (isEditable) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      // Check for Ctrl+Z or Cmd+Z or plain 'z'
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (onUndo) onUndo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          onNext();
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          onPrev();
          break;
        case 'd':
          e.preventDefault();
          onDoing();
          break;
        case 'p':
          e.preventDefault();
          onPromote();
          break;
        case 'e':
        case 'x':
          e.preventDefault();
          onDone();
          break;
        case 'z':
          e.preventDefault();
          if (onUndo) onUndo();
          break;
        case 'enter':
          e.preventDefault();
          onSelectCurrent();
          break;
        case '/':
          e.preventDefault();
          if (onFocusSearch) onFocusSearch();
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onDoing, onPromote, onDone, onSelectCurrent, onFocusSearch, onUndo]);
}
