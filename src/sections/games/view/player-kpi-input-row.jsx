import React, { useState, useEffect, useCallback } from 'react';

import { Box, TextField, Grid } from '@mui/material';

export function PlayerKpiInputRow({ playerId, kpi, initialStatValue, onStatChange }) {
  // Use local state for the input values
  // Initialize with initialStatValue, or default if not provided
  // Convert number/null to string for TextField, and ensure empty string for undefined/null
  const [value, setValue] = useState(
    initialStatValue?.value !== undefined && initialStatValue?.value !== null
      ? String(initialStatValue.value)
      : ''
  );
  const [dateRecorded, setDateRecorded] = useState(
    initialStatValue?.date_recorded || new Date().toISOString().split('T')[0]
  );

  // Synchronize local state with initialStatValue prop changes.
  useEffect(() => {
    if (initialStatValue) {
      // Only update if the incoming prop value is different from the current local state
      // Convert initialStatValue.value to string for comparison with local string state
      const incomingValueString =
        initialStatValue.value !== undefined && initialStatValue.value !== null
          ? String(initialStatValue.value)
          : '';
      if (incomingValueString !== value) {
        setValue(incomingValueString);
      }
      if (initialStatValue.date_recorded !== dateRecorded) {
        setDateRecorded(initialStatValue.date_recorded || new Date().toISOString().split('T')[0]);
      }
    } else {
      // If initialStatValue becomes null/undefined, reset local state
      setValue('');
      setDateRecorded(new Date().toISOString().split('T')[0]);
    }
  }, [initialStatValue, value, dateRecorded]); // Add value and dateRecorded to dependencies for accurate comparison

  // Centralized handler for all changes (value and date)
  const handleInternalChange = useCallback(
    (field, newValue) => {
      let updatedValueForParent = value; // Default to current local state value
      let updatedDateRecordedForParent = dateRecorded; // Default to current local state date

      if (field === 'value') {
        setValue(newValue); // Update local state for immediate UI feedback (still string)

        // *** CRUCIAL CHANGE HERE: Parse the value for the parent ***
        if (newValue === '') {
          updatedValueForParent = null; // Send null if empty string
        } else {
          // Use parseFloat to allow decimals, or parseInt if only integers
          const parsed = parseFloat(newValue);
          if (isNaN(parsed)) {
            updatedValueForParent = null; // Send null if input is not a valid number
          } else {
            updatedValueForParent = parsed; // Send the actual number
          }
        }
      } else if (field === 'date_recorded') {
        setDateRecorded(newValue); // Update local state
        updatedDateRecordedForParent = newValue;

        // When date changes, ensure value is also correctly parsed and sent
        const parsed = parseFloat(value); // Use the *current* local `value` state (string)
        if (isNaN(parsed) || value === '') {
          // If it's NaN or empty string
          updatedValueForParent = null; // Send null
        } else {
          updatedValueForParent = parsed; // Send the actual number
        }
      }

      // Call the parent's onStatChange with the complete, correctly typed, updated stat entry
      onStatChange(playerId, kpi.id, {
        value: updatedValueForParent, // Now this will be a number or null
        date_recorded: updatedDateRecordedForParent,
      });
    },
    [playerId, kpi.id, onStatChange, value, dateRecorded] // Include local states in dependencies for fresh values
  );

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          label={`${kpi.name} (${kpi.points} pts)`}
          type="number"
          value={value} // Controlled component: value comes from local 'value' state (string)
          onChange={(e) => handleInternalChange('value', e.target.value)} // Call internal handler
          fullWidth
          size="small"
          margin="normal"
          sx={{ mt: 0, flexGrow: 1 }}
          inputProps={{ step: '0.01' }} // Added to allow decimal input
        />
        <TextField
          label="Date"
          type="date"
          value={dateRecorded} // Controlled component: value comes from local 'dateRecorded' state
          onChange={(e) => handleInternalChange('date_recorded', e.target.value)} // Call internal handler
          size="small"
          margin="normal"
          sx={{ mt: 0, flexShrink: 0, width: 150 }}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </Box>
    </Grid>
  );
}
