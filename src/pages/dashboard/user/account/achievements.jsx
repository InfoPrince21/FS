import { Container, Typography } from '@mui/material';

// ----------------------------------------------------------------------

export default function AccountAchievementsPage() {
  return (
    <Container>
      <Typography variant="h4">Achievements</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Display users earned achievements here. This section will show detailed information about
        each achievement, like Overall Game MVP,Team Leader MVP, or 3x KPI Streak.
      </Typography>

    </Container>
  );
}
