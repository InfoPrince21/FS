import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { CONFIG } from 'src/global-config';

export const organizationsApi = createApi({
  reducerPath: 'organizationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${CONFIG.supabase.url}/rest/v1/`,
    prepareHeaders: (headers) => {
      headers.set('apikey', CONFIG.supabase.key);
      headers.set('Authorization', `Bearer ${CONFIG.supabase.key}`);
      return headers;
    },
  }),
  // NEW: Define the tag type for organizations
  tagTypes: ['Organizations'],
  endpoints: (builder) => ({
    getOrganizations: builder.query({
      query: () => `organizations?select=*`,
      // NEW: Tag the data provided by this query
      providesTags: ['Organizations'],
    }),
    createOrganization: builder.mutation({
      query: (newOrg) => ({
        url: `organizations`,
        method: 'POST',
        body: newOrg,
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation', // So Supabase returns the created row
        },
      }),
      // NEW: Invalidate the 'Organizations' tag after a successful creation.
      // This will cause any active `getOrganizations` queries to refetch automatically.
      invalidatesTags: ['Organizations'],
    }),
  }),
});

export const { useGetOrganizationsQuery, useCreateOrganizationMutation } = organizationsApi;
