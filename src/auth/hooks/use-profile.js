// src/auth/hooks/use-profile.js
import { useState, useEffect, useCallback } from 'react';

import { supabase } from 'src/lib/supabase'; // Make sure supabase client is correctly imported
import { useGetDashboardStatsQuery } from 'src/features/stats/statsAPI';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [authenticatedUserId, setAuthenticatedUserId] = useState(null);
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [isProfileFetchComplete, setIsProfileFetchComplete] = useState(false);

  const mutateProfile = useCallback((updates) => {
    setProfile((prevProfile) => {
      if (!prevProfile) return { ...updates };
      return { ...prevProfile, ...updates };
    });
  }, []);

  const fetchAuthenticatedUser = useCallback(async () => {
    setIsAuthCheckComplete(false);
    setError(null);
    try {
      console.log('useProfile (Auth): Attempting to fetch authenticated user...');
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error(
          'useProfile (Auth): Auth error or no user:',
          authError || 'No authenticated user found'
        );
        setError(authError?.message || 'Authentication required.');
        setAuthenticatedUserId(null);
      } else {
        console.log('useProfile (Auth): Authenticated user ID:', user.id);
        setAuthenticatedUserId(user.id);
      }
    } catch (err) {
      console.error('useProfile (Auth): Unexpected error during auth check:', err);
      setError(err.message || 'An unexpected authentication error occurred.');
      setAuthenticatedUserId(null);
    } finally {
      setIsAuthCheckComplete(true);
    }
  }, []);

  useEffect(() => {
    fetchAuthenticatedUser();
  }, [fetchAuthenticatedUser]);

  useEffect(() => {
    if (!isAuthCheckComplete) return;

    const fetchProfileData = async () => {
      setIsProfileFetchComplete(false);
      try {
        if (authenticatedUserId) {
          console.log('useProfile (Profile): Fetching profile for ID:', authenticatedUserId);
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select(
              `
                id, first_name, last_name, display_name, email, photo_url, phone_number, country, address, state, city, zip_code,
                about, role, is_public, organization_id, organizations!profiles_organization_id_fkey(name), "3d_avatar_url",
                rpm_login_token, custom_animation_settings
              `
            )
            .eq('id', authenticatedUserId)
            .single();

          if (profileError) {
            console.error('useProfile (Profile): Profile fetch error:', profileError);
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
              'useProfile (Profile): Base profile fetched and transformed:',
              transformedProfile
            );
          }
        } else {
          setProfile(null);
          if (!error) setError('No authenticated user found for profile lookup.');
        }
      } catch (err) {
        console.error('useProfile (Profile): Unexpected error fetching profile:', err);
        setError(err.message || 'An unexpected error occurred during profile fetch.');
        setProfile(null);
      } finally {
        setIsProfileFetchComplete(true);
      }
    };

    fetchProfileData();
  }, [authenticatedUserId, isAuthCheckComplete, error]);

  const {
    data: dashboardStats,
    isLoading: dashboardStatsLoading,
    error: dashboardStatsError,
    refetch: refetchDashboardStats,
  } = useGetDashboardStatsQuery({ playerId: authenticatedUserId }, { skip: !authenticatedUserId });

  const careerStats = useCallback(() => {
    if (!dashboardStats || dashboardStats.length === 0) {
      console.log('useProfile: No dashboard stats found, returning empty careerStats.');
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
        return { gameDate, totalScore };
      })
      .filter((item) => item.gameDate)
      .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

    const totalGames = scoreProgression.length;
    const averageScore =
      totalGames > 0
        ? scoreProgression.reduce((sum, item) => sum + item.totalScore, 0) / totalGames
        : 0;

    console.log('useProfile: Processed Career Stats:', {
      kpiDistribution,
      scoreProgression,
      totalGames,
      averageScore,
    });
    return { kpiDistribution, scoreProgression, totalGames, averageScore };
  }, [dashboardStats]);

  useEffect(() => {
    const overallLoading =
      !isAuthCheckComplete ||
      !isProfileFetchComplete ||
      (authenticatedUserId && dashboardStatsLoading);
    setLoading(overallLoading);

    if (!overallLoading && profile) {
      const currentCareerStats = careerStats();
      if (
        !profile.careerStats ||
        JSON.stringify(profile.careerStats) !== JSON.stringify(currentCareerStats)
      ) {
        setProfile((prevProfile) => {
          if (
            prevProfile &&
            JSON.stringify(prevProfile.careerStats) !== JSON.stringify(currentCareerStats)
          ) {
            return { ...prevProfile, careerStats: currentCareerStats };
          }
          return prevProfile;
        });
      }
    }

    if (dashboardStatsError) {
      setError(dashboardStatsError.message || 'Failed to load career statistics.');
    } else if (isAuthCheckComplete && !authenticatedUserId && !error) {
      setError('You must be logged in to view your profile.');
    } else if (isProfileFetchComplete && authenticatedUserId && !profile && !error) {
      setError('No profile data found for your user ID. Please ensure your profile is set up.');
    }
  }, [
    isAuthCheckComplete,
    isProfileFetchComplete,
    authenticatedUserId,
    dashboardStatsLoading,
    dashboardStatsError,
    profile,
    careerStats,
    error,
  ]);

  // New: Update custom_animation_settings in DB and local state
  const updateAnimationSettings = useCallback(
    async (newSettings) => {
      if (!profile?.id) {
        console.error('No profile loaded to update animation settings');
        return false;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .update({ custom_animation_settings: newSettings })
          .eq('id', profile.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating animation settings:', error);
          return false;
        }

        setProfile((prev) => ({
          ...prev,
          custom_animation_settings: data.custom_animation_settings,
        }));
        return true;
      } catch (err) {
        console.error('Unexpected error updating animation settings:', err);
        return false;
      }
    },
    [profile?.id]
  );

  const refetch = useCallback(() => {
    setProfile(null);
    setError(null);
    setAuthenticatedUserId(null);
    setIsAuthCheckComplete(false);
    setIsProfileFetchComplete(false);
    fetchAuthenticatedUser();
    refetchDashboardStats();
  }, [fetchAuthenticatedUser, refetchDashboardStats]);

  return {
    profile,
    loading,
    error,
    refetch,
    mutateProfile,
    updateAnimationSettings, // <-- added this here
  };
}
