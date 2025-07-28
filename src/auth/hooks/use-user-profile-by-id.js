// src/auth/hooks/use-user-profile-by-id.js
import { useState, useEffect, useCallback } from 'react';

import { supabase } from 'src/lib/supabase';
// Ensure useGetPlayerAchievementsQuery is imported from your statsAPI
import {
  useGetDashboardStatsQuery,
  useGetPlayerAchievementsQuery,
} from 'src/features/stats/statsAPI';

export function useUserProfileById(userId) {
  console.log('useUserProfileById: Hook initialized with userId:', userId);

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [baseProfileLoading, setBaseProfileLoading] = useState(true); // State for base profile loading specifically

  // 1. Fetch base profile data for the given userId
  useEffect(() => {
    console.log('useUserProfileById (useEffect): userId dependency changed to:', userId);

    const fetchBaseProfileData = async () => {
      if (!userId) {
        setProfile(null);
        setBaseProfileLoading(false); // Set to false if no userId
        setError('No user ID provided to hook for fetching.');
        console.log('useUserProfileById: No userId provided, skipping profile fetch.');
        return;
      }

      setBaseProfileLoading(true); // Start base profile loading
      setError(null); // Clear previous errors
      setProfile(null); // Clear previous profile data to ensure fresh data
      console.log(`useUserProfileById: Fetching base profile for ID: ${userId}`);

      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select(
            `
            id,
            first_name,
            last_name,
            display_name,
            email,
            photo_url,
            phone_number,
            country,
            address,
            state,
            city,
            zip_code,
            about,
            role,
            is_public,
            organization_id,
            organizations!profiles_organization_id_fkey(name)
            `
          )
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('useUserProfileById: Profile fetch error:', profileError);
          setError(profileError.message);
          setProfile(null);
        } else {
          const transformedProfile = {
            ...data,
            organization_name: data.organizations?.name || null,
          };
          delete transformedProfile.organizations;
          setProfile(transformedProfile);
          console.log(
            'useUserProfileById: Base profile fetched and transformed:',
            transformedProfile
          );
        }
      } catch (err) {
        console.error('useUserProfileById: Unexpected error fetching profile:', err);
        setError(err.message || 'An unexpected error occurred during profile fetch.');
        setProfile(null);
      } finally {
        setBaseProfileLoading(false); // Always stop base profile loading when done
      }
    };
    fetchBaseProfileData();
  }, [userId]);

  // 2. Fetch dashboard stats using RTK Query, dependent on the userId
  const {
    data: dashboardStats,
    isLoading: dashboardStatsLoading,
    error: dashboardStatsError,
    refetch: refetchDashboardStats,
  } = useGetDashboardStatsQuery({ playerId: userId }, { skip: !userId });

  // NEW: 3. Fetch player achievements using RTK Query, dependent on the userId
  const {
    data: playerAchievementsData,
    isLoading: playerAchievementsLoading,
    error: playerAchievementsError,
    refetch: refetchPlayerAchievements, // Added refetch for achievements
  } = useGetPlayerAchievementsQuery({ playerId: userId }, { skip: !userId });

  // 4. Process dashboard stats into KPI distribution and Score Progression formats
  const processedCareerStats = useCallback(() => {
    if (!dashboardStats || dashboardStats.length === 0) {
      console.log(
        'useUserProfileById: No dashboard stats found for this user, returning empty careerStats.'
      );
      return { kpiDistribution: [], scoreProgression: [], totalGames: 0, averageScore: 0 };
    }

    const kpiMap = new Map();
    const gameScoresMap = new Map();

    dashboardStats.forEach((stat) => {
      if (stat.kpi_name && typeof stat.value === 'number') {
        const currentKpiValue = kpiMap.get(stat.kpi_name) || 0;
        kpiMap.set(stat.kpi_name, currentKpiValue + stat.value);
      }

      if (stat.game_id && stat.date_recorded && typeof stat.value === 'number') {
        const gameKey = `${stat.game_id}-${stat.date_recorded}`;
        const currentTotalScoreForGame = gameScoresMap.get(gameKey) || 0;
        gameScoresMap.set(gameKey, currentTotalScoreForGame + stat.value);
      }
    });

    const kpiDistribution = Array.from(kpiMap.entries()).map(([name, value]) => ({
      id: name,
      label: name,
      value,
    }));

    const scoreProgression = Array.from(gameScoresMap.entries())
      .map(([gameKey, totalScore]) => {
        const dateStringMatch = gameKey.match(/(\d{4}-\d{2}-\d{2})$/);
        const gameDate = dateStringMatch ? dateStringMatch[1] : null;
        return {
          gameDate,
          totalScore,
        };
      })
      .filter((item) => item.gameDate)
      .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

    const totalGames = scoreProgression.length;
    const averageScore =
      totalGames > 0
        ? scoreProgression.reduce((sum, item) => sum + item.totalScore, 0) / totalGames
        : 0;

    console.log('useUserProfileById: Processed Career Stats for user:', {
      kpiDistribution,
      scoreProgression,
      totalGames,
      averageScore,
    });
    return {
      kpiDistribution,
      scoreProgression,
      totalGames,
      averageScore,
    };
  }, [dashboardStats]);

  // NEW: 5. Process achievements data for display
  const processAchievementsForDisplay = useCallback(() => {
    if (!playerAchievementsData || playerAchievementsData.length === 0) {
      console.log('useUserProfileById: No achievement data found, returning empty array.');
      return [];
    }

    const groupedAchievements = new Map(); // Key: achievement_name, Value: { name, description, totalMerits, timesEarned, lastEarnedDate, earnedInGames: Set<game_id> }

    playerAchievementsData.forEach((transaction) => {
      const { amount, created_at, achievement_name, achievement_description, source_game_id } =
        transaction;

      if (!achievement_name) {
        console.warn(
          'Achievement transaction without a linked achievement_definition name:',
          transaction
        );
        return;
      }

      if (!groupedAchievements.has(achievement_name)) {
        groupedAchievements.set(achievement_name, {
          name: achievement_name,
          description: achievement_description,
          totalMeritsEarned: 0,
          timesEarned: 0,
          lastEarnedDate: created_at, // Initialize with the current transaction's date
          earnedInGames: new Set(), // To count unique games
        });
      }

      const currentAchievement = groupedAchievements.get(achievement_name);
      currentAchievement.totalMeritsEarned += amount;
      currentAchievement.timesEarned += 1;
      currentAchievement.earnedInGames.add(source_game_id);

      // Update last earned date if this transaction is more recent
      if (new Date(created_at) > new Date(currentAchievement.lastEarnedDate)) {
        currentAchievement.lastEarnedDate = created_at;
      }
    });

    // Convert map values to array and add uniqueGamesCount
    const processed = Array.from(groupedAchievements.values()).map((ach) => ({
      ...ach,
      uniqueGamesCount: ach.earnedInGames.size,
      earnedInGames: undefined, // Remove the Set as it's not directly for display
      lastEarnedDate: new Date(ach.lastEarnedDate).toLocaleDateString(), // Format for display
    }));
    console.log('useUserProfileById: Processed Achievements for user:', processed);
    return processed;
  }, [playerAchievementsData]);

  // 6. Consolidate loading and error states and finalize the profile object with all derived data
  useEffect(() => {
    console.log(
      'useUserProfileById (Consolidation useEffect): Current states - profile (exists):',
      !!profile,
      'baseProfileLoading:',
      baseProfileLoading,
      'dashboardStatsLoading:',
      dashboardStatsLoading,
      'playerAchievementsLoading:', // NEW
      playerAchievementsLoading, // NEW
      'error (base):',
      error,
      'error (dashboardStats):',
      dashboardStatsError,
      'error (achievements):', // NEW
      playerAchievementsError // NEW
    );

    // If base profile and all RTK queries have loaded (or skipped)
    if (!baseProfileLoading && !dashboardStatsLoading && !playerAchievementsLoading) {
      // Include playerAchievementsLoading
      if (profile) {
        const careerStats = processedCareerStats();
        const achievementsList = processAchievementsForDisplay(); // Process achievements here

        // Create a new profile object only if data has changed to prevent unnecessary re-renders
        const newProfileData = {
          ...profile,
          careerStats,
          achievementsList, // Add the processed achievements to the profile object
        };

        // Deep comparison for careerStats and achievementsList to avoid re-render if data is the same
        if (
          !profile.careerStats ||
          JSON.stringify(profile.careerStats) !== JSON.stringify(careerStats) ||
          !profile.achievementsList ||
          JSON.stringify(profile.achievementsList) !== JSON.stringify(achievementsList)
        ) {
          setProfile(newProfileData);
          console.log('useUserProfileById: Final profile object updated:', newProfileData);
        } else {
          console.log('useUserProfileById: No change in derived data, skipping profile update.');
        }
      }

      // Handle combined errors after all loading is done
      if (dashboardStatsError) {
        setError(dashboardStatsError.message || 'Failed to load career statistics.');
      } else if (playerAchievementsError) {
        // NEW: Handle achievement-specific errors
        setError(playerAchievementsError.message || 'Failed to load player achievements.');
      } else if (!profile && userId) {
        // If no profile found for the given userId after attempting fetch
        setError(`No profile data found for user ID: ${userId}.`);
      } else if (!userId && !error) {
        // If userId was initially null/undefined and no other error is present
        setError('No user ID provided to hook for fetching.');
      }
    }
  }, [
    profile,
    baseProfileLoading,
    dashboardStatsLoading,
    dashboardStatsError,
    playerAchievementsLoading, // NEW dependency
    playerAchievementsError, // NEW dependency
    processedCareerStats,
    processAchievementsForDisplay, // NEW dependency
    error,
    userId,
  ]);

  // Combined refetch for profile, dashboard stats, and achievements
  const refetch = useCallback(() => {
    console.log('useUserProfileById: Initiating refetch...');
    setProfile(null); // Clear profile to trigger re-fetch of base profile
    setBaseProfileLoading(true); // Reset base profile loading state
    setError(null); // Clear errors
    refetchDashboardStats(); // Call RTK Query refetch for dashboard stats
    refetchPlayerAchievements(); // NEW: Call RTK Query refetch for achievements
  }, [refetchDashboardStats, refetchPlayerAchievements]); // Include RTK refetch functions as dependencies

  // The 'loading' state that the component will consume is now derived from all loading states.
  const overallLoading = baseProfileLoading || dashboardStatsLoading || playerAchievementsLoading; // Include playerAchievementsLoading

  return { profile, loading: overallLoading, error, refetch };
}
