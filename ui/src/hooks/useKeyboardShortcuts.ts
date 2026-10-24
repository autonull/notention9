import {useEffect} from 'react';
import type {View} from '@notention/core';
import {VIEW_SHORTCUTS} from '../utils/navigation';

interface UseKeyboardShortcutsProps {
	onNewNote: () => void;
	onSearch: () => void;
	onCommandPalette: () => void;
	onPropertyPalette?: () => void;
	onSave?: () => void;
	onPreviousNote?: () => void;
	onNextNote?: () => void;
	onBackToList?: () => void;
	onToggleSidebar?: () => void;
	onEscape?: () => void;
	onShortcutsHelp?: () => void;
	onNavigateView?: (view: View) => void;
}

export function useKeyboardShortcuts({
	onNewNote,
	onSearch,
	onCommandPalette,
	onPropertyPalette,
	onSave,
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
			if (!isMeta && !isAlt && !isShift && e.key === '?') {
				const target = e.target as HTMLElement;
				if (!(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true')) {
					e.preventDefault();
					onShortcutsHelp?.();
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

				// Allow Ctrl+S to work even in inputs
				if ((isMeta && e.key.toLowerCase() === 's') ||
					(isMeta && e.key === 'Enter')) {
				} else if (isMeta && e.key.toLowerCase() === 'k') {
					// Allow command palette in inputs too
				} else if (!isMeta && !isAlt && !isShift && e.key === '?') {
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

			// Save Note: Ctrl+S or Cmd+S
			if (isMeta && e.key.toLowerCase() === 's') {
				e.preventDefault();
				onSave?.();
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
		onPreviousNote,
		onNextNote,
		onBackToList,
		onToggleSidebar,
		onEscape,
		onShortcutsHelp,
		onNavigateView,
	]);
};