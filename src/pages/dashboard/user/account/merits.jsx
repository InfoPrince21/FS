import { Container, Typography, Box } from '@mui/material';

// ----------------------------------------------------------------------

export default function AccountMeritsPage() {
  return (
    <Container>
      <Typography variant="h4">Merits</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Display users current merit balance and a detailed history of all merit transactions.
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Current Merits: [Fetch from Supabase]</Typography>
        {/* Your merit balance will be fetched from the 'merit_balance' column in the 'profiles' table. */}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Merit Transaction History</Typography>

      </Box>
    </Container>
  );
}
