// src/components/icon-picker/icon-picker.jsx
import { FixedSizeGrid } from 'react-window'; // Import for virtualization
import AutoSizer from 'react-virtualized-auto-sizer'; // For flexible grid sizing
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Search as MuiSearchIcon } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Tooltip, // Added for hover tooltips
} from '@mui/material';

// Import your custom Iconify component
import { Iconify } from 'src/components/iconify'; // Adjust path if necessary
import { allIconNames } from 'src/components/iconify/register-icons'; // Get all registered icon names

// ----------------------------------------------------------------------

// This function now returns an Iconify-compatible icon string.
// It replaces the previous getIconComponent's role of providing a component.
// It's exported so other parts of your app that *were* using getIconComponent
// can now use this to get a default or validated Iconify string.
export const getDefaultIcon = (iconName) => {
  if (iconName && allIconNames.includes(iconName)) {
    return iconName;
  }
  // Fallback to a suitable default from your registered icons if not found
  // Make sure 'solar:home-2-bold' is actually in your bundled icons!
  // If 'solar:home-2-bold' is not guaranteed, you might want to pick a very common one like 'mdi:home'
  // or a general default from your 'allIconNames' list.
  console.warn(
    `Icon "${iconName}" not found in registered icons. Falling back to 'solar:home-2-bold'.`
  );
  return 'solar:home-2-bold'; // Ensure this is a valid and registered icon
};

const ICON_DISPLAY_SIZE = 30; // Size of the icon within the grid item

export function IconPicker({ open, onClose, onSelectIcon, selectedIconName }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce the search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const filteredIcons = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    const result = allIconNames.filter((name) => name.toLowerCase().includes(term));
    result.sort(); // Keep sorting
    return result;
  }, [debouncedSearchTerm]);

  // Dimensions for react-window grid
  const columnCount = 6; // Number of columns in the grid
  const columnWidth = 80; // Width of each icon item (px)
  const rowHeight = 80; // Height of each icon item (px)

  const gridRef = useRef(null); // Ref for the FixedSizeGrid

  // Scroll to selected icon when dialog opens or selectedIconName changes
  useEffect(() => {
    if (open && gridRef.current && selectedIconName) {
      const selectedIndex = filteredIcons.indexOf(selectedIconName);
      if (selectedIndex !== -1) {
        const row = Math.floor(selectedIndex / columnCount);
        gridRef.current.scrollToItem({
          rowIndex: row,
          align: 'center', // Scroll to center the row
        });
      }
    }
  }, [open, selectedIconName, filteredIcons, columnCount]);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    const iconName = filteredIcons[index];

    if (!iconName) {
      return null; // No icon at this position
    }

    const isSelected = selectedIconName === iconName;

    return (
      <Box style={style}>
        <Tooltip title={iconName} placement="bottom" arrow>
          {' '}
          {/* Tooltip added */}
          <IconButton
            onClick={() => {
              onSelectIcon(iconName);
              onClose();
            }}
            color={isSelected ? 'primary' : 'default'}
            sx={{
              border: isSelected ? '2px solid' : '1px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: (theme) => theme.palette.action.hover,
              },
            }}
          >
            <Iconify icon={iconName} width={ICON_DISPLAY_SIZE} height={ICON_DISPLAY_SIZE} />
            {/* Optional: show name below icon. You might need to truncate long names */}
            {/*
            <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', wordBreak: 'break-all', fontSize: '0.65rem' }}>
              {iconName.split(':')[1] || iconName}
            </Typography>
            */}
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select an Icon</DialogTitle>
      <DialogContent dividers>
        {' '}
        {/* Added dividers for better visual separation */}
        <TextField
          fullWidth
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MuiSearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ height: 400, width: '100%' }}>
          {' '}
          {/* Fixed height for the virtualized list */}
          {filteredIcons.length > 0 ? (
            <AutoSizer>
              {({ height, width }) => (
                <FixedSizeGrid
                  ref={gridRef}
                  columnCount={columnCount}
                  columnWidth={columnWidth}
                  height={height}
                  rowCount={Math.ceil(filteredIcons.length / columnCount)}
                  rowHeight={rowHeight}
                  width={width}
                  itemData={filteredIcons} // Pass data to cells if needed, though we access via index here
                  overscanRowCount={5} // Render a few extra rows above/below for smoother scrolling
                  overscanColumnCount={2} // Render a few extra columns
                >
                  {Cell}
                </FixedSizeGrid>
              )}
            </AutoSizer>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              {`No icons found for "${searchTerm}"`}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
