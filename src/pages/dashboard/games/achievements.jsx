// src/pages/dashboard/games/achievements.jsx

import React, { useState, useCallback, useEffect } from 'react';

// MUI Material Imports (sorted by character length)
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { useParams } from 'src/routes/hooks/use-params';

import { CONFIG } from 'src/global-config';
import { useGetGamesQuery } from 'src/features/games/gamesAPI';

// Import your dedicated components - sorted by line length
import { GameAchievementsCard } from 'src/sections/games/view/game-achievements-card';
import { AchievementDefinitionsManagement } from 'src/sections/games/view/AchievementDefinitionsManagement'; // New import, placed by length

// ----------------------------------------------------------------------

const metadata = { title: `Game Achievements - ${CONFIG.appName}` };

// Tab configuration
const ACHIEVEMENTS_TABS = [
  { value: 'games', label: 'Games List' },
  { value: 'achievements', label: 'Game Achievements' },
  { value: 'definitions', label: 'Achievement Definitions' }, // New tab entry
];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function GameAchievementsPage() {
  // Use useParams to potentially get a gameId if linked directly to achievements for a specific game
  const { gameId: initialGameId } = useParams();

  // FIX: Always default currentTab to 'games'
  const [currentTab, setCurrentTab] = useState('games');
  const [selectedGameId, setSelectedGameId] = useState(initialGameId || null);
  const [selectedGameName, setSelectedGameName] = useState(''); // To display in the achievements tab header

  // Fetch all games for the "Games List" tab
  const {
    data: allGames = [],
    isLoading: isLoadingGames,
    isError: isErrorGames,
    error: gamesError,
  } = useGetGamesQuery();

  // Effect to set initial selected game if gameId is present in URL and games are loaded
  useEffect(() => {
    if (initialGameId && allGames.length > 0) {
      const game = allGames.find((g) => g.id === initialGameId);
      if (game) {
        setSelectedGameId(game.id);
        setSelectedGameName(game.name);
        // FIX: Removed setCurrentTab('achievements');
        // The tab will now always default to 'games', but the game will be pre-selected.
        // User will have to manually click 'Game Achievements' tab to view it.
      }
    }
  }, [initialGameId, allGames]);

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleGameSelect = useCallback((game) => {
    setSelectedGameId(game.id);
    setSelectedGameName(game.name);
    setCurrentTab('achievements'); // Switch to achievements tab after explicit selection
  }, []);

  // Handle loading and error states for fetching all games
  if (isLoadingGames) {
    return (
      <>
        <title>{metadata.title}</title>
        <Container
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
          }}
        >
          <CircularProgress size={40} />
          <Typography sx={{ ml: 2 }}>Loading games list...</Typography>
        </Container>
      </>
    );
  }

  if (isErrorGames) {
    return (
      <>
        <title>{metadata.title}</title>
        <Container sx={{ py: 3 }}>
          <Alert severity="error">
            Error loading games: {gamesError?.message || 'Unknown error'}
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <title>{metadata.title}</title>

      <Container>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Game Achievements
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={handleChangeTab} aria-label="achievements tabs">
            {ACHIEVEMENTS_TABS.map((tab) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} />
            ))}
          </Tabs>
        </Box>

        {/* Games List Tab Panel */}
        <TabPanel value={currentTab} index="games">
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Games
              </Typography>
              {allGames.length === 0 ? (
                <Alert severity="info">No games found.</Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Game Name</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allGames.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell>{game.name}</TableCell>
                          <TableCell align="right">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleGameSelect(game)}
                            >
                              View Achievements
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Game Achievements Tab Panel */}
        <TabPanel value={currentTab} index="achievements">
          {selectedGameId ? (
            <GameAchievementsCard gameId={selectedGameId} gameName={selectedGameName} />
          ) : (
            <Alert severity="info">
              Please select a game from the &quot;Games List&quot; tab to view its achievements.
            </Alert>
          )}
        </TabPanel>

        {/* New: Achievement Definitions Tab Panel */}
        <TabPanel value={currentTab} index="definitions">
          <AchievementDefinitionsManagement />
        </TabPanel>
      </Container>
    </>
  );
}
