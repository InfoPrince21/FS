// src/sections/games/view/draft-results-display.jsx
import React from 'react';

import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Grid, // Added Grid
  Button,
  Avatar,
  Stack,
  Alert,
} from '@mui/material';

export function DraftResultsDisplay({
  draftPicks, // Still useful for "Overall Picks" or if you just want a flat list
  draftPicksByRound,
  draftPicksByTeam,
  onPlayerClick,
  onTeamClick,
}) {
  // *** ADD THESE CONSOLE LOGS FOR DEBUGGING ***
  console.log('DraftResultsDisplay: Props received - draftPicks:', draftPicks);
  console.log('DraftResultsDisplay: Props received - draftPicksByRound:', draftPicksByRound);
  console.log('DraftResultsDisplay: Props received - draftPicksByTeam:', draftPicksByTeam);
  console.log('DraftResultsDisplay: Props received - onPlayerClick:', onPlayerClick);
  console.log('DraftResultsDisplay: Props received - onTeamClick:', onTeamClick);

  const hasDraftData =
    (Array.isArray(draftPicks) && draftPicks.length > 0) ||
    (draftPicksByRound && Object.keys(draftPicksByRound).length > 0) ||
    (draftPicksByTeam && Object.keys(draftPicksByTeam).length > 0);

  if (!hasDraftData) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Draft Results
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="info">No draft picks recorded for this game yet.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Draft Results
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Display by Round (more prominent layout) */}
        {draftPicksByRound && Object.keys(draftPicksByRound).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              By Round:
            </Typography>
            <Grid container spacing={3}>
              {Object.keys(draftPicksByRound)
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map((roundNumber) => (
                  <Grid item xs={12} key={roundNumber}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Round {roundNumber}
                        </Typography>
                        <Grid container spacing={2}>
                          {Array.isArray(draftPicksByRound[roundNumber]) &&
                            draftPicksByRound[roundNumber]
                              .sort((a, b) => a.pick_number - b.pick_number)
                              .map((pick) => (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  lg={3}
                                  key={pick.id || pick.pick_number}
                                >
                                  <Card
                                    variant="elevation"
                                    sx={{
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <CardContent sx={{ flexGrow: 1 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Pick #{pick.pick_number}
                                      </Typography>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ mt: 1 }}
                                      >
                                        <Avatar
                                          sx={{
                                            bgcolor: pick.teams?.color || '#9E9E9E',
                                            width: 40,
                                            height: 40,
                                            fontSize: '0.9rem',
                                          }}
                                        >
                                          {(
                                            pick.profiles?.display_name ||
                                            pick.profiles?.first_name ||
                                            '?'
                                          ).charAt(0)}
                                        </Avatar>
                                        <Box>
                                          <Button
                                            onClick={() => onPlayerClick(pick.profiles?.id)}
                                            sx={{
                                              textTransform: 'none',
                                              p: 0,
                                              minWidth: 0,
                                              color: 'text.primary',
                                            }}
                                            disabled={
                                              !pick.profiles?.id ||
                                              typeof onPlayerClick !== 'function'
                                            }
                                          >
                                            <Typography variant="body1" fontWeight="medium" noWrap>
                                              {pick.profiles?.display_name ||
                                                `${pick.profiles?.first_name || ''} ${pick.profiles?.last_name || ''}` ||
                                                'Unknown Player'}
                                            </Typography>
                                          </Button>
                                          <Button
                                            onClick={() => onTeamClick(pick.teams?.id)}
                                            sx={{
                                              textTransform: 'none',
                                              p: 0,
                                              minWidth: 0,
                                              color: 'text.secondary',
                                            }}
                                            disabled={
                                              !pick.teams?.id || typeof onTeamClick !== 'function'
                                            }
                                          >
                                            <Typography variant="body2" color="text.secondary">
                                              Team: {pick.teams?.name || 'N/A'}
                                            </Typography>
                                          </Button>
                                        </Box>
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </Box>
        )}

        {/* Display by Team */}
        {draftPicksByTeam && Object.keys(draftPicksByTeam).length > 0 && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              By Team:
            </Typography>
            <Grid container spacing={3}>
              {Object.values(draftPicksByTeam)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((teamData) => (
                  <Grid item xs={12} key={teamData.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Button
                          onClick={() => onTeamClick(teamData.id)}
                          sx={{
                            textTransform: 'none',
                            justifyContent: 'flex-start',
                            p: 0,
                            minWidth: 0,
                            color: 'inherit',
                            mb: 2,
                          }}
                          disabled={!teamData.id || typeof onTeamClick !== 'function'}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar
                              sx={{
                                bgcolor: teamData.color || '#9E9E9E',
                                width: 36,
                                height: 36,
                                fontSize: '1rem',
                              }}
                            >
                              {(teamData.name && teamData.name.charAt(0)) || '?'}
                            </Avatar>
                            <Typography variant="h6" fontWeight="bold">
                              {teamData.name || 'Unknown Team'} ({teamData.picks.length} picks)
                            </Typography>
                          </Stack>
                        </Button>
                        <Grid container spacing={2}>
                          {Array.isArray(teamData.picks) &&
                            teamData.picks
                              .sort((a, b) => a.pick_number - b.pick_number)
                              .map((pick) => (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  lg={3}
                                  key={pick.id || pick.pick_number}
                                >
                                  <Card
                                    variant="elevation"
                                    sx={{
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                    }}
                                  >
                                    <CardContent sx={{ flexGrow: 1 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        Round {pick.round_number}, Pick #{pick.pick_number}
                                      </Typography>
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ mt: 1 }}
                                      >
                                        <Avatar
                                          sx={{
                                            bgcolor: pick.teams?.color || '#9E9E9E',
                                            width: 30,
                                            height: 30,
                                            fontSize: '0.8rem',
                                          }}
                                        >
                                          {(
                                            pick.profiles?.display_name ||
                                            pick.profiles?.first_name ||
                                            '?'
                                          ).charAt(0)}
                                        </Avatar>
                                        <Button
                                          onClick={() => onPlayerClick(pick.profiles?.id)}
                                          sx={{
                                            textTransform: 'none',
                                            p: 0,
                                            minWidth: 0,
                                            color: 'text.primary',
                                          }}
                                          disabled={
                                            !pick.profiles?.id ||
                                            typeof onPlayerClick !== 'function'
                                          }
                                        >
                                          <Typography variant="body1" fontWeight="medium" noWrap>
                                            {pick.profiles?.display_name ||
                                              `${pick.profiles?.first_name || ''} ${pick.profiles?.last_name || ''}` ||
                                              'Unknown Player'}
                                          </Typography>
                                        </Button>
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </>
        )}

        {/* You could also include an "Overall Picks" section here using `draftPicks` array,
            structured with Grid/Card as well, if desired.
            For now, I'm prioritizing By Round and By Team which are typically more
            visually distinct for draft results.
        */}
      </CardContent>
    </Card>
  );
}
