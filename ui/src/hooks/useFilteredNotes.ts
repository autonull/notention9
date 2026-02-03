import { useMemo } from 'react';
import { Note } from '@notention/core';
import { getDistance } from './spacetime';

// Memoized note filtering function
export const useFilteredNotes = (
  notes: Note[],
  searchTerm: string = '',
  activeView: string = 'notes',
  userLocation?: { lat: number; lng: number }
) => {
  return useMemo(() => {
    let filteredNotes = [...notes];

    // Apply search term filtering
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.title.toLowerCase().includes(lowerSearchTerm) ||
        note.content.toLowerCase().includes(lowerSearchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Apply view-specific filtering
    switch (activeView) {
      case 'trash':
        filteredNotes = filteredNotes.filter(note => !!note.deletedAt);
        break;
      case 'notes':
        filteredNotes = filteredNotes.filter(note => !note.deletedAt);
        break;
      case 'map':
        // Filter for notes with location properties when in map view
        if (userLocation) {
          filteredNotes = filteredNotes.filter(note => {
            // Look for location-related properties
            return note.properties.some(prop => 
              prop.key.includes('location') || 
              prop.key.includes('geo') || 
              prop.key.includes('place') ||
              prop.key.includes('lat') ||
              prop.key.includes('lng')
            );
          });
          
          // Sort by distance if location is available
          filteredNotes.sort((a, b) => {
            const distA = getDistance(a, userLocation);
            const distB = getDistance(b, userLocation);
            return distA - distB;
          });
        }
        break;
      default:
        // For other views, just filter out deleted notes
        filteredNotes = filteredNotes.filter(note => !note.deletedAt);
    }

    return filteredNotes;
  }, [notes, searchTerm, activeView, userLocation]);
};

// Memoized note sorting function
export const useSortedNotes = (
  notes: Note[],
  sortOrder: string = 'updatedAt_desc'
) => {
  return useMemo(() => {
    const sortedNotes = [...notes];
    
    switch (sortOrder) {
      case 'updatedAt_desc':
        sortedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'updatedAt_asc':
        sortedNotes.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case 'createdAt_desc':
        sortedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'createdAt_asc':
        sortedNotes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title_asc':
        sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        sortedNotes.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'soonest':
        // Sort by soonest date-related properties
        sortedNotes.sort((a, b) => {
          const dateA = extractEarliestDate(a);
          const dateB = extractEarliestDate(b);
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
        break;
      case 'nearest':
        // This would require location data
        break;
      case 'relevance':
        // This would require search relevance scoring
        break;
      default:
        sortedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    
    return sortedNotes;
  }, [notes, sortOrder]);
};

// Helper function to extract dates from properties
function extractEarliestDate(note: Note): string | null {
  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const dateProps = note.properties.filter(prop => 
    prop.key.includes('date') || 
    prop.key.includes('deadline') || 
    prop.key.includes('start') || 
    prop.key.includes('end')
  );
  
  if (dateProps.length > 0) {
    const dateValues = dateProps.flatMap(prop => 
      prop.values.filter(val => dateRegex.test(val))
    );
    
    if (dateValues.length > 0) {
      dateValues.sort();
      return dateValues[0];
    }
  }
  
  // Also check content for dates
  const contentDates = note.content.match(dateRegex);
  if (contentDates && contentDates.length > 0) {
    contentDates.sort();
    return contentDates[0];
  }
  
  return null;
}