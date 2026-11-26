import {useEffect} from 'react';
import type {View} from '@notention/core';

const VIEW_SHORTCUTS: Record<string, View> = {
    '1': 'notes',
    '2': 'settings',
    ',': 'settings',
};

interface UseKeyboardShortcutsProps {
	onNewNote: () => void;
	onSearch: () => void;
	onCommandPalette: () => void;
	onPropertyPalette?: () => void;
	onSave?: () => void;
	onPasteToCapture?: (clipboardText: string) => void;
	onUndo?: () => void;
	onRedo?: () => void;
	onPreviousNote?: () => void;
	onNextNote?: () => void;
	onBackToList?: () => void;
	onToggleSidebar?: () => void;
	onEscape?: () => void;
	onShortcutsHelp?: () => void;
	onNavigateView?: (view: View) => void;
	onOpenDescribeIt?: () => void;
}

export function useKeyboardShortcuts({
	onNewNote,
	onSearch,
	onCommandPalette,
	onPropertyPalette,
	onSave,
	onPasteToCapture,
	onUndo,
	onRedo,
	onPreviousNote,
	onNextNote,
	onBackToList,
	onToggleSidebar,
	onEscape,
	onShortcutsHelp,
	onNavigateView,
}: UseKeyboardShortcutsProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMeta = e.metaKey || e.ctrlKey;
			const isAlt = e.altKey;
			const isShift = e.shiftKey;

			// Global Escape
			if (e.key === 'Escape') {
				onEscape?.();
			}

			// Help shortcut: ? (Shift+/)
			if (!isMeta && !isAlt && e.key === '?') {
				const target = e.target as HTMLElement;
				if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
					e.preventDefault();
					onShortcutsHelp?.();
				}
			}

			// Describe It shortcut: Ctrl+Shift+/ (or Cmd+Shift+/)
			if (isMeta && isShift && e.key === '/') {
				const target = e.target as HTMLElement;
				if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
					e.preventDefault();
					onOpenDescribeIt?.();
				}
			}

			// Accessibility: Skip to main content (Ctrl+Alt+S)
			if (isMeta && isAlt && e.key.toLowerCase() === 's') {
				const target = e.target as HTMLElement;
				if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
					e.preventDefault();
					const mainContent = document.getElementById('main-content');
					if (mainContent) {
						mainContent.focus();
						mainContent.scrollIntoView({behavior: 'smooth'});
					}
				}
			}

			// Skip if focusing on input elements (except specific shortcuts)
			if (e.target instanceof HTMLElement &&
				(e.target.tagName === 'INPUT' ||
					e.target.tagName === 'TEXTAREA' ||
					e.target.contentEditable === 'true')) {

				// Allow save, property palette, and command palette while editing
				if ((isMeta && e.key.toLowerCase() === 's') ||
					(isMeta && e.key === 'Enter') ||
					(isMeta && isShift && e.key.toLowerCase() === 'p') ||
					(isMeta && e.key.toLowerCase() === 'n')) {
				} else if (isMeta && e.key.toLowerCase() === 'k') {
					// Allow command palette in inputs too
				} else if (!isMeta && !isAlt && e.key === '?') {
					// Allow help in inputs
				} else if (isMeta && isAlt && e.key.toLowerCase() === 's') {
					// Allow accessibility skip link
				} else {
					return;
				}
			}

			// Command Palette: Ctrl+K or Cmd+K
			if (isMeta && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				onCommandPalette();
			}

			// Property Palette: Ctrl+Shift+P (standard VSCode style)
			if (isMeta && isShift && e.key.toLowerCase() === 'p') {
				e.preventDefault();
				onPropertyPalette?.();
			}

			// New Note: Ctrl+N or Cmd+N
			if (isMeta && !isShift && e.key.toLowerCase() === 'n') {
				e.preventDefault();
				onNewNote();
			}

			// Save Note: Ctrl+S or Cmd+S (also Ctrl+Enter / Cmd+Enter)
			if (isMeta && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
				e.preventDefault();
				onSave?.();
			}

			// Paste to Capture: Ctrl+V or Cmd+V (when not in input)
			if (isMeta && e.key.toLowerCase() === 'v') {
				const target = e.target as HTMLElement;
				if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
					e.preventDefault();
					navigator.clipboard.readText().then(text => {
						if (text.trim()) onPasteToCapture?.(text.trim());
					}).catch(() => {});
				}
			}

			// Undo: Ctrl+Z or Cmd+Z (allow in inputs)
			if (isMeta && !isShift && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				onUndo?.();
			}

			// Redo: Ctrl+Shift+Z or Cmd+Shift+Z (allow in inputs)
			if (isMeta && isShift && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				onRedo?.();
			}

			// Search Sidebar: Ctrl+/ or Cmd+/
			if (isMeta && e.key === '/') {
				e.preventDefault();
				onSearch();
			}

			// Also support Ctrl+Shift+F for search
			if (isMeta && isShift && e.key.toLowerCase() === 'f') {
				e.preventDefault();
				onSearch();
			}

			// View switching: Alt+1..9, Alt+0
			const digit = e.code.match(/^(?:Digit|Numpad)(\d)$/)?.[1] ?? e.key;
			if (isAlt && !isMeta && !isShift && /^\d$/.test(digit)) {
				const view = VIEW_SHORTCUTS[digit];
				if (view) {
					e.preventDefault();
					onNavigateView?.(view);
				}
			}

			// Navigation shortcuts
			if (isAlt && e.key === 'ArrowUp') {
				e.preventDefault();
				onPreviousNote?.();
			}

			if (isAlt && e.key === 'ArrowDown') {
				e.preventDefault();
				onNextNote?.();
			}

			if (isAlt && e.key === 'ArrowLeft') {
				e.preventDefault();
				onBackToList?.();
			}

			// Toggle sidebar: Ctrl+\ or Ctrl+B
			if (isMeta && (e.key === '\\' || e.key.toLowerCase() === 'b')) {
				e.preventDefault();
				onToggleSidebar?.();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [
		onNewNote,
		onSearch,
		onCommandPalette,
		onPropertyPalette,
		onSave,
		onPasteToCapture,
		onUndo,
		onRedo,
		onPreviousNote,
		onNextNote,
		onBackToList,
		onToggleSidebar,
		onEscape,
		onShortcutsHelp,
		onNavigateView,
		onOpenDescribeIt,
	]);
};