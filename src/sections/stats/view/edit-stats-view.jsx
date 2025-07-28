import PropTypes from 'prop-types'; // Good practice for defining prop types
import React, { useState, useEffect } from 'react';

import { useGetKpisQuery } from 'src/features/stats/statsAPI'; // To get KPI names for the form
import { useGetPlayersQuery } from 'src/features/players/playersAPI'; // Assuming you have this to get player names
import {
    useGetPlayerStatByIdQuery,
    useUpdatePlayerStatMutation,
} from 'src/features/stats/statsAPI';

// ----------------------------------------------------------------------

export function EditStatsView({ statId }) {
  // Fetch the specific stat entry to edit using the provided statId
  const {
    data: statEntry,
    isLoading: isLoadingStat,
    error: statError,
  } = useGetPlayerStatByIdQuery(statId);

  // Fetch all KPIs to populate a dropdown for stat types
  const { data: kpis, isLoading: isLoadingKpis, error: kpisError } = useGetKpisQuery();

  // Fetch all players to populate a dropdown for player selection (if allowed to change player)
  const { data: players, isLoading: isLoadingPlayers, error: playersError } = useGetPlayersQuery();

  // RTK Query mutation hook for updating the stat
  const [
    updatePlayerStat,
    { isLoading: isUpdating, isSuccess: updateSuccess, isError: updateIsError, error: updateError },
  ] = useUpdatePlayerStatMutation();

  // State to manage form data, initialized with fetched statEntry
  const [formData, setFormData] = useState({
    kpi_id: '',
    player_id: '',
    value: '',
    game_id: '', // You might not want to allow editing game_id directly
    recorded_at: '',
  });

  // Effect to populate form data when statEntry is loaded
  useEffect(() => {
    if (statEntry) {
      setFormData({
        kpi_id: statEntry.kpi_id || '',
        player_id: statEntry.player_id || '',
        value: statEntry.value || '',
        game_id: statEntry.game_id || '', // Game ID typically shouldn't change for a stat entry
        recorded_at: statEntry.recorded_at
          ? new Date(statEntry.recorded_at).toISOString().slice(0, 16)
          : '', // Format for datetime-local input
      });
    }
  }, [statEntry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call the mutation to update the stat
      await updatePlayerStat({ id: statId, ...formData }).unwrap();
      // Handle success (e.g., show a toast, redirect)
      console.log('Stat updated successfully!');
    } catch (err) {
      // Handle error
      console.error('Failed to update stat:', err);
    }
  };

  if (isLoadingStat || isLoadingKpis || isLoadingPlayers) {
    return <div>Loading stat details...</div>;
  }

  if (statError || kpisError || playersError) {
    return (
      <div>
        Error loading data: {statError?.message || kpisError?.message || playersError?.message}
      </div>
    );
  }

  if (!statEntry) {
    return <div>Stat entry not found.</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Edit Stat Entry</h1>

      {updateSuccess && <p style={{ color: 'green' }}>Stat updated successfully!</p>}
      {updateIsError && (
        <p style={{ color: 'red' }}>
          Error updating stat: {updateError?.data?.message || 'Unknown error'}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* Display Game Information (read-only) */}
        <div style={{ marginBottom: '16px' }}>
          <strong>Game:</strong> {statEntry.games ? statEntry.games.name : 'N/A'} (ID:{' '}
          {statEntry.game_id})
          <br />
          <strong>Recorded At:</strong> {new Date(statEntry.recorded_at).toLocaleString()}
        </div>

        {/* Player Dropdown */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="player_id" style={{ display: 'block', marginBottom: '8px' }}>
            Player:
          </label>
          <select
            id="player_id"
            name="player_id"
            value={formData.player_id}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">Select a player</option>
            {players &&
              players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.display_name || `${player.first_name} ${player.last_name}`}
                </option>
              ))}
          </select>
        </div>

        {/* KPI (Stat Type) Dropdown */}
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="kpi_id" style={{ display: 'block', marginBottom: '8px' }}>
            Stat Type:
          </label>
          <select
            id="kpi_id"
            name="kpi_id"
            value={formData.kpi_id}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">Select a KPI</option>
            {kpis &&
              kpis.map((kpi) => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.name} {kpi.unit ? `(${kpi.unit})` : ''}
                </option>
              ))}
          </select>
        </div>

        {/* Value Input */}
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="value" style={{ display: 'block', marginBottom: '8px' }}>
            Value:
          </label>
          <input
            type="number"
            id="value"
            name="value"
            value={formData.value}
            onChange={handleChange}
            required
            step="0.01" // Allows decimal values for stats like batting average
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button
          type="submit"
          disabled={isUpdating}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: isUpdating ? 0.7 : 1,
          }}
        >
          {isUpdating ? 'Updating...' : 'Update Stat'}
        </button>
      </form>
    </div>
  );
}

// Define PropTypes for better type checking and documentation
EditStatsView.propTypes = {
  statId: PropTypes.string.isRequired,
};
