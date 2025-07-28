// src/sections/games/view/game-achievements-card.jsx

import React, { useState } from 'react'; // React imports first

// @mui/material imports - sorted by line length (shortest to longest)
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import List from '@mui/material/List';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import CircularProgress from '@mui/material/CircularProgress';

// Application-specific imports (now only API hooks) - sorted by line length
import {
  useGetGameAchievementsQuery,
  useGetAllProfilesQuery,
  useGetAllKpisQuery,
  useGetAllTeamsQuery,
  useGetDraftPicksByGameIdQuery,
} from 'src/features/games/gamesAPI';

const getOrdinalSuffix = (n) => {
  if (typeof n !== 'number' || isNaN(n)) {
    return '';
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Custom TabPanel component
function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper for accessibility props
function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export function GameAchievementsCard({ gameId, gameName }) {
  const [currentTab, setCurrentTab] = useState('achievements'); // State to manage current tab

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Fetch all data first (these are always called)
  const { data: achievementsData, isLoading, isError, error } = useGetGameAchievementsQuery(gameId);
  const { data: allProfiles, isLoading: isLoadingProfiles } = useGetAllProfilesQuery();
  const { data: allKpis, isLoading: isLoadingKpis } = useGetAllKpisQuery();
  const { data: allTeams, isLoading: isLoadingTeams } = useGetAllTeamsQuery();
  const { data: draftPicks = [], isLoading: isLoadingDraftPicks } =
    useGetDraftPicksByGameIdQuery(gameId);

  const processedData = React.useMemo(() => {
    if (!achievementsData || !allProfiles || !allKpis || !allTeams || !draftPicks) {
      return null;
    }

    const profileMap = new Map((allProfiles || []).map((p) => [p.id, p]));
    const kpiMap = new Map((allKpis || []).map((k) => [k.id, k]));
    const teamMap = new Map((allTeams || []).map((t) => [t.id, t]));

    const performanceMap = new Map(
      (achievementsData.performance_data || []).map((p) => [p.profile_id, p.total_score])
    );

    // 1. Enrich KPI Winners
    const enrichedKpiWinners = (achievementsData.kpi_winners || []).map((winner) => ({
      ...winner,
      profile: profileMap.get(winner.player_id),
      kpi_name: kpiMap.get(winner.kpi_id)?.name,
      score: winner.value,
    }));

    // 2. Enrich Team Leader MVPs (added score from performance_data)
    const enrichedTeamLeaderMvps = (achievementsData.team_leader_mvps || []).map((leader) => ({
      ...leader,
      profile: profileMap.get(leader.leader_profile_id),
      team: teamMap.get(leader.team_id),
      score: performanceMap.get(leader.leader_profile_id) || 0,
    }));

    // 3. Prepare Draft Pick vs Performance data
    const draftPerformanceData = draftPicks
      .map((pick) => {
        const playerProfile = profileMap.get(pick.player_id);
        const playerScore = performanceMap.get(pick.player_id);
        const playerTeam = teamMap.get(pick.team_id);

        if (playerProfile && playerScore !== undefined) {
          return {
            player_id: pick.player_id,
            display_name:
              playerProfile.display_name ||
              `${playerProfile.first_name} ${playerProfile.last_name}`,
            photo_url: playerProfile.photo_url,
            draft_pick: pick.pick_number,
            total_score: playerScore,
            team_name: playerTeam?.name,
            team_color: playerTeam?.color,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Sort by total_score descending to determine performance rank
    const sortedByPerformance = [...draftPerformanceData].sort(
      (a, b) => b.total_score - a.total_score
    );

    // Assign performance ranks, handling ties
    let currentPerformanceRank = 1;
    for (let i = 0; i < sortedByPerformance.length; i++) {
      if (i > 0 && sortedByPerformance[i].total_score < sortedByPerformance[i - 1].total_score) {
        currentPerformanceRank = i + 1;
      }
      sortedByPerformance[i].performance_rank = currentPerformanceRank;
    }

    // Determine performance status vs. draft pick
    const enrichedDraftPerformance = sortedByPerformance.map((player) => {
      const pickVsPerformanceDifference = player.draft_pick - player.performance_rank;

      let performanceVsPickStatus = 'As Expected';
      if (pickVsPerformanceDifference > 0) {
        performanceVsPickStatus = 'Performed Better Than Pick';
      } else if (pickVsPerformanceDifference < 0) {
        performanceVsPickStatus = 'Performed Worse Than Pick';
      }

      return {
        ...player,
        performance_vs_pick_status: performanceVsPickStatus,
        pick_vs_performance_difference: pickVsPerformanceDifference,
      };
    });

    const sortedDraftPerformanceForDisplay = [...enrichedDraftPerformance].sort(
      (a, b) => a.draft_pick - b.draft_pick
    );

    // NEW: Enrich Podium Finishers
    const enrichedPodiumFinishers = (achievementsData.podium_finishers || []).map(
      (podiumPlayer) => ({
        ...podiumPlayer,
        profile: profileMap.get(podiumPlayer.player_id),
        player_display_name:
          podiumPlayer.player_display_name ||
          profileMap.get(podiumPlayer.player_id)?.display_name ||
          'Unknown Player',
      })
    );

    return {
      overall_mvp: achievementsData.overall_mvp,
      game_winners: achievementsData.game_winners,
      enrichedKpiWinners,
      enrichedTeamLeaderMvps,
      sortedDraftPerformanceForDisplay,
      podium_finishers: enrichedPodiumFinishers,
    };
  }, [achievementsData, allProfiles, allKpis, allTeams, draftPicks]);

  // Loading and error states for the main achievements view
  const showAchievementsLoading =
    isLoading ||
    isLoadingProfiles ||
    isLoadingKpis ||
    isLoadingTeams ||
    isLoadingDraftPicks ||
    !processedData;

  const showAchievementsError = isError;

  const showNoAchievementsData =
    !showAchievementsLoading &&
    !showAchievementsError &&
    (!achievementsData ||
      (!achievementsData.overall_mvp &&
        (!achievementsData.game_winners || achievementsData.game_winners.length === 0) &&
        (!achievementsData.team_leader_mvps || achievementsData.team_leader_mvps.length === 0) &&
        (!achievementsData.kpi_winners || achievementsData.kpi_winners.length === 0) &&
        (!achievementsData.podium_finishers || achievementsData.podium_finishers.length === 0) &&
        (!draftPicks || draftPicks.length === 0) &&
        (!achievementsData.performance_data || achievementsData.performance_data.length === 0)));

  // Destructure processed data only if it exists
  const {
    overall_mvp,
    game_winners,
    enrichedKpiWinners,
    enrichedTeamLeaderMvps,
    sortedDraftPerformanceForDisplay,
    podium_finishers,
  } = processedData || {};

  return (
    <Card>
      <CardHeader title={`Game Details: ${gameName}`} />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="game tabs">
          <Tab label="Achievements" value="achievements" {...a11yProps(0)} />
          {/* The "Achievement Definitions" tab has been removed */}
        </Tabs>
      </Box>

      {/* Achievements Tab Panel */}
      <CustomTabPanel value={currentTab} index="achievements">
        <CardContent>
          {showAchievementsLoading && (
            <Box
              sx={{
                p: 3,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200,
              }}
            >
              <CircularProgress size={40} />
              <Typography sx={{ ml: 2 }}>
                Loading achievements for {gameName || 'game'}...
              </Typography>
            </Box>
          )}

          {showAchievementsError && (
            <Alert severity="error">
              Error loading achievements for {gameName || 'game'}:{' '}
              {error?.message || 'Unknown error'}
            </Alert>
          )}

          {showNoAchievementsData && (
            <Alert severity="info">
              No achievements or relevant data found for {gameName || 'this game'}.
            </Alert>
          )}

          {!showAchievementsLoading && !showAchievementsError && !showNoAchievementsData && (
            <>
              {/* 1. Winning Team(s) Section */}
              {game_winners && game_winners.length > 0 && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Winning Team
                  </Typography>
                  <List dense>
                    {game_winners.map((winner, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: winner.team?.color || 'primary.main' }}>
                            {winner.team?.name ? winner.team.name[0] : ''}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={winner.team?.name || 'Unknown Team'}
                          secondary={`Total Score: ${winner.total_score}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 2. Overall Game MVP Section */}
              {overall_mvp?.profile ? (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Game MVP
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          src={overall_mvp.profile.photo_url}
                          alt={overall_mvp.profile.display_name}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={overall_mvp.profile.display_name}
                        secondary={`Total Score: ${overall_mvp.total_score}`}
                      />
                    </ListItem>
                  </List>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No overall MVP recorded for this game.
                </Alert>
              )}

              {/* 3. Podium Finishers Section */}
              {podium_finishers && podium_finishers.length > 0 && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Podium Finishers
                  </Typography>
                  <List dense>
                    {podium_finishers.map((podiumPlayer) => (
                      <ListItem key={podiumPlayer.player_id}>
                        <ListItemAvatar>
                          <Avatar
                            src={podiumPlayer.profile?.photo_url}
                            alt={podiumPlayer.player_display_name}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${getOrdinalSuffix(podiumPlayer.rank)} Place: ${podiumPlayer.player_display_name}`}
                          secondary={`Total Score: ${podiumPlayer.score}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 4. Team Leader MVPs Section */}
              {enrichedTeamLeaderMvps && enrichedTeamLeaderMvps.length > 0 && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Team MVPs
                  </Typography>
                  <List dense>
                    {enrichedTeamLeaderMvps.map((leader, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar
                            src={leader.profile?.photo_url}
                            alt={leader.profile?.display_name}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={leader.profile?.display_name || 'Unknown Player'}
                          secondary={
                            <React.Fragment>
                              <Typography
                                sx={{ display: 'inline' }}
                                component="span"
                                variant="body2"
                                color="text.primary"
                              >
                                {leader.team?.name || 'Unknown Team'}
                              </Typography>
                              {` — Total Score: ${leader.score}`}
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 5. KPI Winners Section */}
              {enrichedKpiWinners && enrichedKpiWinners.length > 0 && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    KPI Winners
                  </Typography>
                  <List dense>
                    {enrichedKpiWinners.map((kpiWinner, index) => (
                      <ListItem key={index}>
                        <ListItemAvatar>
                          <Avatar
                            src={kpiWinner.profile?.photo_url}
                            alt={kpiWinner.profile?.display_name}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${kpiWinner.kpi_name || 'Unknown KPI'}: ${kpiWinner.profile?.display_name || 'Unknown Player'}`}
                          secondary={`Score: ${kpiWinner.score}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* 6. Draft Pick vs. Performance Section */}
              {sortedDraftPerformanceForDisplay && sortedDraftPerformanceForDisplay.length > 0 && (
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    Draft Pick vs. Performance
                  </Typography>
                  <List dense>
                    {sortedDraftPerformanceForDisplay.map((player) => (
                      <ListItem key={player.player_id}>
                        <ListItemAvatar>
                          <Avatar src={player.photo_url} alt={player.display_name} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography component="span" variant="subtitle1" fontWeight="bold">
                                {player.display_name} ({player.team_name})
                              </Typography>
                              <Typography component="span" variant="body2" color="text.secondary">
                                Total Score: {player.total_score}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography
                                sx={{ display: 'block' }}
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                Draft Pick: {getOrdinalSuffix(player.draft_pick)}
                              </Typography>
                              <Typography
                                sx={{ display: 'block' }}
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                Performance Rank: {getOrdinalSuffix(player.performance_rank)}
                              </Typography>
                              <Typography
                                sx={{ display: 'block' }}
                                component="span"
                                variant="body2"
                                color={
                                  player.performance_vs_pick_status === 'Performed Better Than Pick'
                                    ? 'success.main'
                                    : player.performance_vs_pick_status ===
                                        'Performed Worse Than Pick'
                                      ? 'error.main'
                                      : 'text.secondary'
                                }
                              >
                                Status: {player.performance_vs_pick_status}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </CustomTabPanel>

      {/* The "Achievement Definitions" CustomTabPanel has been removed */}
    </Card>
  );
}
