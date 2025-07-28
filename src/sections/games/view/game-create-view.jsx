// src/views/dashboard/game/create-view.jsx
import { useEffect, useState } from 'react';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormControl,
  FormLabel,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';
import { supabase } from 'src/lib/supabase';
import { useGetKpisQuery } from 'src/features/stats/statsAPI';

// ----------------------------------------------------------------------

const metadata = { title: `Create New Game | Dashboard - ${CONFIG.appName}` };

export function GameCreateView() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGameTypeId, setSelectedGameTypeId] = useState('');
  const [gameTypes, setGameTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gameTypesLoading, setGameTypesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [numberOfTeams, setNumberOfTeams] = useState(''); // Applies to Draft and Draft H2H

  // H2H fields
  const [competitionDuration, setCompetitionDuration] = useState(''); // e.g., number of weeks/days
  const [competitionDurationUnit, setCompetitionDurationUnit] = useState('weeks'); // 'weeks' or 'days'
  const [matchFrequencyUnit, setMatchFrequencyUnit] = useState('weekly'); // 'daily' or 'weekly'

  // State to store game type IDs for easy comparison
  const [draftTypeId, setDraftTypeId] = useState(null);
  const [individualTypeId, setIndividualTypeId] = useState(null);
  const [draftH2HTypeId, setDraftH2HTypeId] = useState(null);
  const [individualH2HTypeId, setIndividualH2HTypeId] = useState(null);

  const [dateRange, setDateRange] = useState([null, null]);

  const [userOrganizationId, setUserOrganizationId] = useState(null);
  const [fetchingUserOrg, setFetchingUserOrg] = useState(true);

  const [selectedKpiIds, setSelectedKpiIds] = useState([]);

  const {
    data: kpis,
    isLoading: loadingKpis,
    isError: kpisError,
    error: kpisErrorMessage,
  } = useGetKpisQuery();

  // Fetch game types and current user's organization_id
  useEffect(() => {
    async function fetchData() {
      setGameTypesLoading(true);
      setFetchingUserOrg(true);
      setError('');

      const { data: gameTypesData, error: fetchGameTypesError } = await supabase
        .from('game_types')
        .select('id, name');
      if (fetchGameTypesError) {
        console.error('Error fetching game types:', fetchGameTypesError.message);
        setError('Failed to load game types. Please try again.');
      } else {
        setGameTypes(gameTypesData);
        const draft = gameTypesData.find((type) => type.name === 'Draft');
        const individual = gameTypesData.find((type) => type.name === 'Individual');
        const draftH2H = gameTypesData.find((type) => type.name === 'Draft H2H');
        const individualH2H = gameTypesData.find((type) => type.name === 'Individual H2H');

        if (draft) {
          setDraftTypeId(draft.id);
          setSelectedGameTypeId(draft.id); // Default to Draft
        } else {
          console.warn("Could not find 'Draft' game type. Defaulting to first available or none.");
          if (gameTypesData.length > 0) {
            setSelectedGameTypeId(gameTypesData[0].id);
          }
        }

        setIndividualTypeId(individual?.id || null);
        setDraftH2HTypeId(draftH2H?.id || null);
        setIndividualH2HTypeId(individualH2H?.id || null);

        // Warn if any expected game types are missing
        if (!draft) console.warn("Could not find 'Draft' game type.");
        if (!individual) console.warn("Could not find 'Individual' game type.");
        if (!draftH2H) console.warn("Could not find 'Draft H2H' game type.");
        if (!individualH2H) console.warn("Could not find 'Individual H2H' game type.");
      }
      setGameTypesLoading(false);

      try {
        const { data: userData, error: userAuthError } = await supabase.auth.getUser();
        if (userAuthError || !userData?.user) {
          throw new Error('User not authenticated.');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userData.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError.message);
          setError('Failed to get user organization. Please try again.');
        } else if (profileData?.organization_id) {
          setUserOrganizationId(profileData.organization_id);
        } else {
          console.warn('User profile has no organization_id.');
          setError('Your profile is not associated with an organization. Cannot create games.');
        }
      } catch (err) {
        console.error('Error fetching user or profile:', err.message);
        setError(`Authentication or profile error: ${err.message}`);
      } finally {
        setFetchingUserOrg(false);
      }
    }
    fetchData();
  }, []);

  const handleKpiChange = (kpiId) => {
    setSelectedKpiIds((prev) =>
      prev.includes(kpiId) ? prev.filter((id) => id !== kpiId) : [...prev, kpiId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const [startDate, endDate] = dateRange;

    const isDraftGame = selectedGameTypeId === draftTypeId;
    const isDraftH2HGame = selectedGameTypeId === draftH2HTypeId;
    const isIndividualH2HGame = selectedGameTypeId === individualH2HTypeId;
    const requiresNumberOfTeams = isDraftGame || isDraftH2HGame;

    const isAnyH2HGame = isDraftH2HGame || isIndividualH2HGame;

    // --- Basic Validation ---
    if (
      !name ||
      !selectedGameTypeId ||
      !startDate ||
      !endDate ||
      !startDate.isValid() ||
      !endDate.isValid() ||
      !userOrganizationId ||
      selectedKpiIds.length === 0
    ) {
      setError(
        'Game name, type, valid start/end dates, organization, and at least one KPI are required.'
      );
      setLoading(false);
      return;
    }

    if (endDate.isBefore(startDate, 'day')) {
      setError('End date cannot be before start date.');
      setLoading(false);
      return;
    }

    // --- Game Type Specific Validations ---
    if (requiresNumberOfTeams) {
      const numTeams = parseInt(numberOfTeams, 10);
      if (!numTeams || numTeams <= 0) {
        setError('Number of teams must be a positive number.');
        setLoading(false);
        return;
      }
      // NEW: Specific validation for Draft H2H: must be an even number
      if (isDraftH2HGame && numTeams % 2 !== 0) {
        setError('Draft H2H games must have an even number of teams.');
        setLoading(false);
        return;
      }
    }

    if (isAnyH2HGame) {
      if (!competitionDuration || parseInt(competitionDuration, 10) <= 0) {
        setError('Competition duration must be a positive number for H2H games.');
        setLoading(false);
        return;
      }
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('User not authenticated. Please log in.');
      }
      const createdBy = userData.user.id;

      // Prepare Game Data
      const gameData = {
        name,
        description,
        game_type_id: selectedGameTypeId,
        created_by: createdBy,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        organization_id: userOrganizationId,
        number_of_teams: requiresNumberOfTeams ? parseInt(numberOfTeams, 10) : null,
        settings: isAnyH2HGame
          ? {
              competition_duration: parseInt(competitionDuration, 10),
              competition_duration_unit: competitionDurationUnit,
              match_frequency_unit: matchFrequencyUnit,
            }
          : {},
      };

      const { data: newGame, error: insertError } = await supabase
        .from('games')
        .insert([gameData])
        .select();

      if (insertError) {
        console.error('Error creating game:', insertError.message);
        setError(`Failed to create game: ${insertError.message}`);
        setLoading(false);
        return;
      }

      const newGameId = newGame[0].id;

      const gameKpiInserts = selectedKpiIds.map((kpiId) => ({
        game_id: newGameId,
        kpi_id: kpiId,
      }));

      const { error: gameKpiError } = await supabase.from('game_kpis').insert(gameKpiInserts);

      if (gameKpiError) {
        console.error('Error associating KPIs with game:', gameKpiError.message);
        setError(`Game created, but failed to associate KPIs: ${gameKpiError.message}`);
      }

      setSuccess('Game created successfully!');
      setName('');
      setDescription('');
      setSelectedGameTypeId(draftTypeId || '');
      setNumberOfTeams('');
      setCompetitionDuration('');
      setCompetitionDurationUnit('weeks');
      setMatchFrequencyUnit('weekly');
      setDateRange([null, null]);
      setSelectedKpiIds([]);
      router.push(`/dashboard/games/list`);
    } catch (err) {
      console.error('Submission error:', err.message);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (gameTypesLoading || fetchingUserOrg || loadingKpis) {
    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading game types, user organization, and KPIs...
        </Typography>
      </Box>
    );
  }

  if (kpisError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading KPIs: {kpisErrorMessage?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  const isDraftGame = selectedGameTypeId === draftTypeId;
  const isDraftH2HGame = selectedGameTypeId === draftH2HTypeId;
  const isIndividualH2HGame = selectedGameTypeId === individualH2HTypeId;

  const showNumberOfTeams = isDraftGame || isDraftH2HGame;
  const showH2HSettings = isDraftH2HGame || isIndividualH2HGame;

  let numberOfTeamsHelperText = '';
  if (isDraftGame) {
    numberOfTeamsHelperText = 'Enter the number of teams for this Draft game.';
  } else if (isDraftH2HGame) {
    // NEW Helper Text
    numberOfTeamsHelperText =
      'Draft H2H games must have an even number of teams for head-to-head pairings.';
  }

  return (
    <>
      <title>{metadata.title}</title>

      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New Game
        </Typography>

        <Card sx={{ p: 3, mt: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack component="form" onSubmit={handleSubmit} spacing={3}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <TextField
                id="game-name"
                label="Game Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />

              <TextField
                id="game-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={4}
              />

              <TextField
                id="game-type"
                select
                label="Game Type"
                value={selectedGameTypeId}
                onChange={(e) => {
                  const newGameTypeId = e.target.value;
                  setSelectedGameTypeId(newGameTypeId);
                  // Clear or set related fields based on new game type
                  if (newGameTypeId === draftH2HTypeId) {
                    // No longer pre-fill numberOfTeams, as it can be any even number
                    setNumberOfTeams('');
                    // Clear H2H duration settings if coming from non-H2H
                    setCompetitionDuration('');
                    setCompetitionDurationUnit('weeks');
                    setMatchFrequencyUnit('weekly');
                  } else if (newGameTypeId === individualH2HTypeId) {
                    setNumberOfTeams(''); // Clear teams for Individual H2H
                    // Clear H2H duration settings if coming from non-H2H
                    setCompetitionDuration('');
                    setCompetitionDurationUnit('weeks');
                    setMatchFrequencyUnit('weekly');
                  } else {
                    // For Draft (non-H2H) and Individual (non-H2H)
                    setNumberOfTeams(''); // Clear for Individual, but might keep for Draft (user choice)
                    // Clear H2H duration settings
                    setCompetitionDuration('');
                    setCompetitionDurationUnit('weeks');
                    setMatchFrequencyUnit('weekly');
                  }
                }}
                fullWidth
                required
                helperText="Please select the game type"
              >
                {gameTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>

              {showNumberOfTeams && (
                <TextField
                  id="number-of-teams"
                  label="Number of Teams"
                  type="number"
                  value={numberOfTeams}
                  onChange={(e) => {
                    // Allow user to input any number for Draft H2H, validation will handle evenness
                    setNumberOfTeams(e.target.value);
                  }}
                  fullWidth
                  required
                  inputProps={{ min: 1 }}
                  helperText={numberOfTeamsHelperText}
                  // Removed disabled prop, as it's no longer fixed at 2
                />
              )}

              {showH2HSettings && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      id="competition-duration"
                      label="Competition Duration"
                      type="number"
                      value={competitionDuration}
                      onChange={(e) => setCompetitionDuration(e.target.value)}
                      fullWidth
                      required
                      inputProps={{ min: 1 }}
                      helperText={`Total number of ${competitionDurationUnit} for the competition.`}
                    />
                    <TextField
                      id="duration-unit"
                      select
                      label="Duration Unit"
                      value={competitionDurationUnit}
                      onChange={(e) => setCompetitionDurationUnit(e.target.value)}
                      sx={{ width: '150px' }}
                    >
                      <MenuItem value="weeks">Weeks</MenuItem>
                      <MenuItem value="days">Days</MenuItem>
                    </TextField>
                  </Stack>
                  <TextField
                    id="match-frequency-unit"
                    select
                    label="Match Frequency"
                    value={matchFrequencyUnit}
                    onChange={(e) => setMatchFrequencyUnit(e.target.value)}
                    fullWidth
                    required
                    helperText={`One H2H match will be played ${matchFrequencyUnit === 'weekly' ? 'weekly' : 'daily'}.`}
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                  </TextField>
                </>
              )}

              {/* KPI Selection remains the same */}
              <FormControl component="fieldset" variant="standard" sx={{ mt: 2 }}>
                <FormLabel component="legend">Select KPIs for this Game (Required)</FormLabel>
                {loadingKpis && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Loading KPIs...
                    </Typography>
                  </Box>
                )}
                {kpisError && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Could not load KPIs: {kpisErrorMessage?.message || 'Unknown error'}
                  </Alert>
                )}
                <FormGroup>
                  {kpis && kpis.length > 0
                    ? kpis.map((kpi) => (
                        <FormControlLabel
                          key={kpi.id}
                          control={
                            <Checkbox
                              checked={selectedKpiIds.includes(kpi.id)}
                              onChange={() => handleKpiChange(kpi.id)}
                            />
                          }
                          label={`${kpi.name} (${kpi.points} points)`}
                        />
                      ))
                    : !loadingKpis &&
                      !kpisError && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          No KPIs available. Please create some in the Manage KPIs section.
                        </Typography>
                      )}
                </FormGroup>
                {selectedKpiIds.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    At least one KPI must be selected.
                  </Typography>
                )}
              </FormControl>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <DatePicker
                  label="Start Date"
                  value={dateRange[0]}
                  onChange={(newValue) => setDateRange([newValue, dateRange[1]])}
                  slotProps={{
                    textField: {
                      id: 'game-start-date',
                      required: true,
                      error: !dateRange[0] || !dateRange[0].isValid(),
                      helperText:
                        !dateRange[0] || !dateRange[0].isValid() ? 'Start date is required.' : '',
                    },
                  }}
                  sx={{ flex: 1 }}
                />
                <DatePicker
                  label="End Date"
                  value={dateRange[1]}
                  onChange={(newValue) => setDateRange([dateRange[0], newValue])}
                  slotProps={{
                    textField: {
                      id: 'game-end-date',
                      required: true,
                      error:
                        !dateRange[1] ||
                        !dateRange[1].isValid() ||
                        (dateRange[0] &&
                          dateRange[1] &&
                          dateRange[1].isBefore(dateRange[0], 'day')),
                      helperText:
                        !dateRange[1] || !dateRange[1].isValid()
                          ? 'End date is required.'
                          : dateRange[0] &&
                              dateRange[1] &&
                              dateRange[1].isBefore(dateRange[0], 'day')
                            ? 'End date cannot be before start date.'
                            : '',
                    },
                  }}
                  sx={{ flex: 1 }}
                />
              </Stack>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !userOrganizationId || selectedKpiIds.length === 0}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ mt: 3 }}
              >
                {loading ? 'Creating...' : 'Create Game'}
              </Button>
            </Stack>
          </LocalizationProvider>
        </Card>
      </Box>
    </>
  );
}
