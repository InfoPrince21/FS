import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { varAlpha } from 'minimal-shared/utils'; // Assuming this utility is available

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography'; // Import Typography for direct text usage
import ListItemText from '@mui/material/ListItemText';

import { fShortenNumber } from 'src/utils/format-number'; // Assuming this utility is available

import { supabase } from 'src/lib/supabase'; // Assuming Supabase client is imported
import { AvatarShape } from 'src/assets/illustrations'; // Assuming AvatarShape is applicable

import { Image } from 'src/components/image'; // Assuming Image component is available
import { Iconify } from 'src/components/iconify'; // Assuming Iconify component is available

// You might need to import your organization-specific social data if you have it
// import { _organizationSocials } from 'src/_mock'; // If you have a separate mock for org socials

// ----------------------------------------------------------------------

export function OrganizationCard({ organization, sx, ...other }) {
  // Memoize the logo URL, similar to user photo_url
  const logoUrl = useMemo(() => {
    if (!organization?.logo_url) return '';

    if (organization.logo_url.startsWith('http')) {
      return organization.logo_url;
    }

    // Assuming you have an 'organization_logos' bucket in Supabase Storage
    const { data } = supabase.storage
      .from('organization_logos')
      .getPublicUrl(organization.logo_url);
    return data?.publicUrl || '';
  }, [organization?.logo_url]);

  // Use a default cover image if organization.cover_url is not available
  const coverImageUrl = organization.cover_url || '/assets/default-cover.jpg'; // Path to a default image

  // Define some mock stats for organizations. Replace with actual data if available.
  // For example, if your organization object has properties like 'total_employees', 'active_projects', 'locations_count'
  const organizationStats = [
    { label: 'Employees', value: organization.total_employees || 0 }, // Replace with actual data field
    { label: 'Projects', value: organization.active_projects || 0 }, // Replace with actual data field
    { label: 'Locations', value: organization.locations_count || 0 }, // Replace with actual data field
  ];

  return (
    <Card sx={[{ textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box sx={{ position: 'relative' }}>
        {/* AvatarShape if desired, otherwise remove */}
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
          alt={organization.name}
          src={logoUrl}
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

        <Image
          src={coverImageUrl}
          alt={organization.name || 'Organization Cover'}
          ratio="16/9"
          slotProps={{
            overlay: {
              sx: (theme) => ({
                bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.48),
              }),
            },
          }}
        />
      </Box>

      <ListItemText
        sx={{ mt: 7, mb: 1 }}
        primary={organization.name}
        secondary={organization.description} // Using description as secondary text
        slotProps={{
          primary: { sx: { typography: 'subtitle1' } },
          secondary: { sx: { mt: 0.5 } },
        }}
      />

      {/* Optional: Social links for organizations */}
      {/* You'd likely fetch specific social links for each organization */}
      {/* If you have static organization social data, uncomment and adapt */}
      {/* <Box
        sx={{
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {_organizationSocials.map((social) => ( // Assuming _organizationSocials is defined
          <IconButton key={social.label}>
            {social.value === 'website' && <Iconify icon="solar:link-circle-bold" />}
            {social.value === 'linkedin' && <Iconify icon="socials:linkedin" />}
             // Add other social icons as needed
          </IconButton>
        ))}
      </Box> */}

      <Divider sx={{ borderStyle: 'dashed' }} />

      {/* Organization specific stats */}
      <Box
        sx={{
          py: 3,
          display: 'grid',
          typography: 'subtitle1',
          gridTemplateColumns: 'repeat(3, 1fr)', // Adjust based on number of stats
        }}
      >
        {organizationStats.map((stat) => (
          <Box key={stat.label} sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
              {stat.label}
            </Box>
            {fShortenNumber(stat.value)}
          </Box>
        ))}
      </Box>
    </Card>
  );
}

OrganizationCard.propTypes = {
  organization: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    logo_url: PropTypes.string, // Assuming this field exists for the logo
    cover_url: PropTypes.string, // Assuming this field exists for the cover image
    // Add other relevant organization specific stats you might have
    total_employees: PropTypes.number,
    active_projects: PropTypes.number,
    locations_count: PropTypes.number,
  }).isRequired,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
