// src/components/data-upload/kpi-csv-upload-form.jsx

import Papa from 'papaparse';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  Box,
  Button,
  TextField,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Stack,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';

import { useGetGameParticipantsByGameIdQuery } from 'src/features/games/gamesAPI';
import {
  useCreatePlayerStatsMutation,
  useGetGameKpisByGameIdQuery,
} from 'src/features/stats/statsAPI';

const PREVIEW_ROW_COUNT = 5;

export function KpiCsvUploadForm({ gameId, onUploadSuccess }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvDataPreview, setCsvDataPreview] = useState([]);
  const [fullCsvData, setFullCsvData] = useState([]);

  const [parsingErrors, setParsingErrors] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState('');
  const [submissionSeverity, setSubmissionSeverity] = useState('info');

  const [playerNameColumnType, setPlayerNameColumnType] = useState('single');
  const [playerFirstNameColumn, setPlayerFirstNameColumn] = useState('');
  const [playerLastNameColumn, setPlayerLastNameColumn] = useState('');

  const [columnMappings, setColumnMappings] = useState({
    playerNameColumn: '',
    teamNameColumn: '',
    dateRecordedColumn: '',
    kpiColumns: {},
  });

  const [mappedStatsForSubmission, setMappedStatsForSubmission] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);

  const {
    data: gameKpis = [],
    isLoading: isLoadingKpis,
    isError: isErrorKpis,
    error: kpisError,
  } = useGetGameKpisByGameIdQuery(gameId);
  const {
    data: gameParticipants = [],
    isLoading: isLoadingParticipants,
    isError: isErrorParticipants,
    error: participantsError,
  } = useGetGameParticipantsByGameIdQuery(gameId);

  const [createPlayerStats, { isLoading: isCreatingStats }] = useCreatePlayerStatsMutation();

  // Memoized lookup map for players, ensuring various name formats are covered
  const playerLookupMap = useMemo(() => {
    const map = new Map();
    gameParticipants.forEach((p) => {
      const playerId = p.player_id;
      const teamId = p.team_id;
      const profile = p.profiles;

      if (!profile) return; // Skip if no profile data

      // 1. Display Name
      if (profile.display_name && profile.display_name.trim()) {
        map.set(profile.display_name.trim().toLowerCase(), { playerId, teamId });
      }

      const firstName = profile.first_name?.trim();
      const lastName = profile.last_name?.trim();

      // 2. Full Name (first last)
      if (firstName && lastName) {
        map.set(`${firstName.toLowerCase()} ${lastName.toLowerCase()}`, { playerId, teamId });
      }

      // 3. Full Name (last, first)
      if (firstName && lastName) {
        map.set(`${lastName.toLowerCase()}, ${firstName.toLowerCase()}`, { playerId, teamId });
      }

      // 4. Just First Name (if unique enough, handle with care)
      if (firstName && !lastName) { // Only map if there's no last name to avoid ambiguity
        map.set(firstName.toLowerCase(), { playerId, teamId });
      }
      // 5. Just Last Name (if unique enough, handle with care)
      if (lastName && !firstName) { // Only map if there's no first name to avoid ambiguity
        map.set(lastName.toLowerCase(), { playerId, teamId });
      }
    });
    return map;
  }, [gameParticipants]);


  // Memoized lookup map for teams
  const teamLookupMap = useMemo(() => {
    const map = new Map();
    gameParticipants.forEach((p) => {
      if (p.teams?.name && p.team_id) {
        map.set(p.teams.name.trim().toLowerCase(), p.team_id);
      }
    });
    return map;
  }, [gameParticipants]);

  // Resets state when a new file is selected or upload is complete
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvFile(file);
      setParsingErrors([]);
      setSubmissionStatus('');
      setMappedStatsForSubmission([]);
      setValidationErrors([]);
      setCsvHeaders([]);
      setCsvDataPreview([]);
      setFullCsvData([]);
      setPlayerNameColumnType('single'); // Reset to default player column type
      setPlayerFirstNameColumn('');
      setPlayerLastNameColumn('');
      setColumnMappings({ // Reset column mappings
        playerNameColumn: '',
        teamNameColumn: '',
        dateRecordedColumn: '',
        kpiColumns: {},
      });
      setCurrentStep(0); // Go back to file selection step
      parseCsvFile(file);
    }
  };

  // Parses the CSV file using PapaParse
  const parseCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as false to handle empty strings for KPIs
      transformHeader: (header) => header.trim(),
      // This option tells PapaParse to ignore columns beyond what's in the header.
      // This will prevent "Too many fields" errors if your CSV has extra data columns.
      skipExtraColumns: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParsingErrors(results.errors);
          setSubmissionStatus('CSV parsing errors detected. Please check your file.');
          setSubmissionSeverity('error');
          return;
        }
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setParsingErrors([{ message: 'CSV file has no headers or data. Please check file format.' }]);
          setSubmissionStatus('CSV parsing errors detected.');
          setSubmissionSeverity('error');
          return;
        }

        setCsvHeaders(results.meta.fields);
        setCsvDataPreview(results.data.slice(0, PREVIEW_ROW_COUNT));
        setFullCsvData(results.data);
        setSubmissionStatus('CSV file parsed successfully. Please map columns.');
        setSubmissionSeverity('info');
        setCurrentStep(1); // Move to mapping step
      },
      error: (err) => {
        setParsingErrors([{ message: `CSV parsing failed: ${err.message}` }]);
        setSubmissionStatus('Failed to parse CSV file.');
        setSubmissionSeverity('error');
      },
    });
  };

  // Handles changes in column mapping selections
  const handleColumnMappingChange = (field, value) => {
    if (field.startsWith('kpi_')) {
      const kpiId = field.substring(4);
      setColumnMappings((prev) => ({
        ...prev,
        kpiColumns: {
          ...prev.kpiColumns,
          [kpiId]: value,
        },
      }));
    } else {
      setColumnMappings((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Handles change for player name column type (single vs. separate)
  const handlePlayerNameColumnTypeChange = (event) => {
    setPlayerNameColumnType(event.target.value);
    if (event.target.value === 'single') {
      setPlayerFirstNameColumn('');
      setPlayerLastNameColumn('');
    } else {
      setColumnMappings((prev) => ({ ...prev, playerNameColumn: '' })); // Clear single column mapping
    }
  };

  // Processes the full CSV data based on user's column mappings
  const processMappedData = useCallback(() => {
    setMappedStatsForSubmission([]);
    setValidationErrors([]);
    setSubmissionStatus('');
    setSubmissionSeverity('info');

    const errors = [];
    const tempMappedStats = [];

    const { teamNameColumn, dateRecordedColumn, kpiColumns } = columnMappings;

    // --- Validate primary column mappings are selected ---
    if (playerNameColumnType === 'single' && !columnMappings.playerNameColumn) {
      errors.push('Please map the "Full Name" column.');
    } else if (
      playerNameColumnType === 'separate' &&
      (!playerFirstNameColumn || !playerLastNameColumn)
    ) {
      errors.push('Please map both "First Name" and "Last Name" columns.');
    }

    // Team column is no longer strictly required at mapping step, as it can be auto-assigned
    // if (!teamNameColumn) {
    //   errors.push('Please map the "Team Name" column.');
    // }
    if (!dateRecordedColumn) {
      errors.push('Please map the "Date Recorded" column.');
    }

    const hasMappedKpiColumn = Object.values(kpiColumns).some((col) => !!col);
    if (!hasMappedKpiColumn && gameKpis.length > 0) {
      errors.push('Please map at least one KPI value column.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setSubmissionStatus('Missing required column mappings. Please complete all mappings.');
      setSubmissionSeverity('error');
      return;
    }

    // --- Process each row of the CSV data ---
    fullCsvData.forEach((row, rowIndex) => {
      const lineNumber = rowIndex + 2; // +1 for 0-index to 1-index, +1 for header row

      let rawPlayerName = ''; // Used for error messages
      let playerId = null;
      let playerTeamId = null; // Team ID derived from player participant data

      // Determine Player ID and Team ID from participant data
      if (playerNameColumnType === 'single') {
        rawPlayerName = row[columnMappings.playerNameColumn]?.trim();
        if (rawPlayerName) {
          const playerInfo = playerLookupMap.get(rawPlayerName.toLowerCase());
          if (playerInfo) {
            playerId = playerInfo.playerId;
            playerTeamId = playerInfo.teamId;
          } else {
            errors.push(
              `Row ${lineNumber}: Player "${rawPlayerName}" not found in game participants.`
            );
          }
        } else {
          errors.push(
            `Row ${lineNumber}: Player name is missing in column "${columnMappings.playerNameColumn}".`
          );
        }
      } else {
        // Separate first and last name columns
        const rawFirstName = row[playerFirstNameColumn]?.trim();
        const rawLastName = row[playerLastNameColumn]?.trim();

        if (rawFirstName && rawLastName) {
          rawPlayerName = `${rawFirstName} ${rawLastName}`;
          let playerInfo = playerLookupMap.get(rawPlayerName.toLowerCase());

          if (!playerInfo) {
            // Try "Last, First" format
            const reversedName = `${rawLastName}, ${rawFirstName}`;
            playerInfo = playerLookupMap.get(reversedName.toLowerCase());
          }

          if (playerInfo) {
            playerId = playerInfo.playerId;
            playerTeamId = playerInfo.teamId;
          } else {
            errors.push(
              `Row ${lineNumber}: Player "${rawFirstName} ${rawLastName}" not found in game participants.`
            );
          }
        } else if (rawFirstName) {
          // Only first name provided
          rawPlayerName = rawFirstName;
          const playerInfo = playerLookupMap.get(rawPlayerName.toLowerCase());
          if (playerInfo) {
            playerId = playerInfo.playerId;
            playerTeamId = playerInfo.teamId;
          } else {
            errors.push(`Row ${lineNumber}: Player (first name only) "${rawFirstName}" not found.`);
          }
        } else if (rawLastName) {
          // Only last name provided
          rawPlayerName = rawLastName;
          const playerInfo = playerLookupMap.get(rawPlayerName.toLowerCase());
          if (playerInfo) {
            playerId = playerInfo.playerId;
            playerTeamId = playerInfo.teamId;
          } else {
            errors.push(`Row ${lineNumber}: Player (last name only) "${rawLastName}" not found.`);
          }
        } else {
          // This 'else' correctly catches cases where both first and last names are missing
          errors.push(
            `Row ${lineNumber}: Player first name or last name is missing in CSV columns.`
          );
        }
      }

      // --- Determine Final Team ID ---
      let finalTeamId = null;

      // 1. Try to get team from CSV if column is mapped and value exists
      const rawTeamName = row[teamNameColumn]?.trim();
      if (teamNameColumn && rawTeamName) { // Check if teamNameColumn is mapped AND has a value
        const teamIdFromCsv = teamLookupMap.get(rawTeamName.toLowerCase());
        if (teamIdFromCsv) {
          finalTeamId = teamIdFromCsv;
        } else {
          // If a team name is provided but not found, it's an error
          errors.push(`Row ${lineNumber}: Team "${rawTeamName}" from CSV not found.`);
        }
      }

      // 2. If no team ID from CSV (either column not mapped, blank, or not found),
      //    try to use the team ID from the player's game participant entry
      if (!finalTeamId && playerTeamId) {
        finalTeamId = playerTeamId;
      }
      
      // 3. If still no team ID and player was found, it's an error
      if (!finalTeamId && playerId) {
        errors.push(`Row ${lineNumber}: Could not determine team for player "${rawPlayerName}". Please ensure player has a team or map the team column correctly.`);
      }


      // Validate Date Recorded
      const rawDateRecorded = row[dateRecordedColumn]?.trim();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
      let isValidDate = true;
      if (!rawDateRecorded || !dateRegex.test(rawDateRecorded)) {
        errors.push(
          `Row ${lineNumber}: Date "${rawDateRecorded || ''}" is missing or invalid (expected YYYY-MM-DD).`
        );
        isValidDate = false;
      }

      // Process each KPI for the current row
      gameKpis.forEach((kpi) => {
        const kpiCsvColumn = kpiColumns[kpi.id];
        // Only process if KPI is mapped and column exists in row
        if (kpiCsvColumn && row[kpiCsvColumn] !== undefined && row[kpiCsvColumn] !== null) {
          const rawValue = String(row[kpiCsvColumn]).trim();

          // If the raw value is an empty string, we skip creating a stat for this KPI.
          // This allows for sparse KPI data in the CSV.
          if (rawValue === '') {
            return;
          }

          const value = parseInt(rawValue, 10); // Parse the value as an integer
          if (isNaN(value)) {
            // If the value is not a valid number (and not blank), it's an error
            errors.push(
              `Row ${lineNumber}, KPI "${kpi.name}": Value "${rawValue}" is not a valid number.`
            );
          } else if (
            // Only push if all core data (player, team, date) are valid AND KPI value is valid
            playerId &&
            finalTeamId && // This is the key: we now rely on finalTeamId after logic
            isValidDate &&
            kpi.id 
          ) {
            tempMappedStats.push({
              game_id: gameId,
              player_id: playerId,
              team_id: finalTeamId,
              kpi_id: kpi.id,
              value: value,
              date_recorded: rawDateRecorded, // Use the raw date string
            });
          }
        }
      });
    });

    setMappedStatsForSubmission(tempMappedStats);
    setValidationErrors(errors); // Set all collected errors

    // Determine overall processing status
    if (errors.length > 0) {
      setSubmissionStatus(`Found ${errors.length} error(s) during data processing.`);
      setSubmissionSeverity('error');
    } else if (tempMappedStats.length === 0) {
      setSubmissionStatus('No valid stats could be generated from the CSV with current mappings.');
      setSubmissionSeverity('warning');
    } else {
      setSubmissionStatus(`Ready to submit ${tempMappedStats.length} valid stats.`);
      setSubmissionSeverity('success');
    }

    setCurrentStep(2); // Move to review/submit step
  }, [
    fullCsvData,
    columnMappings,
    playerNameColumnType,
    playerFirstNameColumn,
    playerLastNameColumn,
    gameId,
    playerLookupMap,
    teamLookupMap,
    gameKpis,
  ]);

  // Handles the submission of mapped stats to the backend
  const handleSubmit = async () => {
    if (mappedStatsForSubmission.length === 0) {
      setSubmissionStatus('No stats to submit.');
      setSubmissionSeverity('warning');
      return;
    }

    setSubmissionStatus('Submitting stats...');
    setSubmissionSeverity('info');

    let successfulSubmissions = 0;
    let failedSubmissions = 0;
    const submissionPromises = [];

    // Process submissions in batches or individually if not too many
    // For large uploads, consider batching to avoid overwhelming the API
    for (const stat of mappedStatsForSubmission) {
      submissionPromises.push(
        createPlayerStats(stat)
          .unwrap() // Unwrap to get the actual payload or throw error
          .then(() => {
            successfulSubmissions++;
          })
          .catch((error) => {
            failedSubmissions++;
            console.error('Failed to submit stat:', stat, error);
            // Optionally, you could store more detailed errors here in state
          })
      );
    }

    await Promise.allSettled(submissionPromises); // Wait for all promises to settle

    // Update final submission status based on outcomes
    if (successfulSubmissions > 0 && failedSubmissions === 0) {
      setSubmissionStatus(`Successfully uploaded ${successfulSubmissions} stats.`);
      setSubmissionSeverity('success');
      onUploadSuccess(); // Callback to parent component for success
      // Reset form after successful upload
      setCsvFile(null);
      setCsvHeaders([]);
      setCsvDataPreview([]);
      setFullCsvData([]);
      setParsingErrors([]);
      setPlayerNameColumnType('single');
      setPlayerFirstNameColumn('');
      setPlayerLastNameColumn('');
      setColumnMappings({
        playerNameColumn: '',
        teamNameColumn: '',
        dateRecordedColumn: '',
        kpiColumns: {},
      });
      setCurrentStep(0);
    } else if (successfulSubmissions > 0 && failedSubmissions > 0) {
      setSubmissionStatus(
        `Uploaded ${successfulSubmissions} stats with ${failedSubmissions} failures. Check console for details.`
      );
      setSubmissionSeverity('warning');
    } else {
      setSubmissionStatus(`All ${failedSubmissions} stats failed to upload. Check console.`);
      setSubmissionSeverity('error');
    }
  };

  // Renders content based on the current step of the upload process
  const renderStepContent = () => {
    if (isLoadingKpis || isLoadingParticipants) {
      return (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 3 }}>
          <CircularProgress size={30} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading player, team, and KPI data for matching...
          </Typography>
        </Stack>
      );
    }

    if (isErrorKpis || isErrorParticipants) {
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          Error loading necessary data:{' '}
          {kpisError?.message || participantsError?.message || 'Unknown error.'}
        </Alert>
      );
    }

    const selectMenuProps = {
      PaperProps: {
        sx: {
          minWidth: (theme) => theme.spacing(30),
          width: 'fit-content',
          maxWidth: '80vw',
        },
      },
    };

    switch (currentStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Choose a CSV file containing your game statistics.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-upload-input"
            />
            <label htmlFor="csv-upload-input">
              <Button variant="contained" component="span" size="large">
                Select CSV File
              </Button>
            </label>
            {csvFile && (
              <Typography variant="body1" sx={{ mt: 2 }}>
                Selected:{' '}
                <Box component="span" sx={{ fontWeight: 'bold' }}>
                  {csvFile.name}
                </Box>
              </Typography>
            )}
            {parsingErrors.length > 0 && (
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                <Box>
                  <Typography>Parsing Errors:</Typography>
                  <List dense>
                    {parsingErrors.map((err, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={err.message} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary" mb={2}>
              Select the CSV column that corresponds to each required field.
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Player Name Mapping
                </Typography>
                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                  <RadioGroup
                    row
                    aria-label="player name column type"
                    name="player-name-column-type"
                    value={playerNameColumnType}
                    onChange={handlePlayerNameColumnTypeChange}
                  >
                    <FormControlLabel
                      value="single"
                      control={<Radio />}
                      label="Single 'Full Name' Column"
                    />
                    <FormControlLabel
                      value="separate"
                      control={<Radio />}
                      label="Separate 'First Name' and 'Last Name' Columns"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {playerNameColumnType === 'single' ? (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Player Full Name Column *
                  </Typography>
                  <FormControl fullWidth margin="normal" size="small" variant="outlined">
                    <InputLabel htmlFor="player-name-column-select">
                      Player Full Name Column *
                    </InputLabel>
                    <Select
                      value={columnMappings.playerNameColumn}
                      onChange={(e) =>
                        handleColumnMappingChange('playerNameColumn', e.target.value)
                      }
                      label="Player Full Name Column *"
                      MenuProps={selectMenuProps}
                      inputProps={{ id: 'player-name-column-select' }}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {csvHeaders.map((header) => (
                        <MenuItem key={header} value={header}>
                          {header}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Player First Name Column *
                    </Typography>
                    <FormControl fullWidth margin="normal" size="small" variant="outlined">
                      <InputLabel htmlFor="player-first-name-column-select">
                        Player First Name Column *
                      </InputLabel>
                      <Select
                        value={playerFirstNameColumn}
                        onChange={(e) => setPlayerFirstNameColumn(e.target.value)}
                        label="Player First Name Column *"
                        MenuProps={selectMenuProps}
                        inputProps={{ id: 'player-first-name-column-select' }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {csvHeaders.map((header) => (
                          <MenuItem key={header} value={header}>
                            {header}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Player Last Name Column *
                    </Typography>
                    <FormControl fullWidth margin="normal" size="small" variant="outlined">
                      <InputLabel htmlFor="player-last-name-column-select">
                        Player Last Name Column *
                      </InputLabel>
                      <Select
                        value={playerLastNameColumn}
                        onChange={(e) => setPlayerLastNameColumn(e.target.value)}
                        label="Player Last Name Column *"
                        MenuProps={selectMenuProps}
                        inputProps={{ id: 'player-last-name-column-select' }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {csvHeaders.map((header) => (
                          <MenuItem key={header} value={header}>
                            {header}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Team Name Column
                  {/* No longer strictly required with auto-assignment */}
                </Typography>
                <FormControl fullWidth margin="normal" size="small" variant="outlined">
                  <InputLabel htmlFor="team-name-column-select">Team Name Column</InputLabel>
                  <Select
                    value={columnMappings.teamNameColumn}
                    onChange={(e) => handleColumnMappingChange('teamNameColumn', e.target.value)}
                    label="Team Name Column"
                    MenuProps={selectMenuProps}
                    inputProps={{ id: 'team-name-column-select' }}
                  >
                    <MenuItem value="">
                      <em>None (Auto-assign from Player Team)</em>
                    </MenuItem>
                    {csvHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Date Recorded Column *
                </Typography>
                <FormControl fullWidth margin="normal" size="small" variant="outlined">
                  <InputLabel htmlFor="date-recorded-column-select">
                    Date Recorded Column *
                  </InputLabel>
                  <Select
                    value={columnMappings.dateRecordedColumn}
                    onChange={(e) =>
                      handleColumnMappingChange('dateRecordedColumn', e.target.value)
                    }
                    label="Date Recorded Column *"
                    MenuProps={selectMenuProps}
                    inputProps={{ id: 'date-recorded-column-select' }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {csvHeaders.map((header) => (
                      <MenuItem key={header} value={header}>
                        {header}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Map Individual KPI Value Columns
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  For each KPI relevant to this game, select the CSV column that contains its
                  corresponding value. If a KPI is not in your CSV, leave None selected.
                </Typography>
              </Grid>

              {gameKpis.length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="info">
                    No KPIs defined for this game. Please add KPIs first.
                  </Alert>
                </Grid>
              ) : (
                gameKpis.map((kpi) => (
                  <Grid item xs={12} sm={6} md={4} key={kpi.id}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {kpi.name} Value Column
                    </Typography>
                    <FormControl fullWidth margin="normal" size="small" variant="outlined">
                      <InputLabel htmlFor={`kpi-${kpi.id}-column-select`}>
                        {kpi.name} Value Column
                      </InputLabel>
                      <Select
                        value={columnMappings.kpiColumns[kpi.id] || ''}
                        onChange={(e) => handleColumnMappingChange(`kpi_${kpi.id}`, e.target.value)}
                        label={`${kpi.name} Value Column`}
                        MenuProps={selectMenuProps}
                        inputProps={{ id: `kpi-${kpi.id}-column-select` }}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {csvHeaders.map((header) => (
                          <MenuItem key={header} value={header}>
                            {header}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ))
              )}
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 4, mb: 1 }}>
              CSV Data Preview (First {PREVIEW_ROW_COUNT} rows):
            </Typography>
            {csvDataPreview.length > 0 ? (
              <TableContainer component={Paper}>
                <Table size="small" aria-label="csv data preview">
                  <TableHead>
                    <TableRow>
                      {csvHeaders.map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvDataPreview.map((row, index) => (
                      <TableRow key={index}>
                        {csvHeaders.map((header) => (
                          <TableCell key={header}>{row[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No data to preview.
              </Alert>
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={processMappedData}
                disabled={
                  !(
                    (playerNameColumnType === 'single' && columnMappings.playerNameColumn) ||
                    (playerNameColumnType === 'separate' &&
                      playerFirstNameColumn &&
                      playerLastNameColumn)
                  ) ||
                  // teamNameColumn is now optional for the button disable logic
                  !columnMappings.dateRecordedColumn ||
                  (gameKpis.length > 0 && Object.values(columnMappings.kpiColumns).every((col) => !col)) ||
                  fullCsvData.length === 0
                }
              >
                Process Data
              </Button>
            </Stack>
          </Box>
        );

      case 2:
        return (
          <Box>
            {submissionStatus && (
              <Alert severity={submissionSeverity} sx={{ my: 2, textAlign: 'left' }}>
                {submissionStatus}
              </Alert>
            )}

            {validationErrors.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" color="error">
                  Detailed Validation Errors:
                </Typography>
                <List dense>
                  {validationErrors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Show this alert only if there are mapped stats AND no processing errors */}
            {mappedStatsForSubmission.length > 0 && validationErrors.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {mappedStatsForSubmission.length} valid stats entries ready for submission.
              </Alert>
            )}

            <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => setCurrentStep(1)}>
                Back to Mapping
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={mappedStatsForSubmission.length === 0 || isCreatingStats}
              >
                {isCreatingStats ? <CircularProgress size={24} /> : 'Confirm & Submit Stats'}
              </Button>
            </Stack>
          </Box>
        );

      default:
        return <Alert severity="error">Unknown step.</Alert>;
    }
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 4 }}>
        Upload KPI Data via CSV
      </Typography>
      {renderStepContent()}
    </Box>
  );
}