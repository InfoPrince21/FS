// src/features/organizations/organizationsSlice.jsx
import { createSlice } from '@reduxjs/toolkit';
// Removed: import { createAsyncThunk } from '@reduxjs/toolkit'; // No longer needed
// Removed: import { organizationsApi } from './organizationsAPI'; // No longer needed directly in slice

const initialState = {
  selectedOrganization: null, // This is UI-specific state, not managed by RTK Query's cache
  // Removed `organizations`, `loading`, `error` as they are handled by RTK Query
};

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    setSelectedOrganization: (state, action) => {
      state.selectedOrganization = action.payload;
    },
    clearSelectedOrganization: (state) => {
      state.selectedOrganization = null;
    },
    // Removed `addOrganization` synchronous reducer.
    // RTK Query's `invalidatesTags` on the `createOrganization` mutation
    // is the preferred way to keep data consistent across the app.
  },
  extraReducers: (builder) => {
    // Removed all `extraReducers` cases for `WorkspaceOrganizations`
    // as RTK Query's `useGetOrganizationsQuery` handles this directly.
  },
});

// Export actions
export const { setSelectedOrganization, clearSelectedOrganization } = organizationsSlice.actions;

// Export selectors
export const selectSelectedOrganization = (state) => state.organizations.selectedOrganization;

// Removed selectors for `allOrganizations`, `loading`, `error` as they are handled by RTK Query.
// If you truly need a way to access all organizations from the Redux store (e.g., for a global list
// that isn't directly tied to a component using `useGetOrganizationsQuery`),
// you would use the selector from `organizationsApi` itself, not define it here:
// export const selectAllOrganizations = (state) => organizationsApi.endpoints.getOrganizations.select()(state).data;

// Export reducer
export default organizationsSlice.reducer;
