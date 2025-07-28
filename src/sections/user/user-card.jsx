// src/sections/user/user-card.jsx
import { useMemo } from 'react';
import { Link } from 'react-router'; // Confirmed: Using 'react-router'
// --- START: ESLint Import Order Fix ---
// External utilities (from 'minimal-shared')
import { varAlpha } from 'minimal-shared/utils';

// Material UI imports (from @mui/material)
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

// Internal absolute imports (src/...)
import { supabase } from 'src/lib/supabase';
import { AvatarShape } from 'src/assets/illustrations';

// NOTE: Removed `fShortenNumber` as it's no longer used for social stats
// NOTE: Removed `_socials` as social media section is removed
// NOTE: Removed `IconButton` and `Iconify` as social icons are removed
// --- END: ESLint Import Order Fix ---

// ----------------------------------------------------------------------

export function UserCard({ user, sx, ...other }) {
  // --- START: React Hook "useMemo" conditional call fix ---
  // Hooks must be called at the top level, unconditionally.
  // Move the useMemo hook call here, before any conditional returns.
  const avatarUrl = useMemo(() => {
    if (!user?.photo_url) {
      console.warn('User has no photo_url, using default avatar.');
      return '/assets/images/avatars/avatar_default.jpg'; // Fallback default avatar
    }

    // If photo_url starts with "http" use it directly (public URL or external URL)
    if (user.photo_url.startsWith('http')) {
      return user.photo_url;
    }

    // Otherwise treat as storage path and get public URL from 'avatars' bucket
    const { data } = supabase.storage.from('avatars').getPublicUrl(user.photo_url);
    if (!data?.publicUrl) {
      console.warn(
        `Could not get public URL for photo_url: ${user.photo_url}, using default avatar.`
      );
      return '/assets/images/avatars/avatar_default.jpg'; // Fallback for Supabase storage issue
    }
    return data.publicUrl;
  }, [user?.photo_url]);
  // --- END: React Hook "useMemo" conditional call fix ---

  // Now, you can safely add your conditional return after all hooks are called.
  if (!user) {
    return null; // Or render a fallback/skeleton component
  }

  // Destructure user properties based on your 'profiles' table structure
  const { id, first_name, last_name, email, role, display_name } = user;

  // Prioritize display_name, then first/last, then email for primary text
  const primaryText =
    display_name || (first_name && last_name ? `${first_name} ${last_name}` : email);

  return (
    // Wrap the Card with Link component
    <Link to={`/dashboard/user/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        sx={[
          { textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: 8 } },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Box sx={{ position: 'relative' }}>
          <AvatarShape
            sx={{
              left: 0,
              right: 0,
              zIndex: 10,
              mx: 'auto',
              bottom: -26,
              position: 'absolute',
            }}
          />

          <Avatar
            alt={primaryText || 'User Avatar'} // Use primaryText for alt
            src={avatarUrl}
            sx={{
              left: 0,
              right: 0,
              width: 64,
              height: 64,
              zIndex: 11,
              mx: 'auto',
              bottom: -32,
              position: 'absolute',
            }}
          />

          {/* Replaced Image for user.coverUrl with a placeholder Box */}
          <Box
            sx={(theme) => ({
              pt: '56.25%', // 16:9 aspect ratio for visual consistency
              bgcolor: varAlpha(theme.vars.palette.grey[500], 0.16), // A subtle background color
              borderRadius: 'inherit', // Inherit the Card's border-radius
              overflow: 'hidden', // Ensures content stays within bounds
            })}
          >
            {/* If you want a static background image, you can put it here: */}
            {/* <Image src="/path/to/your/default_cover.jpg" sx={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }} /> */}
          </Box>
        </Box>

        <ListItemText
          sx={{ mt: 7, mb: 1 }}
          primary={primaryText}
          secondary={email} // Email as a consistent secondary identifier
          slotProps={{
            primary: { sx: { typography: 'subtitle1' } },
            secondary: { sx: { mt: 0.5 } },
          }}
        />

        {/* Display role using a Chip */}
        {role && (
          <Chip
            label={role.charAt(0).toUpperCase() + role.slice(1)}
            size="small"
            color="info" // You can customize color based on role if needed
            sx={{ mb: 2 }}
          />
        )}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box
          sx={{
            py: 2, // Reduced padding as there's less content
            display: 'grid',
            typography: 'body2', // Changed typography for simpler detail
            gridTemplateColumns: '1fr', // Only one column as an example
          }}
        >
          <Box sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
              Organization
            </Box>
            {user.organization_name || 'N/A'}
          </Box>
        </Box>
      </Card>
    </Link>
  );
}
