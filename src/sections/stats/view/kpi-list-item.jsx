// src/sections/stats/view/kpi-list-item.jsx
import PropTypes from 'prop-types';
import React, { useState } from 'react';

// Import Material-UI Icons first (per perfectionist/sort-imports rule)
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Alert,
  CircularProgress,
  Typography,
  ListItemIcon, // Add ListItemIcon for placing the icon
} from '@mui/material';

import { useDeleteKpiMutation } from 'src/features/stats/statsAPI';

// --- IMPORTANT CHANGES HERE ---
// 1. Import your custom Iconify component
import { Iconify } from 'src/components/iconify';
// 2. Import getDefaultIcon from icon-picker
import { getDefaultIcon } from 'src/components/icon-picker/icon-picker';
// --- END IMPORTANT CHANGES ---

export function KpiListItem({ kpi, onEditKpi }) {
  const [deleteKpi, { isLoading: isDeleting, isError: deleteIsError, error: deleteError }] =
    useDeleteKpiMutation();
  const [openConfirm, setOpenConfirm] = useState(false);

  const handleDeleteClick = () => {
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setOpenConfirm(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteKpi(kpi.id).unwrap();
      setOpenConfirm(false);
    } catch (err) {
      console.error('Failed to delete KPI:', err);
    }
  };

  return (
    <ListItem
      divider
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5,
      }}
    >
      {/* --- IMPORTANT CHANGE HERE --- */}
      {/* Add ListItemIcon to display the icon */}
      <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
        <Iconify icon={getDefaultIcon(kpi.iconName)} width={28} height={28} />
      </ListItemIcon>
      {/* --- END IMPORTANT CHANGE --- */}

      <ListItemText
        primary={<Typography variant="subtitle1">{kpi.name}</Typography>}
        secondary={
          <>
            {kpi.description && (
              <Typography variant="body2" color="text.secondary">
                {kpi.description}
              </Typography>
            )}
            {/* FIX: Ensure kpi.points is displayed and use appropriate label */}
            {kpi.points !== undefined && kpi.points !== null && (
              <Typography variant="body2" color="text.secondary">
                Points: {kpi.points}
              </Typography>
            )}
            {isDeleting && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <CircularProgress size={16} sx={{ mr: 1 }} /> Deleting...
              </Box>
            )}
            {deleteIsError && (
              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                Error deleting: {deleteError?.data?.message || 'Unknown error'}
              </Alert>
            )}
          </>
        }
        sx={{ flexGrow: 1, pr: 2 }}
      />
      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <IconButton
          edge="end"
          aria-label="edit"
          onClick={() => onEditKpi(kpi.id)}
          disabled={isDeleting}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={handleDeleteClick}
          disabled={isDeleting}
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      <Dialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            Are you sure you want to delete the KPI &quot;{kpi.name}&quot;? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} color="primary" disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </ListItem>
  );
}

KpiListItem.propTypes = {
  kpi: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    iconName: PropTypes.string, // Add iconName to propTypes
    // FIX: Change 'unit' to 'points' and specify its type
    points: PropTypes.number, // Points should be a number, as it's INT4 in DB
  }).isRequired,
  onEditKpi: PropTypes.func.isRequired,
};
