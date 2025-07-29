// src/sections/stats/view/game-details-view.jsx

import React from 'react';
import PropTypes from 'prop-types';

export function GameDetailsStatsView({ gameId }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Game Details Stats View</h1>
      <p>
        This is a placeholder component for game ID: <strong>{gameId}</strong>
      </p>
    </div>
  );
}

GameDetailsStatsView.propTypes = {
  gameId: PropTypes.string,
};
